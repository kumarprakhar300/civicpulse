import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Camera, Loader2, Check, Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/report")({
  head: () => ({
    meta: [
      { title: "Report an issue — CivicPulse" },
      { name: "description", content: "Report a civic issue with photo and GPS location." },
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

function ReportPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [issueType, setIssueType] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locStatus, setLocStatus] = useState<"loading" | "success" | "error">("loading");
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLocation();
  }, []);

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
      () => {
        setLocStatus("error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    const reader = new FileReader();
    reader.onloadend = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
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

        const { data: urlData } = supabase.storage.from("report-photos").getPublicUrl(fileName);
        photoUrl = urlData.publicUrl;
      }

      const { error: insertError } = await (supabase as any)
        .from("reports")
        .insert({
          user_id: userId,
          title: title.trim(),
          description: description.trim() || null,
          issue_type: issueType,
          latitude: location.lat,
          longitude: location.lng,
          photo_url: photoUrl,
        });

      if (insertError) {
        toast.error("Failed to submit report: " + insertError.message);
        setSubmitting(false);
        return;
      }

      toast.success("Report submitted successfully!");
      navigate({ to: "/" });
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Report an issue</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Issue type</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger>
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
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Large pothole near school"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label>Photo (optional)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 px-6 py-10 hover:bg-muted/50 transition-colors"
                >
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="max-h-48 rounded-md object-cover"
                    />
                  ) : (
                    <>
                      <Camera className="mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload a photo</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
                {photo && (
                  <p className="text-xs text-muted-foreground">
                    {photo.name} ({(photo.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  {locStatus === "loading" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Getting your location...
                    </div>
                  )}
                  {locStatus === "success" && location && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                      <Check className="h-4 w-4" />
                      Location captured: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                    </div>
                  )}
                  {locStatus === "error" && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-destructive">Could not get location</span>
                      <Button type="button" variant="outline" size="sm" onClick={getLocation}>
                        Retry
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={submitting || locStatus === "loading"}
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
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
