import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings2, Save, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell, GlassCard } from "@/components/PageShell";
import {
  DEFAULT_PREFS,
  NOTIF_KINDS,
  useNotificationPrefs,
  type NotifKind,
} from "@/lib/notification-prefs";

export const Route = createFileRoute("/_authenticated/notification-preferences")({
  head: () => ({
    meta: [
      { title: "Notification preferences — CivicPulse" },
      { name: "description", content: "Choose which notification kinds you receive and set your default Unread-only view." },
    ],
  }),
  component: NotificationPreferencesPage,
});

function Toggle({
  checked,
  disabled,
  onClick,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 rounded-full transition disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-sky-500" : "bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
          checked ? "left-5" : "left-0.5"
        }`}
      />
    </button>
  );
}

function StatusPill({
  status,
  error,
}: {
  status: "idle" | "saving" | "saved" | "error";
  error: string | null;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1 text-xs text-slate-400">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
      </span>
    );
  }
  if (status === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  }
  if (status === "error") {
    return (
      <span
        className="flex items-center gap-1 text-xs text-red-400"
        title={error ?? undefined}
      >
        <AlertTriangle className="h-3.5 w-3.5" /> Couldn't save — reverted
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Save className="h-3.5 w-3.5" /> Changes save automatically
    </span>
  );
}

function NotificationPreferencesPage() {
  const { prefs, setPrefs, hydrated, status, error } = useNotificationPrefs();

  const toggleKind = (kind: NotifKind) =>
    setPrefs({
      ...prefs,
      enabledKinds: { ...prefs.enabledKinds, [kind]: !prefs.enabledKinds[kind] },
    });

  const busy = !hydrated || status === "saving";

  return (
    <PageShell>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
              <Settings2 className="h-6 w-6" /> Notification preferences
            </h1>
            <p className="text-sm text-slate-400">
              Control which alerts show up on your Notifications page.
            </p>
          </div>
          <Link to="/notifications" className="text-sm text-sky-400 hover:underline">
            Back to alerts →
          </Link>
        </div>

        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Notification kinds
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Disabled kinds are hidden from your Notifications list.
          </p>
          {!hydrated ? (
            <ul className="mt-4 divide-y divide-white/10">
              {NOTIF_KINDS.map((k) => (
                <li key={k.value} className="flex items-center justify-between py-3">
                  <div className="space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
                    <div className="h-2 w-32 animate-pulse rounded bg-white/5" />
                  </div>
                  <div className="h-6 w-11 animate-pulse rounded-full bg-white/10" />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-4 divide-y divide-white/10">
              {NOTIF_KINDS.map((k) => {
                const enabled = prefs.enabledKinds[k.value];
                return (
                  <li key={k.value} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-sm text-slate-100">{k.label}</div>
                      <div className="text-xs text-slate-500">kind: {k.value}</div>
                    </div>
                    <Toggle
                      checked={enabled}
                      disabled={busy}
                      onClick={() => toggleKind(k.value)}
                      label={`Toggle ${k.label}`}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
            Default view
          </h2>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-100">Show only unread by default</div>
              <div className="text-xs text-slate-500">
                Applied when you open the Notifications page.
              </div>
            </div>
            <Toggle
              checked={prefs.defaultUnreadOnly}
              disabled={busy}
              onClick={() =>
                setPrefs({ ...prefs, defaultUnreadOnly: !prefs.defaultUnreadOnly })
              }
              label="Toggle unread-only default"
            />
          </div>
        </GlassCard>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => setPrefs(DEFAULT_PREFS)}
          >
            Reset to defaults
          </Button>
          <StatusPill status={status} error={error} />
        </div>
      </div>
    </PageShell>
  );
}
