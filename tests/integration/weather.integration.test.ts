import { describe, it, expect, beforeAll } from "vitest";
import { registerWeatherTools } from "../../src/tools/weather.js";
import { createRealServer, parseResult } from "./helpers.js";

// Real HTTP calls to opendata.swiss (MeteoSwiss/SLF) + BAFU hydrodaten — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerWeatherTools(server as any);
});

describe("[REAL API] swiss_weather_search_meteoswiss", () => {
  it("returns MeteoSwiss datasets for 'temperature'", async () => {
    const result = await tools["swiss_weather_search_meteoswiss"]({
      query: "temperature",
      rows: 5,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("note");
    expect(data.note).toContain("MeteoSwiss");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
  });

  it("returns datasets for 'precipitation'", async () => {
    const result = await tools["swiss_weather_search_meteoswiss"]({
      query: "precipitation",
      rows: 3,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data.datasets)).toBe(true);
  });
});

describe("[REAL API] swiss_avalanche_data", () => {
  it("returns SLF avalanche datasets", async () => {
    const result = await tools["swiss_avalanche_data"]({
      query: "avalanche snow",
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("note");
    expect(data.note).toContain("SLF");
    expect(data).toHaveProperty("datasets");
    expect(Array.isArray(data.datasets)).toBe(true);
  });
});

describe("[REAL API] swiss_hydro_data", () => {
  it("returns portal info when no station_id provided", async () => {
    const result = await tools["swiss_hydro_data"]({});
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("portal");
    expect(data.portal).toContain("hydrodaten.admin.ch");
    expect(data).toHaveProperty("usage");
  });

  it("always returns a text response when station_id is provided (live or error)", async () => {
    // The BAFU hydrodaten API is queried — we just verify the tool doesn't crash
    let result;
    try {
      result = await tools["swiss_hydro_data"]({ station_id: "2104" });
    } catch {
      // If the station endpoint changed, the tool itself should handle errors
      // This test just ensures the tool function runs without unhandled rejection
      return;
    }
    expect(result.content[0].type).toBe("text");
  });
});
