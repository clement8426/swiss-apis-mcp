# Swiss APIs MCP Server

MCP (Model Context Protocol) server exposing **all major Swiss official public APIs** as native tools for any MCP-compatible AI agent.

**29 tools — 9 domains — 100% free APIs — zero configuration required for most tools.**

---

## What you can ask your AI

```
"What are the next trains from Geneva-Cornavin to Zurich?"
"What is the altitude of GPS coordinates 45.9763, 7.6586 (Matterhorn)?"
"Find all active companies named 'Nestlé' in the Swiss commercial register."
"Which canton and municipality contain coordinates 46.52, 6.63?"
"Search opendata.swiss for air quality datasets."
"What parliamentary motions on climate change were filed in 2024?"
"Convert LV95 coordinates 2600000, 1200000 to WGS84."
"Which API keys are configured? Set up my ZEFIX credentials."
```

---

## Tools Reference

### Setup (2 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_check_setup` | Check which optional API keys are configured and which are missing | None |
| `swiss_set_api_key` | Store an API key persistently — takes effect immediately, no restart needed | None |

> The agent calls `swiss_check_setup` first, then asks you for any missing keys and stores them via `swiss_set_api_key`. Keys are saved in `~/.swiss-apis-mcp/keys` and survive server restarts.

---

### Transport (4 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_transport_stationboard` | Next departures from any Swiss station | None |
| `swiss_transport_connections` | Train/bus connections between two locations | None |
| `swiss_transport_station_search` | Search stations by name or GPS coordinates | None |
| `swiss_transport_gtfs_realtime` | GTFS-RT real-time feeds (delays, positions, alerts) | `OTD_API_KEY` |

