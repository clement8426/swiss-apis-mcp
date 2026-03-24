import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const CKAN_BASE  = "https://ckan.opendata.swiss/api/3/action";
const HYDRO_BASE = "https://www.hydrodaten.admin.ch";

export function registerWeatherTools(server: McpServer) {

  server.tool(
    "swiss_weather_search_meteoswiss",
    "Search MeteoSwiss (official Swiss meteorology) open datasets. MeteoSwiss opened its OGD since May 2025. Individual API queries planned for Q2 2026.",
    {
      query: z.string().describe("e.g. 'temperature', 'precipitation', 'snow', 'climate'"),
      rows: z.number().int().default(10),
    },
    async ({ query, rows }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: {
          q: query,
          fq: "organization:bundesamt-fur-meteorologie-und-klimatologie-meteoschweiz",
          rows,
        },
      });
      const datasets = resp.data.result?.results?.map((d: any) => ({
        title: d.title?.fr || d.title?.de,
        name: d.name,
        formats: [...new Set(d.resources?.map((r: any) => r.format))],
        urls: d.resources?.slice(0, 3).map((r: any) => r.url),
      }));
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "MeteoSwiss OGD portal: https://www.meteoswiss.admin.ch/services-and-publications/service/open-data.html",
            datasets,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_avalanche_data",
    "Get avalanche warning and snow data from SLF (Institute for Snow and Avalanche Research).",
    {
      query: z.string().default("avalanche snow").describe("Search query"),
    },
    async ({ query }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: { q: query, fq: "organization:slf-wsl", rows: 5 },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "SLF Data Service: https://www.slf.ch/en/services-and-products/slf-data-service/",
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
    "swiss_hydro_data",
    "Get hydrological data — river levels, flow rates, flood forecasts from BAFU (Swiss Federal Office for the Environment).",
    {
      station_id: z.string().optional().describe("Hydrological station ID, e.g. '2104' (Rhône at Gletsch)"),
    },
    async ({ station_id }) => {
      if (station_id) {
        const resp = await axios.get(`${HYDRO_BASE}/de/zustand/messdaten/messdaten.json`, {
          params: { station: station_id },
        });
        return { content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }] };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "Swiss hydrological data from BAFU",
            portal: "https://www.hydrodaten.admin.ch/",
            lindas_endpoint: "https://environment.ld.admin.ch/.well-known/void/dataset/hydro",
            usage: "Provide a station_id to get specific measurements",
          }, null, 2),
        }],
      };
    }
  );
}
