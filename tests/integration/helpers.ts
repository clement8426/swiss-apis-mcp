import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type ToolResult = {
  content: Array<{ type: string; text: string }>;
};

export type ToolHandler = (params: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Same mock server as unit tests — but axios is NOT mocked here,
 * so every tool call makes a real HTTP request to the live API.
 */
export function createRealServer() {
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

export function parseResult(result: ToolResult): unknown {
  return JSON.parse(result.content[0].text);
}

export function textResult(result: ToolResult): string {
  return result.content[0].text;
}
