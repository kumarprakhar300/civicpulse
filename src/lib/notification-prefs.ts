import { useEffect, useState } from "react";

export const NOTIF_KINDS = [
  { value: "status_change", label: "Status change" },
  { value: "admin_update", label: "Admin update" },
  { value: "system", label: "System" },
  { value: "comment", label: "Comment" },
] as const;

export type NotifKind = (typeof NOTIF_KINDS)[number]["value"];

export type NotificationPrefs = {
  enabledKinds: Record<NotifKind, boolean>;
  defaultUnreadOnly: boolean;
};

const STORAGE_KEY = "civicpulse.notificationPrefs.v1";

export const DEFAULT_PREFS: NotificationPrefs = {
  enabledKinds: {
    status_change: true,
    admin_update: true,
    system: true,
    comment: true,
  },
  defaultUnreadOnly: false,
};

export function loadPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw);
    return {
      enabledKinds: { ...DEFAULT_PREFS.enabledKinds, ...(parsed.enabledKinds ?? {}) },
      defaultUnreadOnly: !!parsed.defaultUnreadOnly,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: NotificationPrefs) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("civicpulse:notif-prefs-changed"));
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useNotificationPrefs() {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPrefsState(loadPrefs());
    setHydrated(true);
    const onChange = () => setPrefsState(loadPrefs());
    window.addEventListener("civicpulse:notif-prefs-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("civicpulse:notif-prefs-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (next: NotificationPrefs) => {
    const prev = prefs;
    // Optimistic UI: apply immediately
    setPrefsState(next);
    setStatus("saving");
    setError(null);
    try {
      savePrefs(next);
      setStatus("saved");
      if (savedTimer.current) clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setStatus("idle"), 1200);
    } catch (e) {
      // Revert on failure (e.g. storage quota / private mode)
      setPrefsState(prev);
      setStatus("error");
      setError(e instanceof Error ? e.message : "Could not save preferences");
    }
  };

  return { prefs, setPrefs: update, hydrated, status, error };
}
