import { describe, it, expect, beforeAll } from "vitest";
import { registerFoodTools } from "../../src/tools/food.js";
import { createRealServer, parseResult, textResult } from "./helpers.js";

// FoodRepo requires API key — we test graceful degradation
// Swiss Food Composition DB — no API key, returns static info

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerFoodTools(server as any);
});

describe("[REAL API] swiss_food_search_products", () => {
  it("returns setup instructions when FOODREPO_API_KEY is missing", async () => {
    delete process.env.FOODREPO_API_KEY;

    const result = await tools["swiss_food_search_products"]({ page: 1 });
    const text = textResult(result);

    expect(text).toContain("FOODREPO_API_KEY");
    expect(text).toContain("foodrepo.org");
  });
});

describe("[REAL API] swiss_food_nutrition_database", () => {
  it("returns FSVO portal info for 'gruyère' — no HTTP call", async () => {
    const result = await tools["swiss_food_nutrition_database"]({
      query: "gruyère",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("portal");
    expect(data.portal).toContain("naehrwertdaten.ch");
    expect(data.search_hint).toContain("gruyère");
  });

  it("includes download info in the response", async () => {
    const result = await tools["swiss_food_nutrition_database"]({
      query: "rösti",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("api_info");
    expect(data.api_info).toContain("naehrwertdaten.ch");
  });
});
