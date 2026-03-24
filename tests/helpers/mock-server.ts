import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolResult = {
  content: Array<{ type: string; text: string }>;
};

export type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Creates a lightweight mock of McpServer that captures registered tool handlers.
 * Use `tools["tool_name"](params)` to invoke a tool directly in tests.
 */
export function createMockServer() {
  const tools: Record<string, ToolHandler> = {};

  const server = {
    tool: (
      name: string,
      _description: string,
      _schema: unknown,
      handler: ToolHandler,
    ) => {
      tools[name] = handler;
    },
  } as unknown as McpServer;

  return { server, tools };
}

/** Parse JSON from the first content item of a tool result. */
export function parseResult(result: ToolResult): unknown {
  return JSON.parse(result.content[0].text);
}

/** Get raw text from the first content item of a tool result. */
export function textResult(result: ToolResult): string {
  return result.content[0].text;
}
