import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerTransportTools } from "../src/tools/transport.js";
import { createMockServer, parseResult, textResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const TRANSPORT_BASE = "https://transport.opendata.ch/v1";
const OTD_BASE = "https://api.opentransportdata.swiss";

describe("swiss_transport_stationboard", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerTransportTools(server as any);
  });

  it("returns mapped departures with station name", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        station: { name: "Genève" },
        stationboard: [
          {
            name: "IR 90",
            to: "Zürich HB",
            category: "IR",
            stop: { departure: "2026-03-24T10:00:00+01:00", delay: 0, platform: "3" },
          },
          {
            name: "S1",
            to: "Lausanne",
            category: "S",
            stop: { departure: "2026-03-24T10:05:00+01:00", delay: 2, platform: "5" },
          },
        ],
      },
    });

    const result = await tools["swiss_transport_stationboard"]({ station: "Genève", limit: 10 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${TRANSPORT_BASE}/stationboard`, expect.objectContaining({
      params: expect.objectContaining({ station: "Genève", limit: 10 }),
    }));
    expect(data.station).toBe("Genève");
    expect(data.departures).toHaveLength(2);
    expect(data.departures[0]).toMatchObject({ line: "IR 90", destination: "Zürich HB", delay: 0, platform: "3" });
    expect(data.departures[1].delay).toBe(2);
  });

  it("respects the limit parameter", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        station: { name: "Bern" },
        stationboard: Array.from({ length: 20 }, (_, i) => ({
          name: `Train ${i}`,
          to: "Dest",
          category: "IC",
          stop: { departure: "2026-03-24T10:00:00+01:00", delay: 0, platform: "1" },
        })),
      },
    });

    const result = await tools["swiss_transport_stationboard"]({ station: "Bern", limit: 5 });
    const data = parseResult(result) as any;

    expect(data.departures).toHaveLength(5);
  });

  it("handles empty stationboard", async () => {
    mockedGet.mockResolvedValueOnce({ data: { station: { name: "Nowhere" }, stationboard: [] } });

    const result = await tools["swiss_transport_stationboard"]({ station: "Nowhere", limit: 10 });
    const data = parseResult(result) as any;

    expect(data.departures).toHaveLength(0);
  });
});

describe("swiss_transport_connections", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerTransportTools(server as any);
  });

  it("maps connections with sections", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        connections: [
          {
            from: { departure: "2026-03-24T10:00:00+01:00" },
            to: { arrival: "2026-03-24T11:30:00+01:00" },
            duration: "01d00:01:30:00",
            transfers: 0,
            products: ["IC"],
            sections: [
              {
                departure: { station: { name: "Genève" } },
                arrival: { station: { name: "Zürich HB" } },
                journey: { name: "IC 1", category: "IC" },
              },
            ],
          },
        ],
      },
    });

    const result = await tools["swiss_transport_connections"]({ from: "Genève", to: "Zürich HB", limit: 3 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${TRANSPORT_BASE}/connections`, expect.objectContaining({
      params: expect.objectContaining({ from: "Genève", to: "Zürich HB", limit: 3 }),
    }));
    expect(data).toHaveLength(1);
    expect(data[0].transfers).toBe(0);
    expect(data[0].sections[0].departure).toBe("Genève");
  });

  it("includes via parameter when provided", async () => {
    mockedGet.mockResolvedValueOnce({ data: { connections: [] } });

    await tools["swiss_transport_connections"]({ from: "Genève", to: "Bern", via: "Lausanne", limit: 3 });

    expect(mockedGet).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      params: expect.objectContaining({ via: "Lausanne" }),
    }));
  });

  it("omits via parameter when not provided", async () => {
    mockedGet.mockResolvedValueOnce({ data: { connections: [] } });

    await tools["swiss_transport_connections"]({ from: "Genève", to: "Bern", limit: 3 });

    const callParams = mockedGet.mock.calls[0][1] as any;
    expect(callParams.params).not.toHaveProperty("via");
  });
});

describe("swiss_transport_station_search", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerTransportTools(server as any);
  });

  it("searches by name", async () => {
    const stations = [{ id: "8501026", name: "Genève" }];
    mockedGet.mockResolvedValueOnce({ data: { stations } });

    const result = await tools["swiss_transport_station_search"]({ query: "Genève", limit: 5 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${TRANSPORT_BASE}/locations`, expect.objectContaining({
      params: expect.objectContaining({ query: "Genève" }),
    }));
    expect(data[0].name).toBe("Genève");
  });

  it("searches by coordinates", async () => {
    mockedGet.mockResolvedValueOnce({ data: { stations: [] } });

    await tools["swiss_transport_station_search"]({ lat: 46.2, lon: 6.15, limit: 3 });

    const callParams = mockedGet.mock.calls[0][1] as any;
    expect(callParams.params).toMatchObject({ x: 6.15, y: 46.2 });
  });
});

describe("swiss_transport_gtfs_realtime", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerTransportTools(server as any);
    delete process.env.OTD_API_KEY;
  });

  it("returns instructions when OTD_API_KEY is not set", async () => {
    const result = await tools["swiss_transport_gtfs_realtime"]({ feed_type: "trip_updates" });
    const text = textResult(result);

    expect(mockedGet).not.toHaveBeenCalled();
    expect(text).toContain("OTD_API_KEY");
    expect(text).toContain("api-manager.opentransportdata.swiss");
  });

  it("calls the trip_updates endpoint with Bearer auth when key is set", async () => {
    process.env.OTD_API_KEY = "test-key-123";
    mockedGet.mockResolvedValueOnce({ data: Buffer.from("binary"), byteLength: 6 });

    await tools["swiss_transport_gtfs_realtime"]({ feed_type: "trip_updates" });

    expect(mockedGet).toHaveBeenCalledWith(
      `${OTD_BASE}/gtfsrttripupdates/v1`,
      expect.objectContaining({
        headers: { Authorization: "Bearer test-key-123" },
      }),
    );
    delete process.env.OTD_API_KEY;
  });

  it("calls the vehicle_positions endpoint", async () => {
    process.env.OTD_API_KEY = "test-key";
    mockedGet.mockResolvedValueOnce({ data: Buffer.alloc(0), byteLength: 0 });

    await tools["swiss_transport_gtfs_realtime"]({ feed_type: "vehicle_positions" });

    expect(mockedGet).toHaveBeenCalledWith(
      `${OTD_BASE}/gtfsrtvehicleposition/v1`,
      expect.anything(),
    );
    delete process.env.OTD_API_KEY;
  });
});
