import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

// ZEFIX — Swiss Commercial Register
// REST API: free but requires account registration at zefix.admin.ch
// Swagger: https://www.zefix.admin.ch/ZefixPublicREST/swagger-ui/index.html
const ZEFIX_BASE = "https://www.zefix.admin.ch/ZefixPublicREST/api/v1";

// opendata.swiss CKAN — No auth required
const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

export function registerBusinessTools(server: McpServer) {

  server.tool(
    "swiss_company_search",
    "Search Swiss companies in ZEFIX (official commercial register). Requires ZEFIX_USER and ZEFIX_PASS env vars (free account at zefix.admin.ch).",
    {
      name: z.string().describe("Company name or partial name to search"),
      canton: z.string().optional().describe("Canton abbreviation filter, e.g. 'GE', 'ZH', 'VD'"),
      active_only: z.boolean().default(true),
      max_results: z.number().int().default(20),
    },
    async ({ name, canton, active_only, max_results }) => {
      const user = process.env.ZEFIX_USER;
      const pass = process.env.ZEFIX_PASS;

      if (!user || !pass) {
        return {
          content: [{
            type: "text",
            text: "ZEFIX_USER and ZEFIX_PASS not set. Register free at: https://www.zefix.admin.ch\nSwagger docs: https://www.zefix.admin.ch/ZefixPublicREST/swagger-ui/index.html",
          }],
        };
      }

      const body: Record<string, unknown> = { name, activeOnly: active_only, maxEntries: max_results };
      if (canton) body.canton = canton;

      const resp = await axios.post(`${ZEFIX_BASE}/company/search`, body, {
        auth: { username: user, password: pass },
        headers: { "Content-Type": "application/json" },
      });

      const companies = resp.data.list?.map((c: any) => ({
        name: c.name,
        uid: c.uid,
        chid: c.chid,
        legal_form: c.legalForm?.nameFr || c.legalForm?.nameDe,
        canton: c.canton,
        address: c.address,
        status: c.status,
        purpose: c.purpose,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(companies, null, 2) }],
      };
    }
  );

  server.tool(
    "swiss_company_by_uid",
    "Get full details of a Swiss company by its UID (e.g. CHE-123.456.789). Requires ZEFIX credentials.",
    {
      uid: z.string().describe("Swiss UID in format CHE-123.456.789 or CHE123456789"),
    },
    async ({ uid }) => {
      const user = process.env.ZEFIX_USER;
      const pass = process.env.ZEFIX_PASS;
      if (!user || !pass) {
        return { content: [{ type: "text", text: "Set ZEFIX_USER and ZEFIX_PASS env vars." }] };
      }

      const cleanUid = uid.replace(/[.\-]/g, "").replace("CHE", "CHE-");
      const resp = await axios.get(`${ZEFIX_BASE}/company/uid/${cleanUid}`, {
        auth: { username: user, password: pass },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "swiss_company_publications",
    "Get Swiss Official Gazette (SOGC) publications for a company. Shows registration history, mergers, etc.",
    {
      uid: z.string().describe("Company UID"),
    },
    async ({ uid }) => {
      const user = process.env.ZEFIX_USER;
      const pass = process.env.ZEFIX_PASS;
      if (!user || !pass) {
        return { content: [{ type: "text", text: "Set ZEFIX_USER and ZEFIX_PASS env vars." }] };
      }

      const resp = await axios.get(`${ZEFIX_BASE}/sogcpublication/uid/${uid}`, {
        auth: { username: user, password: pass },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "swiss_opendata_search_datasets",
    "Search the opendata.swiss catalog — 14,000+ official Swiss government datasets. No auth required.",
    {
      query: z.string().describe("Search query, e.g. 'health', 'transport', 'population'"),
      organization: z.string().optional().describe("Filter by org slug, e.g. 'bundesamt-fur-gesundheit-bag'"),
      format: z.enum(["CSV", "JSON", "XML", "GeoJSON", "WMS", "WFS"]).optional(),
      rows: z.number().int().default(10),
    },
    async ({ query, organization, format, rows }) => {
      const fq: string[] = [];
      if (organization) fq.push(`organization:${organization}`);
      if (format) fq.push(`res_format:${format}`);

      const resp = await axios.get(`${CKAN_BASE}/package_search`, {
        params: {
          q: query,
          fq: fq.join(" "),
          rows,
          sort: "score desc",
        },
      });

      const datasets = resp.data.result?.results?.map((d: any) => ({
        title: d.title?.fr || d.title?.de || d.title?.en,
        name: d.name,
        organization: d.organization?.name,
        description: d.notes?.fr?.substring(0, 200),
        formats: d.resources?.map((r: any) => r.format).filter(Boolean),
        download_urls: d.resources?.slice(0, 3).map((r: any) => r.url),
        last_modified: d.metadata_modified,
      }));

      return {
        content: [{ type: "text", text: JSON.stringify({ total: resp.data.result?.count, datasets }, null, 2) }],
      };
    }
  );
}
