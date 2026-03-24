import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerWeatherTools } from "../src/tools/weather.js";
import { createMockServer, parseResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const CKAN_BASE  = "https://ckan.opendata.swiss/api/3/action";
const HYDRO_BASE = "https://www.hydrodaten.admin.ch";

describe("swiss_weather_search_meteoswiss", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerWeatherTools(server as any);
  });

  it("filters by MeteoSwiss organization and includes portal note", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          results: [{
            title: { fr: "Températures journalières", de: null },
            name: "temperatures",
            resources: [{ format: "CSV", url: "https://data/temp.csv" }],
          }],
        },
      },
    });

    const result = await tools["swiss_weather_search_meteoswiss"]({ query: "temperature", rows: 5 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({
        fq: "organization:bundesamt-fur-meteorologie-und-klimatologie-meteoschweiz",
      }),
    }));
    expect(data.note).toContain("MeteoSwiss");
    expect(data.datasets[0].title).toBe("Températures journalières");
  });
});

describe("swiss_avalanche_data", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerWeatherTools(server as any);
  });

  it("filters by SLF organization and includes portal link", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          results: [{
            title: { fr: "Données nivologiques", de: null },
            resources: [{ url: "https://slf.ch/data.csv" }],
          }],
        },
      },
    });

    const result = await tools["swiss_avalanche_data"]({ query: "snow depth" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({ fq: "organization:slf-wsl" }),
    }));
    expect(data.note).toContain("SLF");
    expect(data.datasets[0].title).toBe("Données nivologiques");
  });
});

describe("swiss_hydro_data", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerWeatherTools(server as any);
  });

  it("fetches station data when station_id is provided", async () => {
    const stationData = { station: "2104", value: 45.3, unit: "m3/s" };
    mockedGet.mockResolvedValueOnce({ data: stationData });

    const result = await tools["swiss_hydro_data"]({ station_id: "2104" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(
      `${HYDRO_BASE}/de/zustand/messdaten/messdaten.json`,
      expect.objectContaining({ params: { station: "2104" } }),
    );
    expect(data.station).toBe("2104");
  });

  it("returns portal information when no station_id is provided", async () => {
    const result = await tools["swiss_hydro_data"]({});
    const data = parseResult(result) as any;

    expect(mockedGet).not.toHaveBeenCalled();
    expect(data.portal).toBe("https://www.hydrodaten.admin.ch/");
    expect(data.usage).toBeTruthy();
  });
});
