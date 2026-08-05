import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const protectedFunctions = [
  "process-technical-document",
  "technical-assistant-chat",
  "send-push-notification",
  "analyze-cable-image",
  "analyze-report",
  "equipment-ai",
  "executive-report",
];

describe("security phase 1 contract", () => {
  it("requires JWT verification for every privileged edge function", () => {
    const config = read("supabase/config.toml");
    for (const name of protectedFunctions) {
      expect(config).toMatch(new RegExp(`\\[functions\\.${name}\\]\\s+verify_jwt = true`));
    }
  });

  it("requires server-side approval inside every privileged edge function", () => {
    for (const name of protectedFunctions) {
      const source = read(`supabase/functions/${name}/index.ts`);
      expect(source).toContain("requireApprovedUser(req");
      expect(source).toContain("authorizationErrorResponse");
    }
  });

  it("uses the signed-in user's token for executive reports", () => {
    const page = read("src/pages/RelatorioExecutivo.tsx");
    expect(page).toContain("supabase.auth.getSession()");
    expect(page).toContain('Bearer ${session.access_token}');
    expect(page).not.toContain('Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}');
  });

  it("enforces approval through restrictive RLS and guarded RPC wrappers", () => {
    const migration = read("supabase/migrations/20260805190000_security_phase_1_access_guards.sql");
    expect(migration).toContain("AS RESTRICTIVE FOR ALL TO authenticated");
    expect(migration).toContain("public.is_approved_user(auth.uid())");
    expect(migration).toContain("Approved operational role required");
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.create_notification_with_push[\s\S]*FROM PUBLIC, anon, authenticated/);
  });
});
