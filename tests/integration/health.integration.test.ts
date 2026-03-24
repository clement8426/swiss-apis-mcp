import { describe, it, expect, beforeAll } from "vitest";
import { registerHealthTools } from "../../src/tools/health.js";
import { createRealServer, parseResult } from "./helpers.js";

// Real HTTP calls to opendata.swiss (BAG/OFSP) — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerHealthTools(server as any);
});

describe("[REAL API] swiss_health_search_datasets", () => {
  it("returns BAG datasets for query 'covid'", async () => {
    const result = await tools["swiss_health_search_datasets"]({
      query: "covid",
      rows: 5,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const dataset = data[0];
    expect(dataset).toHaveProperty("title");
    expect(dataset).toHaveProperty("name");
    expect(dataset).toHaveProperty("formats");
    expect(Array.isArray(dataset.formats)).toBe(true);
  });

  it("returns datasets for query 'influenza'", async () => {
    const result = await tools["swiss_health_search_datasets"]({
      query: "influenza",
      rows: 3,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
  });
});

describe("[REAL API] swiss_health_get_dataset", () => {
  it("returns metadata for a known BAG dataset slug", async () => {
    const result = await tools["swiss_health_get_dataset"]({
      dataset_slug: "covid-19-schweiz",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("title");
    expect(data).toHaveProperty("resources");
    expect(Array.isArray(data.resources)).toBe(true);

    if (data.resources.length > 0) {
      expect(data.resources[0]).toHaveProperty("format");
      expect(data.resources[0]).toHaveProperty("url");
    }
  });
});

describe("[REAL API] swiss_health_get_versorgungsatlas", () => {
  it("returns health atlas data with source URL", async () => {
    const result = await tools["swiss_health_get_versorgungsatlas"]({
      indicator: "mortalite",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("source");
    expect(data.source).toContain("versorgungsatlas.ch");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
  });
});
