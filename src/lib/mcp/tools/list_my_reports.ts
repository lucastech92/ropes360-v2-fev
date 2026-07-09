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
  name: "list_my_inspection_reports",
  title: "List my inspection reports",
  description:
    "List inspection reports the signed-in user can access, most recent first. Excludes the large report_data payload.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(20),
    status: z
      .string()
      .trim()
      .optional()
      .describe("Optional exact status filter (e.g. draft, completed)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };

    let query = supabaseForUser(ctx)
      .from("inspection_reports")
      .select("id, report_number, title, status, created_at, updated_at, completed_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error)
      return { content: [{ type: "text", text: error.message }], isError: true };

    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { reports: data ?? [] },
    };
  },
});
