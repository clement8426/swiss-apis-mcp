import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

const FOODREPO_BASE = "https://www.foodrepo.org/api/v3";

export function registerFoodTools(server: McpServer) {

  server.tool(
    "swiss_food_search_products",
    "Search Swiss food products in FoodRepo (EPFL open database of barcoded Swiss food products). Requires FOODREPO_API_KEY.",
    {
      query: z.string().optional().describe("Product name or description"),
      barcode: z.string().optional().describe("EAN barcode"),
      page: z.number().int().default(1),
    },
    async ({ query, barcode, page }) => {
      const apiKey = process.env.FOODREPO_API_KEY;
      if (!apiKey) {
        return {
          content: [{
            type: "text",
            text: "FOODREPO_API_KEY not set. Register free at: https://www.foodrepo.org/en/users/sign_up\nDocs: https://www.foodrepo.org/api-docs/swaggers/v3",
          }],
        };
      }

      const params: Record<string, unknown> = { page };
      if (barcode) params.barcodes = barcode;

      const resp = await axios.get(`${FOODREPO_BASE}/products`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token token="${apiKey}"`,
        },
        params,
      });

      const products = resp.data.data?.map((p: any) => ({
        id: p.id,
        name_fr: p.display_name_translations?.fr,
        name_de: p.display_name_translations?.de,
        barcode: p.barcode,
        brands: p.brands,
        nutrients: p.nutrients,
        ingredients: p.ingredients_text_translations?.fr,
        image: p.images?.[0]?.medium?.url,
      }));

      return { content: [{ type: "text", text: JSON.stringify(products, null, 2) }] };
    }
  );

  server.tool(
    "swiss_food_nutrition_database",
    "Search the Swiss Food Composition Database (FSVO) — official nutritional values of foods available in Switzerland.",
    {
      query: z.string().describe("Food name, e.g. 'gruyère', 'fondue', 'rösti'"),
    },
    async ({ query }) => {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            note: "Swiss Food Composition Database (FSVO)",
            portal: "https://naehrwertdaten.ch/",
            api_info: "Download data at: https://naehrwertdaten.ch/de/downloads/",
            search_hint: `Search for '${query}' at https://naehrwertdaten.ch/de/naehrwertsuche/`,
          }, null, 2),
        }],
      };
    }
  );
}
