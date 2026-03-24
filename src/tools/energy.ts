import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

export function registerEnergyTools(server: McpServer) {

  server.tool(
    "swiss_energy_search_datasets",
    "Search Swiss energy data from SFOE (Swiss Federal Office of Energy) — electricity production, renewables, consumption, EV charging stations.",
    {
      query: z.string().describe("e.g. 'electricity', 'solar', 'hydropower', 'charging stations', 'energy consumption'"),
      rows: z.number().int().default(10),
    },
    async ({ query, rows }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: { q: query, fq: "organization:bundesamt-fur-energie-bfe", rows },
      });
      const datasets = resp.data.result?.results?.map((d: any) => ({
        title: d.title?.fr || d.title?.de,
        name: d.name,
        formats: [...new Set(d.resources?.map((r: any) => r.format))],
        urls: d.resources?.slice(0, 2).map((r: any) => r.url),
      }));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "SFOE data — includes charging stations (ich-tanke-strom.ch), hydropower stats (WASTA), etc.",
            datasets,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_grid_energy_data",
    "Get Swiss energy grid data from Swissgrid — actual electricity consumption, production mix, cross-border flows.",
    {
      query: z.string().default("energy grid").describe("Search query"),
    },
    async ({ query }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: { q: query, fq: "organization:swissgrid-ag", rows: 5 },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "Swissgrid energy data portal: https://www.swissgrid.ch/de/home/customers/topics/energy-data-ch.html",
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
