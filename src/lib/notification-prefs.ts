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

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadPrefs());
    setHydrated(true);
    const onChange = () => setPrefs(loadPrefs());
    window.addEventListener("civicpulse:notif-prefs-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("civicpulse:notif-prefs-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const update = (next: NotificationPrefs) => {
    setPrefs(next);
    savePrefs(next);
  };

  return { prefs, setPrefs: update, hydrated };
}
