import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

export function registerHealthTools(server: McpServer) {

  server.tool(
    "swiss_health_search_datasets",
    "Search BAG (Federal Office of Public Health) datasets on opendata.swiss. Covers infectious diseases, hospitalizations, mortality, vaccination rates, etc.",
    {
      query: z.string().describe("e.g. 'covid', 'influenza', 'hospitalisations', 'mortality'"),
      rows: z.number().int().default(10),
    },
    async ({ query, rows }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: {
          q: query,
          fq: "organization:bundesamt-fur-gesundheit-bag",
          rows,
        },
      });
      const datasets = resp.data.result?.results?.map((d: any) => ({
        title: d.title?.fr || d.title?.de,
        name: d.name,
        description: d.notes?.fr?.substring(0, 300),
        formats: [...new Set(d.resources?.map((r: any) => r.format))],
        urls: d.resources?.slice(0, 2).map((r: any) => r.url),
      }));
      return { content: [{ type: "text", text: JSON.stringify(datasets, null, 2) }] };
    }
  );

  server.tool(
    "swiss_health_get_dataset",
    "Get direct download URLs and metadata for a specific BAG health dataset by its slug.",
    {
      dataset_slug: z.string().describe("Dataset slug from opendata.swiss, e.g. 'covid-19-schweiz'"),
    },
    async ({ dataset_slug }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_show`, { params: { id: dataset_slug } });
      const d = resp.data.result;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            title: d.title,
            description: d.notes,
            resources: d.resources?.map((r: any) => ({
              name: r.name,
              format: r.format,
              url: r.url,
              last_modified: r.last_modified,
            })),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_health_get_versorgungsatlas",
    "Get Swiss Health Atlas (Versorgungsatlas) data — 100+ health indicators by canton. Powered by BAG + Swiss Health Observatory.",
    {
      indicator: z.string().describe("Indicator name or keyword, e.g. 'esperance de vie', 'mortalite', 'hospitalisations'"),
    },
    async ({ indicator }) => {
      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: {
          q: indicator,
          fq: "organization:bundesamt-fur-gesundheit-bag",
          rows: 5,
        },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "Data from Swiss Health Care Atlas (versorgungsatlas.ch)",
            source: "https://www.versorgungsatlas.ch/",
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
