// Runtime-only globals for MCP tool files (evaluated in Deno at runtime).
declare const process: {
  env: Record<string, string | undefined>;
};

