import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Check } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — CivicPulse for cities & NGOs" },
      {
        name: "description",
        content:
          "Simple pricing for municipalities and NGOs. Free for citizens, tiered analytics for governments.",
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
  },
  {
    name: "City / NGO",
    price: "$299/mo",
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
  },
];

function PricingPage() {
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
          <nav className="flex gap-2">
            <Link to="/about"><Button variant="ghost" size="sm">About</Button></Link>
            <Link to="/contact"><Button variant="ghost" size="sm">Contact</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Pricing that scales with your city
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Citizens will always use CivicPulse for free. Governments and NGOs pay for the analytics
            and accountability tooling on top.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <Card key={t.name} className={t.highlight ? "border-primary shadow-lg" : ""}>
              <CardHeader>
                <CardTitle>{t.name}</CardTitle>
                <p className="text-3xl font-bold">{t.price}</p>
                <p className="text-sm text-muted-foreground">{t.tagline}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 text-primary" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to={t.href}>
                  <Button className="w-full" variant={t.highlight ? "default" : "outline"}>
                    {t.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
