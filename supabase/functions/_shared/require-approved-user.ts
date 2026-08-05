import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2.74.0";

export type AppRole = "admin" | "moderator" | "inspector" | "viewer";

export class AuthorizationError extends Error {
  status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requireApprovedUser(
  req: Request,
  allowedRoles?: AppRole[],
): Promise<{ user: User; roles: AppRole[] }> {
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new AuthorizationError("Authentication required", 401);
  }

  const token = authorization.slice("Bearer ".length).trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error("Supabase authentication environment is not configured");
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser(token);

  if (userError || !user) {
    throw new AuthorizationError("Invalid or expired session", 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: roleRows, error: roleError } = await adminClient
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("approved", true);

  if (roleError) {
    throw new Error("Unable to verify user approval");
  }

  const roles = (roleRows ?? []).map((row) => row.role as AppRole);
  if (roles.length === 0) {
    throw new AuthorizationError("User account is pending approval", 403);
  }

  if (allowedRoles?.length && !roles.some((role) => allowedRoles.includes(role))) {
    throw new AuthorizationError("Insufficient permissions", 403);
  }

  return { user, roles };
}

export function authorizationErrorResponse(error: unknown, corsHeaders: HeadersInit): Response | null {
  if (!(error instanceof AuthorizationError)) return null;

  return new Response(JSON.stringify({ error: error.message }), {
    status: error.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
