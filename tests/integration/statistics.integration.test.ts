import { describe, it, expect, beforeAll } from "vitest";
import { registerStatisticsTools } from "../../src/tools/statistics.js";
import { createRealServer, parseResult } from "./helpers.js";

// Real HTTP calls to opendata.swiss (BFS/SNB/SEM) + OpenPLZ — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerStatisticsTools(server as any);
});

describe("[REAL API] swiss_statistics_search", () => {
  it("returns BFS datasets for 'population'", async () => {
    const result = await tools["swiss_statistics_search"]({
      query: "population",
      rows: 5,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("total");
    expect(typeof data.total).toBe("number");
    expect(data.total).toBeGreaterThan(0);
    expect(Array.isArray(data.datasets)).toBe(true);
    expect(data.datasets.length).toBeGreaterThan(0);

    const ds = data.datasets[0];
    expect(ds).toHaveProperty("title");
    expect(ds).toHaveProperty("name");
  });

  it("returns datasets for 'unemployment'", async () => {
    const result = await tools["swiss_statistics_search"]({
      query: "unemployment",
      rows: 3,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("total");
  });
});

describe("[REAL API] swiss_snb_financial_data", () => {
  it("returns SNB datasets for 'exchange rates'", async () => {
    const result = await tools["swiss_snb_financial_data"]({
      query: "exchange rates",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("api_endpoint");
    expect(data.api_endpoint).toContain("data.snb.ch");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
  });
});

describe("[REAL API] swiss_postal_data", () => {
  it("returns localities for postal code 1201 (Genève)", async () => {
    const result = await tools["swiss_postal_data"]({ postal_code: "1201" });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("postalCode");
    expect(data[0].postalCode).toBe("1201");
  });

  it("returns localities for municipality 'Bern'", async () => {
    const result = await tools["swiss_postal_data"]({ municipality: "Bern" });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
  });

  it("returns API documentation when no params provided", async () => {
    const result = await tools["swiss_postal_data"]({});
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("api_base");
    expect(data.api_base).toBe("https://openplzapi.org/ch");
    expect(data).toHaveProperty("endpoints");
  });
});

describe("[REAL API] swiss_migration_statistics", () => {
  it("returns SEM migration datasets", async () => {
    const result = await tools["swiss_migration_statistics"]({
      query: "migration",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("note");
    expect(data.note).toContain("sem.admin.ch");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
  });
});
