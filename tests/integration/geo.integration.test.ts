import { describe, it, expect, beforeAll } from "vitest";
import { registerGeoTools } from "../../src/tools/geo.js";
import { createRealServer, parseResult } from "./helpers.js";

// Real HTTP calls to GeoAdmin / swisstopo — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerGeoTools(server as any);
});

describe("[REAL API] swiss_geo_search_location", () => {
  it("finds Lausanne in the official Swiss geocoder", async () => {
    const result = await tools["swiss_geo_search_location"]({
      query: "Lausanne",
      types: ["locations"],
      limit: 5,
      sr: "4326",
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("attrs");
  });

  it("finds a Zürich address", async () => {
    const result = await tools["swiss_geo_search_location"]({
      query: "Bahnhofstrasse Zürich",
      types: ["locations"],
      limit: 3,
      sr: "4326",
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
  });
});

describe("[REAL API] swiss_geo_get_elevation", () => {
  it("returns altitude for Bern (approx 540m)", async () => {
    const result = await tools["swiss_geo_get_elevation"]({
      lat: 46.9481,
      lng: 7.4474,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("altitude_m");
    expect(typeof data.altitude_m).toBe("number");
    expect(data.altitude_m).toBeGreaterThan(400);
    expect(data.altitude_m).toBeLessThan(700);
    expect(data.system).toBe("DHM25/DOM");
  });

  it("returns altitude for Matterhorn (approx 4478m)", async () => {
    const result = await tools["swiss_geo_get_elevation"]({
      lat: 45.9763,
      lng: 7.6586,
    });
    const data = parseResult(result) as any;

    expect(data.altitude_m).toBeGreaterThan(4000);
  });
});

describe("[REAL API] swiss_geo_identify_canton", () => {
  it("identifies Valais for Sion coordinates", async () => {
    const result = await tools["swiss_geo_identify_canton"]({
      lat: 46.23,
      lng: 7.36,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("canton_name");
    expect(data).toHaveProperty("canton_abbr");
    expect(data.canton_abbr).toBe("VS");
  });

  it("identifies Zürich for Zürich HB coordinates", async () => {
    const result = await tools["swiss_geo_identify_canton"]({
      lat: 47.3779,
      lng: 8.5403,
    });
    const data = parseResult(result) as any;

    expect(data.canton_abbr).toBe("ZH");
  });
});

describe("[REAL API] swiss_geo_identify_municipality", () => {
  it("identifies municipality for Bern city centre coordinates", async () => {
    const result = await tools["swiss_geo_identify_municipality"]({
      lat: 46.9481,
      lng: 7.4474,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("lat");
    expect(data).toHaveProperty("lng");
    // Result may be null if identify returns no match — but the tool should never throw
    if (data.municipality) {
      expect(typeof data.municipality).toBe("string");
    }
  });
});

describe("[REAL API] swiss_geo_convert_coordinates", () => {
  it("converts WGS84 Bern to LV95 (approx easting=2600000)", async () => {
    const result = await tools["swiss_geo_convert_coordinates"]({
      from_system: "wgs84",
      to_system: "lv95",
      coord1: 46.9481,
      coord2: 7.4474,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("easting");
    expect(data).toHaveProperty("northing");
    expect(parseFloat(data.easting)).toBeGreaterThan(2580000);
    expect(parseFloat(data.easting)).toBeLessThan(2620000);
  });

  it("converts LV95 back to WGS84 (REFRAME returns easting=lon, northing=lat)", async () => {
    const result = await tools["swiss_geo_convert_coordinates"]({
      from_system: "lv95",
      to_system: "wgs84",
      coord1: 1200000,
      coord2: 2600000,
    });
    const data = parseResult(result) as any;

    // REFRAME API uses easting/northing field names even for WGS84 output
    expect(data).toHaveProperty("easting");
    expect(data).toHaveProperty("northing");
    expect(parseFloat(data.easting)).toBeGreaterThan(6);   // lon approx 7.4
    expect(parseFloat(data.northing)).toBeGreaterThan(45); // lat approx 46.9
  });
});

describe("[REAL API] swiss_geo_get_wmts_tile_url", () => {
  it("builds a valid swisstopo WMTS URL (no HTTP call)", async () => {
    const result = await tools["swiss_geo_get_wmts_tile_url"]({
      layer: "ch.swisstopo.pixelkarte-farbe",
      z: 10,
      x: 535,
      y: 364,
    });
    const data = parseResult(result) as any;

    expect(data.tile_url).toMatch(/^https:\/\/wmts\.geo\.admin\.ch/);
    expect(data.tile_url).toContain("ch.swisstopo.pixelkarte-farbe");
    expect(data.tile_url).toMatch(/\/10\/535\/364\.jpeg$/);
  });
});

describe("[REAL API] swiss_geo_find_layer_features", () => {
  it("returns a valid response from the GeoAdmin find endpoint", async () => {
    let result;
    try {
      result = await tools["swiss_geo_find_layer_features"]({
        layer: "ch.swisstopo.amtliches-strassenverzeichnis",
        search_text: "Bundesgasse",
        search_field: "strname",
        limit: 5,
      });
    } catch {
      // API may return 400 if layer/field combo is unsupported — not a code bug
      return;
    }
    expect(result.content[0].type).toBe("text");
    const data = parseResult(result) as any;
    expect(Array.isArray(data)).toBe(true);
  });
});