**API:** [transport.opendata.ch](https://transport.opendata.ch/docs.html) · [opentransportdata.swiss](https://opentransportdata.swiss/en/)

---

### Geography (7 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_geo_search_location` | Search addresses, communes, POIs, postal codes | None |
| `swiss_geo_get_elevation` | Terrain altitude in meters for any Swiss WGS84 coordinate | None |
| `swiss_geo_identify_canton` | Which canton contains a coordinate | None |
| `swiss_geo_identify_municipality` | Which commune contains a coordinate | None |
| `swiss_geo_convert_coordinates` | Convert WGS84 ↔ LV95 ↔ LV03 | None |
| `swiss_geo_get_wmts_tile_url` | Official swisstopo map tile URL | None |
| `swiss_geo_find_layer_features` | Search features in a GeoAdmin map layer | None |

**API:** [GeoAdmin REST](https://api3.geo.admin.ch/services/sdiservices.html) · [swisstopo REFRAME](https://www.swisstopo.admin.ch/en/rest-api-geoservices-reframe-web) · [GeoAdmin Height](https://api3.geo.admin.ch/rest/services/height)

---

### Health (3 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_health_search_datasets` | Search BAG/OFSP datasets (diseases, mortality, vaccination) | None |
| `swiss_health_get_dataset` | Metadata and download URLs for a specific health dataset | None |
| `swiss_health_get_versorgungsatlas` | Swiss Health Atlas — 100+ cantonal health indicators | None |

**API:** [opendata.swiss/BAG](https://opendata.swiss/en/dataset?organization=bundesamt-fur-gesundheit-bag) · [versorgungsatlas.ch](https://www.versorgungsatlas.ch/)

---

### Politics (3 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_parliament_search` | Search motions, postulates, votes across 74+ parliaments | None |
| `swiss_parliament_persons` | Parliament members and their activity | None |
| `swiss_federal_law_search` | Search Swiss federal legislation via Fedlex SPARQL | None |

**API:** [OpenParlData](https://api.openparldata.ch/documentation) · [Fedlex](https://www.fedlex.admin.ch/)

---

### Business (4 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_company_search` | Search Swiss companies in ZEFIX (official commercial register) | `ZEFIX_USER` + `ZEFIX_PASS` |
| `swiss_company_by_uid` | Full company details by UID (CHE-xxx.xxx.xxx) | `ZEFIX_USER` + `ZEFIX_PASS` |
| `swiss_company_publications` | SOGC publications for a company (registrations, mergers) | `ZEFIX_USER` + `ZEFIX_PASS` |
| `swiss_opendata_search_datasets` | Search 14,000+ official Swiss government datasets | None |

**API:** [ZEFIX REST](https://www.zefix.admin.ch/ZefixPublicREST/swagger-ui/index.html) · [opendata.swiss CKAN](https://opendata.swiss/api/3/action/)

---

### Energy (2 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_energy_search_datasets` | SFOE datasets — solar, hydro, EV charging, consumption | None |
| `swiss_grid_energy_data` | Swissgrid — production mix, cross-border electricity flows | None |

**API:** [SFOE/BFE](https://opendata.swiss/en/dataset?organization=bundesamt-fur-energie-bfe) · [Swissgrid](https://www.swissgrid.ch/en/home/customers/topics/energy-data-ch.html)

---

### Weather & Environment (3 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_weather_search_meteoswiss` | MeteoSwiss OGD datasets (temperature, precipitation, climate) | None |
| `swiss_avalanche_data` | SLF avalanche warnings and snow data | None |
| `swiss_hydro_data` | BAFU river levels, flow rates, flood forecasts | None |

**API:** [MeteoSwiss OGD](https://www.meteoswiss.admin.ch/services-and-publications/service/open-data.html) · [hydrodaten.admin.ch](https://www.hydrodaten.admin.ch/)

---

### Food (2 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_food_search_products` | FoodRepo (EPFL) — barcoded Swiss food products + nutrients | `FOODREPO_API_KEY` |
| `swiss_food_nutrition_database` | Swiss Food Composition Database (FSVO/OSAV) | None |

**API:** [FoodRepo](https://www.foodrepo.org/api-docs/swaggers/v3) · [naehrwertdaten.ch](https://naehrwertdaten.ch/)

---

### Statistics & Finance (4 tools)
| Tool | Description | Auth |
|------|-------------|------|
| `swiss_statistics_search` | BFS/OFS datasets — population, economy, education | None |
| `swiss_snb_financial_data` | Swiss National Bank — exchange rates, interest rates, inflation | None |
| `swiss_postal_data` | Swiss postal codes, streets, communes via OpenPLZ | None |
| `swiss_migration_statistics` | SEM migration and asylum statistics | None |

**API:** [BFS](https://opendata.swiss/en/dataset?organization=bundesamt-fur-statistik-bfs) · [data.snb.ch](https://data.snb.ch/) · [openplzapi.org](https://www.openplzapi.org/en/switzerland/)

---

## Installation

### 1. From npm (recommended)

No clone required. Point your MCP client at the published package:

```json
{
  "mcpServers": {
    "swiss-apis-mcp": {
      "command": "npx",
      "args": ["-y", "swiss-apis-mcp"]
    }
  }
}
```

Or install globally and run the compiled entrypoint:

```bash
npm install -g swiss-apis-mcp
```

Then use `"command": "swiss-apis-mcp"` (and `"args": []` if your client requires the field) in the same config shape as above.

### 2. From source (development)

```bash
git clone https://github.com/clement8426/swiss-apis-mcp.git
cd swiss-apis-mcp
npm install
npm run build
```

Use `node /path/to/swiss-apis-mcp/dist/index.js` or `npx tsx src/index.ts` in your MCP config while developing.

### 3. Optional API keys

Most tools work with zero configuration. Four tools need free credentials:

| Key | Service | Register |
|-----|---------|---------|
| `OTD_API_KEY` | opentransportdata.swiss — GTFS real-time | [api-manager.opentransportdata.swiss](https://api-manager.opentransportdata.swiss/) |
| `ZEFIX_USER` | ZEFIX — Swiss commercial register | [zefix.admin.ch](https://www.zefix.admin.ch) |
| `ZEFIX_PASS` | ZEFIX — Swiss commercial register | [zefix.admin.ch](https://www.zefix.admin.ch) |
| `FOODREPO_API_KEY` | FoodRepo (EPFL) — food products | [foodrepo.org](https://www.foodrepo.org/en/users/sign_up) |

**Option A — Let the AI agent do it for you:**
Ask your agent `"check my Swiss APIs setup"`. It will call `swiss_check_setup`, identify what's missing, ask you for credentials, and store them automatically via `swiss_set_api_key`. No restart needed.

**Option B — Set them manually before launching:**
```bash
cp .env.example .env
# Edit .env with your keys
```

### 4. Test locally (from a clone)

```bash
npm run inspector
```

Opens the MCP Inspector at `http://localhost:6274` — run any tool interactively.

---

## Integration

Examples below use **`npx -y swiss-apis-mcp`** (published package). From a local clone, replace the `args` with `["tsx", "/absolute/path/to/swiss-apis-mcp/src/index.ts"]` or `["node", "/absolute/path/to/swiss-apis-mcp/dist/index.js"]` after `npm run build`.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "swiss-apis-mcp": {
      "command": "npx",
      "args": ["-y", "swiss-apis-mcp"]
    }
  }
}
```

### Cursor

Edit `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project-level):

```json
{
  "mcpServers": {
    "swiss-apis-mcp": {
      "command": "npx",
      "args": ["-y", "swiss-apis-mcp"]
    }
  }
}
```

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "swiss-apis-mcp": {
      "command": "npx",
      "args": ["-y", "swiss-apis-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add swiss-apis-mcp npx -y swiss-apis-mcp
```

### Continue.dev

In `.continue/config.json`:

```json
{
  "experimental": {
    "modelContextProtocolServers": [
      {
        "transport": {
          "type": "stdio",
          "command": "npx",
          "args": ["-y", "swiss-apis-mcp"]
        }
      }
    ]
  }
}
```

---

## Project structure

```
swiss-apis-mcp/
├── src/
│   ├── index.ts              # Server entry point — loads saved keys, registers all tools
│   └── tools/
│       ├── setup.ts          # swiss_check_setup + swiss_set_api_key
│       ├── transport.ts      # transport.opendata.ch + opentransportdata.swiss
│       ├── geo.ts            # GeoAdmin REST + swisstopo REFRAME + height API
│       ├── health.ts         # BAG/OFSP + Versorgungsatlas
│       ├── politics.ts       # OpenParlData + Fedlex SPARQL
│       ├── business.ts       # ZEFIX REST + opendata.swiss CKAN
│       ├── energy.ts         # SFOE/BFE + Swissgrid
│       ├── weather.ts        # MeteoSwiss OGD + SLF + BAFU hydro
│       ├── food.ts           # FoodRepo (EPFL) + Swiss Food Composition DB
│       └── statistics.ts     # BFS/OFS + SNB + OpenPLZ + SEM
├── tests/
│   ├── helpers/mock-server.ts
│   ├── *.test.ts             # Unit tests (offline — axios mocked)
│   └── integration/
│       ├── helpers.ts
│       └── *.integration.test.ts  # Integration tests (real HTTP calls)
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── vitest.integration.config.ts
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the MCP server via tsx (development) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Start compiled server (`node dist/index.js`) |
| `npm run inspector` | Open MCP Inspector UI at localhost:6274 |
| `npm test` | Run unit tests (fast, offline, no network) |
| `npm run test:integration` | Run integration tests (real API calls) |
| `npm run test:all` | Run both |
| `npm run test:coverage` | Unit tests with coverage report |

---

## Adding a new tool

```typescript
// src/tools/my_domain.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

export function registerMyDomainTools(server: McpServer) {
  server.tool(
    "swiss_my_tool_name",
    "Description shown to the AI agent — be precise about what data is returned.",
    {
      param1: z.string().describe("What this parameter does"),
    },
    async ({ param1 }) => {
      const resp = await axios.get("https://api.swiss.ch/endpoint", {
        params: { q: param1 },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );
}
```

Then register in `src/index.ts`:

```typescript
import { registerMyDomainTools } from "./tools/my_domain.js";
registerMyDomainTools(server);
```

---

## Resources

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP official docs](https://modelcontextprotocol.io/docs)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)
- [opendata.swiss](https://opendata.swiss/)
- [GeoAdmin API docs](https://api3.geo.admin.ch/services/sdiservices.html)
- [Awesome OGD Switzerland](https://rnckp.github.io/awesome-ogd-switzerland/)
- [ZEFIX Swagger](https://www.zefix.admin.ch/ZefixPublicREST/swagger-ui/index.html)
- [OpenParlData](https://api.openparldata.ch/documentation)
- [Fedlex SPARQL](https://fedlex.data.admin.ch/sparqlendpoint)

## Licence

MIT — see [LICENSE](LICENSE).
