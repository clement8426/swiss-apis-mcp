import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { registerFoodTools } from "../src/tools/food.js";
import { createMockServer, parseResult, textResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const FOODREPO_BASE = "https://www.foodrepo.org/api/v3";

describe("swiss_food_search_products", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerFoodTools(server as any);
    delete process.env.FOODREPO_API_KEY;
  });

  afterEach(() => { delete process.env.FOODREPO_API_KEY; });

  it("returns setup instructions when API key is missing", async () => {
    const result = await tools["swiss_food_search_products"]({ page: 1 });
    const text = textResult(result);

    expect(mockedGet).not.toHaveBeenCalled();
    expect(text).toContain("FOODREPO_API_KEY");
    expect(text).toContain("foodrepo.org");
  });

  it("sends Token auth header with correct format", async () => {
    process.env.FOODREPO_API_KEY = "abc123";
    mockedGet.mockResolvedValueOnce({ data: { data: [] } });

    await tools["swiss_food_search_products"]({ page: 1 });

    expect(mockedGet).toHaveBeenCalledWith(
      `${FOODREPO_BASE}/products`,
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Token token="abc123"' }),
      }),
    );
  });

  it("maps product fields correctly", async () => {
    process.env.FOODREPO_API_KEY = "abc123";
    mockedGet.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 999,
            display_name_translations: { fr: "Gruyère AOP", de: "Gruyère AOP" },
            barcode: "7613034626844",
            brands: ["Migros"],
            nutrients: { energy: 1700 },
            ingredients_text_translations: { fr: "Lait cru, sel" },
            images: [{ medium: { url: "https://img.foodrepo.org/gruyere.jpg" } }],
          },
        ],
      },
    });

    const result = await tools["swiss_food_search_products"]({ page: 1 });
    const data = parseResult(result) as any;

    expect(data[0].id).toBe(999);
    expect(data[0].name_fr).toBe("Gruyère AOP");
    expect(data[0].barcode).toBe("7613034626844");
    expect(data[0].image).toBe("https://img.foodrepo.org/gruyere.jpg");
  });

  it("adds barcode param when provided", async () => {
    process.env.FOODREPO_API_KEY = "abc123";
    mockedGet.mockResolvedValueOnce({ data: { data: [] } });

    await tools["swiss_food_search_products"]({ barcode: "7613034626844", page: 1 });

    const callParams = mockedGet.mock.calls[0][1] as any;
    expect(callParams.params.barcodes).toBe("7613034626844");
  });
});

describe("swiss_food_nutrition_database", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerFoodTools(server as any);
  });

  it("returns FSVO portal info without any HTTP call", async () => {
    const result = await tools["swiss_food_nutrition_database"]({ query: "fondue" });
    const data = parseResult(result) as any;

    expect(mockedGet).not.toHaveBeenCalled();
    expect(data.portal).toBe("https://naehrwertdaten.ch/");
    expect(data.search_hint).toContain("fondue");
  });
});
