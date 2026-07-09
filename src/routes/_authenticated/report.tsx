import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, Loader2, Check, Upload, Sparkles, AlertTriangle, Siren } from "lucide-react";
import { PageShell, GlassCard } from "@/components/PageShell";
import {
  analyzeReportPhoto,
  findNearbyDuplicates,
  submitAiReport,
} from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Report an issue — CivicPulse" },
      { name: "description", content: "AI-assisted civic issue reporting with photo and GPS." },
    ],
  }),
  component: ReportPage,
});

const issueTypes = [
  { value: "pothole", label: "Pothole" },
  { value: "garbage", label: "Garbage" },
  { value: "streetlight", label: "Broken Streetlight" },
  { value: "other", label: "Other" },
];

type DupMatch = {
  id: string;
  title: string;
  issue_type: string;
  status: string;
  upvote_count: number;
  created_at: string;
  distance_meters: number;
  similarity: number;
};

function ReportPage() {
  const navigate = useNavigate();
  const analyzeFn = useServerFn(analyzeReportPhoto);
  const findDupsFn = useServerFn(findNearbyDuplicates);
  const submitFn = useServerFn(submitAiReport);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("");
  const [severity, setSeverity] = useState<number | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiApplied, setAiApplied] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"loading" | "success" | "error">("loading");

  const [analyzing, setAnalyzing] = useState(false);
  const [dupChecking, setDupChecking] = useState(false);
  const [duplicates, setDuplicates] = useState<DupMatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isSos, setIsSos] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLocation();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("sos") === "1") {
        setIsSos(true);
        setSeverity(5);
      }
    }
  }, []);

  // Debounced duplicate check when title/loc changes
  useEffect(() => {
    if (!location || title.trim().length < 5) {
      setDuplicates([]);
      return;
    }
    const handle = setTimeout(async () => {
      setDupChecking(true);
      try {
        const dups = (await findDupsFn({
          data: {
            text: `${title} ${description} ${issueType}`.trim(),
            lat: location.lat,
            lng: location.lng,
          },
        })) as DupMatch[];
        setDuplicates(dups);
      } catch {
        // silent — duplicate check is best-effort
      } finally {
        setDupChecking(false);
      }
    }, 700);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, issueType, location?.lat, location?.lng]);

  function getLocation() {
    setLocStatus("loading");
    if (!navigator.geolocation) {
      setLocStatus("error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocStatus("success");
      },
      () => setLocStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setPhoto(file);
    const dataUrl: string = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
    setPhotoPreview(dataUrl);

    // Auto-run AI analysis
    setAnalyzing(true);
    setAiApplied(false);
    try {
      const result = await analyzeFn({
        data: { photoDataUrl: dataUrl, userNote: title || undefined },
      });
      // Only overwrite empty fields; keep user edits
      setTitle((t) => t.trim() || result.title);
      setDescription((d) => d.trim() || result.description);
      setIssueType((it) => it || result.issue_type);
      setSeverity(result.severity);
      setAiSummary(result.summary);
      setAiApplied(true);
      toast.success("AI filled in the details — edit if needed.");
    } catch (err: any) {
      toast.error(err?.message ?? "AI couldn't analyze the photo");
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !issueType || !location) {
      toast.error("Please fill in all required fields and allow location access.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        toast.error("You must be signed in to submit a report.");
        setSubmitting(false);
        return;
      }
      const userId = userData.user.id;

      let photoUrl: string | null = null;
      if (photo) {
        const fileExt = photo.name.split(".").pop() || "jpg";
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("report-photos")
          .upload(fileName, photo, { upsert: false });
        if (uploadError) {
          toast.error("Failed to upload photo: " + uploadError.message);
          setSubmitting(false);
          return;
        }
        photoUrl = fileName;
      }

      const result = await submitFn({
        data: {
          title: title.trim(),
          description: description.trim() || null,
          issue_type: issueType as any,
          latitude: location.lat,
          longitude: location.lng,
          photo_url: photoUrl,
          severity,
          ai_summary: aiSummary,
          ai_categorized: aiApplied,
        },
      });

      toast.success(
        `Report submitted (priority ${Math.round(result.priority_score)}).`,
      );
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <PageShell>
      <main className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 backdrop-blur-md">
            <Sparkles className="h-3 w-3 text-cyan-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-200">
              AI-assisted report
            </span>
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Report an issue
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Snap a photo — AI classifies, writes the description, and flags duplicates.
          </p>
        </div>

        <GlassCard className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Photo first — triggers AI */}
            <div className="space-y-2">
              <Label className="text-slate-300">
                Photo {analyzing && <span className="text-cyan-300">· analyzing…</span>}
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={analyzing}
                  className="flex flex-col items-center justify-center rounded-xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 px-4 py-5 transition hover:from-cyan-500/20 hover:to-blue-500/20 disabled:opacity-50"
                >
                  <Camera className="mb-1.5 h-6 w-6 text-cyan-300" />
                  <span className="text-xs font-semibold text-white">Take photo</span>
                  <span className="text-[10px] text-slate-400">AI will auto-fill</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={analyzing}
                  className="flex flex-col items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-4 py-5 transition hover:bg-white/[0.06] disabled:opacity-50"
                >
                  <Upload className="mb-1.5 h-6 w-6 text-slate-300" />
                  <span className="text-xs font-semibold text-white">Upload</span>
                  <span className="text-[10px] text-slate-400">From gallery</span>
                </button>
              </div>

              {photoPreview && (
                <div className="relative mt-2 overflow-hidden rounded-xl border border-white/10">
                  <img src={photoPreview} alt="Preview" className="max-h-64 w-full object-cover" />
                  {analyzing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm">
                      <div className="flex items-center gap-2 rounded-full bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-100">
                        <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                        AI is looking at your photo…
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoPreview(null);
                      setAiApplied(false);
                      setSeverity(null);
                      setAiSummary(null);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-slate-950/80 px-3 py-1 text-xs text-white backdrop-blur hover:bg-slate-950"
                  >
                    Remove
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>

            {/* AI banner */}
            {aiApplied && (
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 p-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-cyan-200">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI suggestion applied
                  {severity != null && (
                    <span className="ml-auto rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5">
                      Severity {severity}/5
                    </span>
                  )}
                </div>
                {aiSummary && <p className="mt-1.5 text-slate-300">{aiSummary}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-300">Issue type</Label>
              <Select value={issueType} onValueChange={setIssueType}>
                <SelectTrigger className="border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select an issue type" />
                </SelectTrigger>
                <SelectContent>
                  {issueTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-300">
                Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Large pothole near school"
                required
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-300">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={4}
                className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Duplicates */}
            {(duplicates.length > 0 || dupChecking) && (
              <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {dupChecking
                    ? "Checking for similar nearby reports…"
                    : `${duplicates.length} similar report${duplicates.length > 1 ? "s" : ""} nearby`}
                </div>
                {duplicates.length > 0 && (
                  <ul className="space-y-1.5">
                    {duplicates.map((d) => (
                      <li key={d.id} className="text-xs">
                        <Link
                          to="/report/$id"
                          params={{ id: d.id }}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 hover:bg-white/[0.06]"
                        >
                          <span className="truncate text-slate-200">{d.title}</span>
                          <span className="ml-2 shrink-0 text-slate-500">
                            {Math.round(d.distance_meters)}m · ▲{d.upvote_count}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                {duplicates.length > 0 && (
                  <p className="mt-2 text-[11px] text-amber-100/70">
                    Consider upvoting one of these instead of creating a duplicate.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-300">Location</Label>
              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                {locStatus === "loading" && (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Getting your location...
                  </div>
                )}
                {locStatus === "success" && location && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <Check className="h-4 w-4" />
                    Captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </div>
                )}
                {locStatus === "error" && (
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-rose-400">Could not get location</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={getLocation}
                      className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-white text-slate-950 hover:bg-white/90"
              disabled={submitting || analyzing || locStatus === "loading"}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit report
                </>
              )}
            </Button>
          </form>
        </GlassCard>
      </main>
    </PageShell>
  );
}
