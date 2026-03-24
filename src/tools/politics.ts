import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const CKAN_BASE     = "https://ckan.opendata.swiss/api/3/action";
const PARLDATA_BASE = "https://api.openparldata.ch";

export function registerPoliticsTools(server: McpServer) {

  server.tool(
    "swiss_parliament_search",
    "Search Swiss parliamentary business (motions, postulates, votes) across 74+ cantonal and national parliaments via OpenParlData API.",
    {
      query: z.string().describe("Search topic, e.g. 'climate', 'health', 'immigration'"),
      parliament: z.string().optional().describe("Parliament code: 'ch' (federal), 'GE', 'ZH', 'VD', etc."),
      limit: z.number().int().default(10),
    },
    async ({ query, parliament, limit }) => {
      const params: Record<string, unknown> = { q: query, limit };
      if (parliament) params.parliament = parliament;

      try {
        const resp = await axios.get(`${PARLDATA_BASE}/business`, { params });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      } catch {
        const resp2 = await axios.get(`${CKAN_BASE}/package_search`, {
          params: { q: query, fq: "organization:schweizerische-bundesversammlung", rows: limit },
        });
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              note: "OpenParlData API: https://api.openparldata.ch/documentation | GUI: https://openparldata.ch/searchservice",
              fallback_results: resp2.data.result?.results?.map((d: any) => ({
                title: d.title?.fr || d.title?.de,
                urls: d.resources?.map((r: any) => r.url),
              })),
            }, null, 2),
          }],
        };
      }
    }
  );

  server.tool(
    "swiss_parliament_persons",
    "Get Swiss parliament members (councillors, deputies) with their parliamentary activity.",
    {
      parliament: z.string().default("ch").describe("Parliament code"),
      limit: z.number().int().default(20),
    },
    async ({ parliament, limit }) => {
      try {
        const resp = await axios.get(`${PARLDATA_BASE}/persons`, { params: { parliament, limit } });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      } catch {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              api_docs: "https://api.openparldata.ch/documentation",
              github: "https://github.com/OpendataCH/OpenParlDataCH",
              note: "Covers 78 national, cantonal, and municipal parliaments in Switzerland and Liechtenstein",
            }, null, 2),
          }],
        };
      }
    }
  );

  server.tool(
    "swiss_federal_law_search",
    "Search Swiss federal legislation via Fedlex (official federal law publication platform).",
    {
      query: z.string().describe("Legal term or law title in FR/DE/IT/EN"),
    },
    async ({ query }) => {
      const sparql = `
        SELECT ?uri ?title ?shortTitle ?date WHERE {
          ?uri a <https://fedlex.data.admin.ch/vocabulary/legal-taxonomy/in-force> .
          ?uri <http://www.w3.org/2000/01/rdf-schema#label> ?title .
          FILTER(LANG(?title) = "fr")
          FILTER(CONTAINS(LCASE(?title), LCASE("${query}")))
        } LIMIT 10
      `;
      try {
        const resp = await axios.get("https://fedlex.data.admin.ch/sparqlendpoint", {
          params: { query: sparql, format: "json" },
        });
        return { content: [{ type: "text", text: JSON.stringify(resp.data?.results?.bindings, null, 2) }] };
      } catch {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              note: "Fedlex — Swiss federal law platform",
              portal: "https://www.fedlex.admin.ch/",
              sparql_endpoint: "https://fedlex.data.admin.ch/sparqlendpoint",
              search_hint: `Try searching on https://www.fedlex.admin.ch for: ${query}`,
            }, null, 2),
          }],
        };
      }
    }
  );
}
