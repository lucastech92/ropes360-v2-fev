import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listMyServices from "./tools/list_my_services";
import listMyNotifications from "./tools/list_my_notifications";
import listMyCertifications from "./tools/list_my_certifications";
import listMyReports from "./tools/list_my_reports";

// Build the Supabase auth issuer from the project ref (Vite inlines this literal
// at build time, so it stays import-safe). The fallback keeps the issuer well-formed
// during manifest extraction where a token never actually verifies.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "ropes360-mcp",
  title: "Ropes 360 — Hub de Inspetores",
  version: "0.1.0",
  instructions:
    "Tools for Ropes 360 (Bridon-Bekaert Hub de Inspetores). All tools run as the signed-in user and respect row-level security. Use them to look up the user's services (JBR), inspection reports, certifications, and notifications.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listMyServices, listMyReports, listMyCertifications, listMyNotifications],
});

