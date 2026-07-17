import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyReports from "./tools/list-my-reports";
import getReport from "./tools/get-report";
import createReport from "./tools/create-report";
import listNotifications from "./tools/list-notifications";
import listUnreadNotifications from "./tools/list-unread-notifications";
import markNotificationRead from "./tools/mark-notification-read";

// The OAuth issuer MUST be the direct Supabase host, not the .lovable.cloud proxy.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "civicpulse-mcp",
  title: "CivicPulse MCP",
  version: "0.1.0",
  instructions:
    "Tools for CivicPulse — list, fetch, and create civic issue reports on behalf of the signed-in user, and read/manage their in-app notifications. All calls run under the user's RLS scope.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listMyReports,
    getReport,
    createReport,
    listNotifications,
    listUnreadNotifications,
    markNotificationRead,
  ],
});
