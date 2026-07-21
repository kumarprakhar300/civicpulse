import { createFileRoute, Link } from "@tanstack/react-router";
import { Settings2, Save } from "lucide-react";
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

function NotificationPreferencesPage() {
  const { prefs, setPrefs, hydrated } = useNotificationPrefs();

  const toggleKind = (kind: NotifKind) =>
    setPrefs({
      ...prefs,
      enabledKinds: { ...prefs.enabledKinds, [kind]: !prefs.enabledKinds[kind] },
    });

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
          <Link
            to="/notifications"
            className="text-sm text-sky-400 hover:underline"
          >
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
          <ul className="mt-4 divide-y divide-white/10">
            {NOTIF_KINDS.map((k) => {
              const enabled = prefs.enabledKinds[k.value];
              return (
                <li key={k.value} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm text-slate-100">{k.label}</div>
                    <div className="text-xs text-slate-500">kind: {k.value}</div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={!hydrated}
                    onClick={() => toggleKind(k.value)}
                    className={`relative h-6 w-11 rounded-full transition ${
                      enabled ? "bg-sky-500" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                        enabled ? "left-5" : "left-0.5"
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
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
            <button
              type="button"
              role="switch"
              aria-checked={prefs.defaultUnreadOnly}
              disabled={!hydrated}
              onClick={() =>
                setPrefs({ ...prefs, defaultUnreadOnly: !prefs.defaultUnreadOnly })
              }
              className={`relative h-6 w-11 rounded-full transition ${
                prefs.defaultUnreadOnly ? "bg-sky-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                  prefs.defaultUnreadOnly ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </GlassCard>

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrefs(DEFAULT_PREFS)}
          >
            Reset to defaults
          </Button>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Save className="h-3.5 w-3.5" /> Changes save automatically
          </div>
        </div>
      </div>
    </PageShell>
  );
}
