import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessTools } from "../../src/tools/business.js";
import { createRealServer, parseResult, textResult } from "./helpers.js";

// Real HTTP calls to ZEFIX (needs creds) and opendata.swiss CKAN (free)

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerBusinessTools(server as any);
});

describe("[REAL API] swiss_company_search", () => {
  it("returns setup instructions when ZEFIX credentials are missing", async () => {
    delete process.env.ZEFIX_USER;
    delete process.env.ZEFIX_PASS;

    const result = await tools["swiss_company_search"]({
      name: "Nestlé",
      active_only: true,
      max_results: 5,
    });
    const text = textResult(result);

    expect(text).toContain("ZEFIX_USER");
    expect(text).toContain("zefix.admin.ch");
  });
});

describe("[REAL API] swiss_company_by_uid", () => {
  it("returns instructions when credentials are missing", async () => {
    delete process.env.ZEFIX_USER;
    delete process.env.ZEFIX_PASS;

    const result = await tools["swiss_company_by_uid"]({
      uid: "CHE-115.635.759",
    });
    const text = textResult(result);

    expect(text).toContain("ZEFIX_USER");
  });
});

describe("[REAL API] swiss_opendata_search_datasets", () => {
  it("searches opendata.swiss and returns real datasets", async () => {
    const result = await tools["swiss_opendata_search_datasets"]({
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
    expect(ds).toHaveProperty("formats");
  });

  it("filters by organization and returns relevant results", async () => {
    const result = await tools["swiss_opendata_search_datasets"]({
      query: "transport",
      organization: "schweizerische-bundesbahnen-sbb",
      rows: 3,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("total");
    expect(Array.isArray(data.datasets)).toBe(true);
  });
});
