declare const process: { env: Record<string, string | undefined> };

import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_my_services",
  title: "List my services",
  description:
    "List service (JBR) records the signed-in user can access, ordered by most recent first.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20).describe("Max rows to return."),
    search: z
      .string()
      .trim()
      .optional()
      .describe("Optional case-insensitive substring to match against JBR code or client name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, search }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let query = supabaseForUser(ctx)
      .from("services")
      .select("id, codigo_jbr, cliente, equipamentos, aplicacao, local, data_inicio, data_termino, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (search) query = query.or(`codigo_jbr.ilike.%${search}%,cliente.ilike.%${search}%`);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { services: data ?? [] },
    };
  },
});

