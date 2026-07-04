import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CivicPulse for Indian cities & NGOs" },
      {
        name: "description",
        content:
          "Simple pricing for Indian municipalities and NGOs. Free for citizens, tiered analytics for governments.",
      },
      { property: "og:title", content: "CivicPulse pricing" },
      {
        property: "og:description",
        content: "Free for citizens. Paid tiers for city-wide analytics.",
      },
    ],
  }),
  component: PricingPage,
});

type Billing = "monthly" | "yearly";

const CITY_NGO = {
  monthly: { priceId: "city_ngo_monthly", label: "₹24,999", suffix: "/mo" },
  yearly: {
    priceId: "city_ngo_yearly",
    label: "₹2,39,990",
    suffix: "/yr",
    note: "Save 20% vs monthly",
  },
} as const;

function PricingPage() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>("monthly");
  const [salesOpen, setSalesOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  async function handleCitizen() {
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      toast.success("You're already on the Citizen plan — start reporting!");
      navigate({ to: "/report" });
    } else {
      navigate({ to: "/auth" });
    }
  }

  async function handleCityNgo() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      toast.info("Please sign in to subscribe.");
      navigate({ to: "/auth" });
      return;
    }
    try {
      await openCheckout({
        priceId: CITY_NGO[billing].priceId,
        customerEmail: data.user.email ?? undefined,
        customData: { userId: data.user.id, plan: billing },
        successUrl: `${window.location.origin}/dashboard?checkout=success`,
      });
    } catch (e) {
      console.error(e);
      toast.error("Could not open checkout. Please try again.");
    }
  }

  function handleSalesSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const org = String(fd.get("org") ?? "").trim();
    if (!name || !email || !org) return toast.error("Please fill every field");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Invalid email");
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSalesOpen(false);
      toast.success(`Thanks ${name}! Our team will reach out to ${email}.`);
    }, 600);
  }

  const cityNgo = CITY_NGO[billing];

  return (
    <PageShell>
      <main className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 backdrop-blur-md">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70">
              Pricing
            </span>
          </div>
          <h1 className="mt-6 text-5xl font-extrabold tracking-tight sm:text-6xl">
            <span className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-transparent">
              Pricing that scales
            </span>
            <br />
            <span className="bg-gradient-to-r from-cyan-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              with your city
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Citizens will always use CivicPulse for free. Governments and NGOs pay for the
            analytics and accountability tooling on top.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
            {(["monthly", "yearly"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                  billing === b
                    ? "bg-white text-slate-950 shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                {b === "monthly" ? "Monthly" : "Yearly"}
                {b === "yearly" && (
                  <span className="ml-2 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Citizen */}
          <TierCard
            hue="from-cyan-500/30 to-blue-600/10"
            highlight={false}
            title="Citizen"
            price="Free"
            suffix=""
            tagline="Forever, for everyone."
            features={[
              "Unlimited reports",
              "Photo + GPS",
              "Public map & dashboard",
              "Upvote & comment",
            ]}
            ctaLabel="Get started"
            onCta={handleCitizen}
          />

          {/* City / NGO */}
          <TierCard
            hue="from-indigo-500/40 to-purple-600/20"
            highlight
            title="City / NGO"
            price={cityNgo.label}
            suffix={cityNgo.suffix}
            tagline={
              billing === "yearly"
                ? "Save 20% — billed yearly."
                : "For municipal corporations & accountability orgs."
            }
            features={[
              "Everything in Citizen",
              "Ward-level analytics & SLA tracking",
              "CSV export & API access",
              "Admin roles + bulk actions",
              "Department routing",
              "Email support",
            ]}
            ctaLabel={checkoutLoading ? "Opening checkout…" : "Subscribe"}
            ctaDisabled={checkoutLoading}
            onCta={handleCityNgo}
          />

          {/* Enterprise */}
          <TierCard
            hue="from-emerald-500/30 to-teal-600/10"
            highlight={false}
            title="Enterprise"
            price="Custom"
            suffix=""
            tagline="Multi-city, custom SLAs, on-prem."
            features={[
              "Everything in City",
              "SSO / SAML",
              "Custom integrations",
              "Dedicated success manager",
              "99.9% uptime SLA",
            ]}
            ctaLabel="Contact sales"
            onCta={() => setSalesOpen(true)}
          />
        </div>

        <p className="mt-10 text-center text-xs text-slate-500">
          Prefer email?{" "}
          <Link
            to="/contact"
            className="text-cyan-300 underline underline-offset-4 hover:text-cyan-200"
          >
            Reach us directly
          </Link>
          .
        </p>
      </main>

      <Dialog open={salesOpen} onOpenChange={setSalesOpen}>
        <DialogContent className="border-white/10 bg-slate-950 text-slate-100">
          <DialogHeader>
            <DialogTitle>Talk to sales</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enterprise — Custom pricing. Tell us about your organisation and we'll be in touch
              within one business day.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSalesSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" name="name" required maxLength={100} className="bg-white/5" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                maxLength={255}
                className="bg-white/5"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org">Organisation / city</Label>
              <Input id="org" name="org" required maxLength={150} className="bg-white/5" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Anything we should know? (optional)</Label>
              <Textarea id="notes" name="notes" rows={3} maxLength={500} className="bg-white/5" />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSalesOpen(false)}
                className="border-white/15 bg-transparent text-white hover:bg-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-white text-slate-950 hover:bg-white/90"
              >
                {submitting ? "Submitting…" : "Contact sales"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

function TierCard({
  hue,
  highlight,
  title,
  price,
  suffix,
  tagline,
  features,
  ctaLabel,
  ctaDisabled,
  onCta,
}: {
  hue: string;
  highlight: boolean;
  title: string;
  price: string;
  suffix: string;
  tagline: string;
  features: string[];
  ctaLabel: string;
  ctaDisabled?: boolean;
  onCta: () => void;
}) {
  return (
    <div className="group relative [perspective:1000px]">
      <div
        className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${hue} opacity-40 blur-xl transition group-hover:opacity-80`}
      />
      <div
        className={`relative flex h-full flex-col rounded-2xl border ${
          highlight ? "border-cyan-400/40" : "border-white/10"
        } bg-white/[0.03] p-8 backdrop-blur-xl transition-transform duration-500 ease-out group-hover:[transform:rotateX(4deg)_rotateY(-3deg)_translateY(-6px)]`}
      >
        {highlight && (
          <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
            Most popular
          </span>
        )}
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <p className="mt-3 text-4xl font-extrabold text-white">
          {price}
          {suffix && <span className="text-lg font-medium text-slate-400">{suffix}</span>}
        </p>
        <p className="mt-1 text-sm text-slate-400">{tagline}</p>
        <ul className="mt-6 flex-1 space-y-3 text-sm">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-slate-300">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> {f}
            </li>
          ))}
        </ul>
        <Button
          onClick={onCta}
          disabled={ctaDisabled}
          className={`mt-8 w-full ${
            highlight
              ? "bg-white text-slate-950 hover:bg-white/90"
              : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
          }`}
          variant={highlight ? "default" : "outline"}
        >
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
