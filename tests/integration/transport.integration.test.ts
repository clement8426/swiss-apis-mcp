import { describe, it, expect, beforeAll } from "vitest";
import { registerTransportTools } from "../../src/tools/transport.js";
import { createRealServer, parseResult, textResult } from "./helpers.js";

// Real HTTP calls to transport.opendata.ch — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerTransportTools(server as any);
});

describe("[REAL API] swiss_transport_stationboard", () => {
  it("returns live departures from Genève-Cornavin", async () => {
    const result = await tools["swiss_transport_stationboard"]({
      station: "Genève",
      limit: 5,
    });
    const data = parseResult(result) as any;

    expect(data).toHaveProperty("station");
    expect(typeof data.station).toBe("string");
    expect(data).toHaveProperty("departures");
    expect(Array.isArray(data.departures)).toBe(true);

    if (data.departures.length > 0) {
      const dep = data.departures[0];
      expect(dep).toHaveProperty("line");
      expect(dep).toHaveProperty("destination");
      expect(dep).toHaveProperty("departure");
      expect(typeof dep.delay).toBe("number");
    }
  });

  it("returns live departures from Zürich HB", async () => {
    const result = await tools["swiss_transport_stationboard"]({
      station: "Zürich HB",
      limit: 3,
    });
    const data = parseResult(result) as any;

    expect(data.station).toBeTruthy();
    expect(data.departures.length).toBeLessThanOrEqual(3);
  });
});

describe("[REAL API] swiss_transport_connections", () => {
  it("returns connections between Bern and Zürich", async () => {
    const result = await tools["swiss_transport_connections"]({
      from: "Bern",
      to: "Zürich HB",
      limit: 2,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const conn = data[0];
    expect(conn).toHaveProperty("departure");
    expect(conn).toHaveProperty("arrival");
    expect(conn).toHaveProperty("duration");
    expect(typeof conn.transfers).toBe("number");
    expect(Array.isArray(conn.sections)).toBe(true);
  });

  it("returns connections with via stop", async () => {
    const result = await tools["swiss_transport_connections"]({
      from: "Genève",
      to: "Bern",
      via: "Lausanne",
      limit: 1,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
  });
});

describe("[REAL API] swiss_transport_station_search", () => {
  it("finds Lausanne station by name", async () => {
    const result = await tools["swiss_transport_station_search"]({
      query: "Lausanne",
      limit: 3,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
    expect(data[0].name).toMatch(/Lausanne/i);
  });

  it("finds stations near Bern by coordinates", async () => {
    const result = await tools["swiss_transport_station_search"]({
      lat: 46.9481,
      lon: 7.4474,
      limit: 3,
    });
    const data = parseResult(result) as any;

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty("name");
  });
});

describe("[REAL API] swiss_transport_gtfs_realtime", () => {
  it("returns setup instructions when no OTD_API_KEY (graceful degradation)", async () => {
    delete process.env.OTD_API_KEY;
    const result = await tools["swiss_transport_gtfs_realtime"]({
      feed_type: "trip_updates",
    });
    const text = textResult(result);

    expect(text).toContain("OTD_API_KEY");
    expect(text).toContain("api-manager.opentransportdata.swiss");
  });
});
