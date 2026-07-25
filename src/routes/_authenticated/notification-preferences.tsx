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
  onChange,
  label,
  describedBy,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
  describedBy?: string;
}) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    // Space/Enter are handled natively by <button>. Add arrow-key semantics
    // recommended for role="switch" (Left=off, Right=on, Home=off, End=on).
    if ((e.key === "ArrowLeft" || e.key === "Home") && checked) {
      e.preventDefault();
      onChange(false);
    } else if ((e.key === "ArrowRight" || e.key === "End") && !checked) {
      e.preventDefault();
      onChange(true);
    }
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-sky-500" : "bg-slate-700"
      }`}
    >
      <span
        aria-hidden="true"
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
  let content: React.ReactNode;
  let tone = "text-slate-400";
  if (status === "saving") {
    content = (
      <>
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Saving…
      </>
    );
  } else if (status === "saved") {
    tone = "text-emerald-400";
    content = (
      <>
        <Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved
      </>
    );
  } else if (status === "error") {
    tone = "text-red-400";
    content = (
      <>
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" /> Couldn't save
        {error ? ` — ${error}` : " — reverted"}
      </>
    );
  } else {
    content = (
      <>
        <Save className="h-3.5 w-3.5" aria-hidden="true" /> Changes save automatically
      </>
    );
  }
  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`flex items-center gap-1 text-xs ${tone}`}
    >
      {content}
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
          <h2
            id="notif-kinds-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-300"
          >
            Notification kinds
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Disabled kinds are hidden from your Notifications list.
          </p>
          {!hydrated ? (
            <ul
              className="mt-4 divide-y divide-white/10"
              aria-busy="true"
              aria-labelledby="notif-kinds-heading"
            >
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
            <ul
              className="mt-4 divide-y divide-white/10"
              role="group"
              aria-labelledby="notif-kinds-heading"
            >
              {NOTIF_KINDS.map((k) => {
                const enabled = prefs.enabledKinds[k.value];
                const labelId = `notif-kind-label-${k.value}`;
                const descId = `notif-kind-desc-${k.value}`;
                return (
                  <li key={k.value} className="flex items-center justify-between py-3">
                    <div>
                      <div id={labelId} className="text-sm text-slate-100">
                        {k.label}
                      </div>
                      <div id={descId} className="text-xs text-slate-500">
                        kind: {k.value}
                      </div>
                    </div>
                    <Toggle
                      checked={enabled}
                      disabled={busy}
                      onChange={() => toggleKind(k.value)}
                      label={`${k.label} notifications`}
                      describedBy={descId}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h2
            id="notif-default-heading"
            className="text-sm font-semibold uppercase tracking-wide text-slate-300"
          >
            Default view
          </h2>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <div id="notif-default-label" className="text-sm text-slate-100">
                Show only unread by default
              </div>
              <div id="notif-default-desc" className="text-xs text-slate-500">
                Applied when you open the Notifications page.
              </div>
            </div>
            <Toggle
              checked={prefs.defaultUnreadOnly}
              disabled={busy}
              onChange={(next) => setPrefs({ ...prefs, defaultUnreadOnly: next })}
              label="Show only unread notifications by default"
              describedBy="notif-default-desc"
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
