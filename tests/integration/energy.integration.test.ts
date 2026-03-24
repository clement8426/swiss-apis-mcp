import { describe, it, expect, beforeAll } from "vitest";
import { registerEnergyTools } from "../../src/tools/energy.js";
import { createRealServer, parseResult } from "./helpers.js";

// Real HTTP calls to opendata.swiss (SFOE/BFE + Swissgrid) — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerEnergyTools(server as any);
});

describe("[REAL API] swiss_energy_search_datasets", () => {
  it("returns SFOE datasets for 'solar'", async () => {
    const result = await tools["swiss_energy_search_datasets"]({
      query: "solar",
      rows: 5,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("note");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
    expect(data.note).toContain("SFOE");
  });

  it("returns datasets for 'electricity production'", async () => {
    const result = await tools["swiss_energy_search_datasets"]({
      query: "electricity production",
      rows: 3,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data.datasets)).toBe(true);
  });
});

describe("[REAL API] swiss_grid_energy_data", () => {
  it("returns Swissgrid datasets or empty list", async () => {
    const result = await tools["swiss_grid_energy_data"]({
      query: "energy grid",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("note");
    expect(data.note).toContain("Swissgrid");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
  });
});
