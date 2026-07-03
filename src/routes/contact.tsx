import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — CivicPulse" },
      {
        name: "description",
        content: "Talk to the CivicPulse team about deploying in your city or NGO.",
      },
      { property: "og:title", content: "Contact CivicPulse" },
      { property: "og:description", content: "Get in touch about pilots, pricing, and partnerships." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    if (!name || !email || !message) return toast.error("Please fill every field");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast.error("Invalid email");
    setSubmitted(true);
    toast.success("Thanks — we'll get back within a business day.");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MapPin className="h-4 w-4" />
            </span>
            CivicPulse
          </Link>
          <nav className="flex gap-2">
            <Link to="/about"><Button variant="ghost" size="sm">About</Button></Link>
            <Link to="/pricing"><Button variant="ghost" size="sm">Pricing</Button></Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-bold">Get in touch</h1>
        <p className="mt-2 text-muted-foreground">
          Deploying CivicPulse for a municipality or NGO? Tell us about your city.
        </p>

        <Card className="mt-8">
          <CardHeader><CardTitle>Contact form</CardTitle></CardHeader>
          <CardContent>
            {submitted ? (
              <p className="text-sm">
                ✅ Thanks! Your message has been received (this demo does not send an actual email).
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" maxLength={100} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" maxLength={255} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" rows={5} maxLength={1000} required />
                </div>
                <Button type="submit">Send message</Button>
              </form>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
