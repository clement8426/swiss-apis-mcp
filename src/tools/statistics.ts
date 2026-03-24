import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

export function registerStatisticsTools(server: McpServer) {

  server.tool(
    "swiss_statistics_search",
    "Search the Swiss Federal Statistical Office (BFS/OFS) datasets — population, economy, education, society.",
    {
      query: z.string().describe("Statistical topic, e.g. 'population', 'unemployment', 'GDP', 'immigration'"),
      rows: z.number().int().default(10),
    },
    async ({ query, rows }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: { q: query, fq: "organization:bundesamt-fur-statistik-bfs", rows },
      });
      const datasets = resp.data.result?.results?.map((d: any) => ({
        title: d.title?.fr || d.title?.de,
        name: d.name,
        description: d.notes?.fr?.substring(0, 250),
        formats: [...new Set(d.resources?.map((r: any) => r.format))],
        urls: d.resources?.slice(0, 2).map((r: any) => r.url),
      }));
      return { content: [{ type: "text", text: JSON.stringify({ total: resp.data.result?.count, datasets }, null, 2) }] };
    }
  );

  server.tool(
    "swiss_snb_financial_data",
    "Get Swiss National Bank (SNB) financial and monetary data — exchange rates, interest rates, balance sheets.",
    {
      query: z.string().describe("e.g. 'exchange rates EUR/CHF', 'interest rates', 'inflation', 'monetary policy'"),
    },
    async ({ query }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: { q: query, fq: "organization:schweizerische-nationalbank-snb", rows: 5 },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "Swiss National Bank data portal: https://data.snb.ch/",
            api_endpoint: "https://data.snb.ch/api",
            datasets: resp.data.result?.results?.map((d: any) => ({
              title: d.title?.fr || d.title?.de,
              urls: d.resources?.map((r: any) => r.url),
            })),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_postal_data",
    "Get Swiss postal codes, street names, and administrative divisions via OpenPLZ API. Free, no auth.",
    {
      postal_code: z.string().optional().describe("Swiss postal code, e.g. '1201' or '8001'"),
      municipality: z.string().optional().describe("Municipality name, e.g. 'Genève'"),
      canton: z.string().optional().describe("Canton abbreviation, e.g. 'GE'"),
    },
    async ({ postal_code, municipality }) => {
      const base = "https://openplzapi.org/ch";

      if (postal_code) {
        const resp = await axios.get(`${base}/Localities`, { params: { postalCode: postal_code } });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }
      if (municipality) {
        const resp = await axios.get(`${base}/Localities`, { params: { name: municipality } });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "OpenPLZ API — Swiss postal codes, localities, cantons. Free, no auth.",
            api_base: "https://openplzapi.org/ch",
            endpoints: {
              localities: "GET /ch/Localities?postalCode=1201",
              cantons: "GET /ch/Cantons",
              streets: "GET /ch/Streets?name=Rue+de+Rive&postalCode=1204",
            },
            docs: "https://www.openplzapi.org/en/switzerland/",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_migration_statistics",
    "Get Swiss migration and population data from SEM (State Secretariat for Migration).",
    {
      query: z.string().default("migration asylum population"),
    },
    async ({ query }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: { q: query, fq: "organization:staatssekretariat-fur-migration-sem", rows: 5 },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "SEM stats portal: https://www.sem.admin.ch/sem/de/home/publiservice/statistik.html",
            datasets: resp.data.result?.results?.map((d: any) => ({
              title: d.title?.fr || d.title?.de,
              urls: d.resources?.map((r: any) => r.url),
            })),
          }, null, 2),
        }],
      };
    }
  );
}
