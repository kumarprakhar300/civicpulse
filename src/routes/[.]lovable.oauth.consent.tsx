import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";

// Beta helpers not yet in the SDK types — local typed shim.
type OAuthClient = { name?: string; client_id?: string; redirect_uri?: string };
type OAuthDetails = {
  client?: OAuthClient;
  scope?: string;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResp = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResp>;
  approveAuthorization: (id: string) => Promise<OAuthResp>;
  denyAuthorization: (id: string) => Promise<OAuthResp>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s.authorization_id === "string" ? s.authorization_id : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/auth", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="min-h-screen grid place-items-center bg-[#030712] text-slate-100 p-6">
      <div className="max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-6">
        <h1 className="text-lg font-bold">Authorization error</h1>
        <p className="mt-2 text-sm text-slate-400">
          {String((error as Error)?.message ?? error)}
        </p>
      </div>
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clientName = details?.client?.name ?? "an app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[#030712] text-slate-100 p-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/70 p-7 backdrop-blur-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]">
        <div className="flex items-center gap-2 text-cyan-300">
          <ShieldCheck className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em]">
            Authorize access
          </span>
        </div>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight">
          Connect {clientName} to CivicPulse
        </h1>
        <p className="mt-3 text-sm text-slate-400">
          {clientName} will be able to call CivicPulse's enabled tools while you are signed in
          — list and create your reports, and read your notifications. This does not bypass
          CivicPulse's permissions or backend policies.
        </p>
        {details?.scope && (
          <p className="mt-3 text-xs text-slate-500">
            Requested scope: <span className="font-mono">{details.scope}</span>
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => decide(true)}
            disabled={busy}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Approve"}
          </Button>
          <Button
            variant="outline"
            onClick={() => decide(false)}
            disabled={busy}
            className="flex-1 border-white/15 bg-white/5 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
        </div>
      </div>
    </main>
  );
}
