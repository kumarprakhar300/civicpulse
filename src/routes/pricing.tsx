import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";

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
      { property: "og:description", content: "Free for citizens. Paid tiers for city-wide analytics." },
    ],
  }),
  component: PricingPage,
});

const tiers = [
  {
    name: "Citizen",
    price: "Free",
    tagline: "Forever, for everyone.",
    features: ["Unlimited reports", "Photo + GPS", "Public map & dashboard", "Upvote & comment"],
    cta: "Get started",
    href: "/auth",
    hue: "from-cyan-500/30 to-blue-600/10",
    ring: "border-cyan-400/25",
  },
  {
    name: "City / NGO",
    price: "₹24,999/mo",
    tagline: "For municipal corporations & accountability orgs.",
    features: [
      "Everything in Citizen",
      "Ward-level analytics & SLA tracking",
      "CSV export & API access",
      "Admin roles + bulk actions",
      "Department routing",
      "Email support",
    ],
    cta: "Start free trial",
    href: "/contact",
    highlight: true,
    hue: "from-indigo-500/40 to-purple-600/20",
    ring: "border-indigo-400/40",
  },
  {
    name: "Enterprise",
    price: "Custom",
    tagline: "Multi-city, custom SLAs, on-prem.",
    features: [
      "Everything in City",
      "SSO / SAML",
      "Custom integrations",
      "Dedicated success manager",
      "99.9% uptime SLA",
    ],
    cta: "Contact sales",
    href: "/contact",
    hue: "from-emerald-500/30 to-teal-600/10",
    ring: "border-emerald-400/25",
  },
];

function PricingPage() {
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
            Citizens will always use CivicPulse for free. Governments and NGOs pay for the analytics
            and accountability tooling on top.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className="group relative [perspective:1000px]">
              <div
                className={`absolute -inset-0.5 rounded-2xl bg-gradient-to-br ${t.hue} opacity-40 blur-xl transition group-hover:opacity-80`}
              />
              <div
                className={`relative flex h-full flex-col rounded-2xl border ${
                  t.highlight ? "border-cyan-400/40" : "border-white/10"
                } bg-white/[0.03] p-8 backdrop-blur-xl transition-transform duration-500 ease-out group-hover:[transform:rotateX(4deg)_rotateY(-3deg)_translateY(-6px)]`}
              >
                {t.highlight && (
                  <span className="absolute -top-3 right-6 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow-lg">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{t.name}</h3>
                <p className="mt-3 text-4xl font-extrabold text-white">{t.price}</p>
                <p className="mt-1 text-sm text-slate-400">{t.tagline}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={t.href} className="mt-8 block">
                  <Button
                    className={`w-full ${
                      t.highlight
                        ? "bg-white text-slate-950 hover:bg-white/90"
                        : "border border-white/15 bg-white/5 text-white hover:bg-white/10"
                    }`}
                    variant={t.highlight ? "default" : "outline"}
                  >
                    {t.cta}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </main>
    </PageShell>
  );
}
