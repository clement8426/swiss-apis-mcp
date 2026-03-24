import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerTransportTools } from "./tools/transport.js";
import { registerGeoTools } from "./tools/geo.js";
import { registerHealthTools } from "./tools/health.js";
import { registerPoliticsTools } from "./tools/politics.js";
import { registerBusinessTools } from "./tools/business.js";
import { registerEnergyTools } from "./tools/energy.js";
import { registerWeatherTools } from "./tools/weather.js";
import { registerFoodTools } from "./tools/food.js";
import { registerStatisticsTools } from "./tools/statistics.js";
import { registerSetupTools, loadStoredKeys } from "./tools/setup.js";

// 1. Load .env from the project root (works regardless of launch CWD)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// 2. Load keys previously saved via swiss_set_api_key (stored in ~/.swiss-apis-mcp/keys)
//    These take lower priority than env vars already set above
const stored = loadStoredKeys();
for (const [k, v] of Object.entries(stored)) {
  if (!process.env[k]) process.env[k] = v;
}

const server = new McpServer({
  name: "swiss-apis-mcp",
  version: "1.0.0",
  description: "Comprehensive MCP server exposing all major Swiss public APIs",
});

registerSetupTools(server);
registerTransportTools(server);
registerGeoTools(server);
registerHealthTools(server);
registerPoliticsTools(server);
registerBusinessTools(server);
registerEnergyTools(server);
registerWeatherTools(server);
registerFoodTools(server);
registerStatisticsTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Swiss APIs MCP Server running on stdio");
