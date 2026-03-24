import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerHealthTools } from "../src/tools/health.js";
import { createMockServer, parseResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

const mockDataset = {
  title: { fr: "Données COVID-19", de: "COVID-19-Daten" },
  name: "covid-19-schweiz",
  notes: { fr: "Description des données COVID-19 pour la Suisse." },
  resources: [
    { format: "CSV", url: "https://opendata.swiss/dataset/covid.csv", last_modified: "2024-01-01" },
    { format: "JSON", url: "https://opendata.swiss/dataset/covid.json", last_modified: "2024-01-01" },
  ],
};

describe("swiss_health_search_datasets", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerHealthTools(server as any);
  });

  it("filters by BAG organization and maps results", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { results: [mockDataset] } },
    });

    const result = await tools["swiss_health_search_datasets"]({ query: "covid", rows: 10 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({
        q: "covid",
        fq: "organization:bundesamt-fur-gesundheit-bag",
      }),
    }));
    expect(data[0].title).toBe("Données COVID-19");
    expect(data[0].name).toBe("covid-19-schweiz");
    expect(data[0].formats).toContain("CSV");
  });

  it("uses French title when available", async () => {
    mockedGet.mockResolvedValueOnce({ data: { result: { results: [mockDataset] } } });

    const result = await tools["swiss_health_search_datasets"]({ query: "test", rows: 5 });
    const data = parseResult(result) as any;

    expect(data[0].title).toBe("Données COVID-19");
  });

  it("truncates description to 300 chars", async () => {
    const longDesc = "x".repeat(500);
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          results: [{ ...mockDataset, notes: { fr: longDesc } }],
        },
      },
    });

    const result = await tools["swiss_health_search_datasets"]({ query: "test", rows: 5 });
    const data = parseResult(result) as any;

    expect(data[0].description.length).toBeLessThanOrEqual(300);
  });
});

describe("swiss_health_get_dataset", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerHealthTools(server as any);
  });

  it("returns title, description and resource list", async () => {
    mockedGet.mockResolvedValueOnce({ data: { result: mockDataset } });

    const result = await tools["swiss_health_get_dataset"]({ dataset_slug: "covid-19-schweiz" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_show`, expect.objectContaining({
      params: { id: "covid-19-schweiz" },
    }));
    expect(data.title.fr).toBe("Données COVID-19");
    expect(data.resources).toHaveLength(2);
    expect(data.resources[0].format).toBe("CSV");
    expect(data.resources[0].url).toContain("covid.csv");
  });
});

describe("swiss_health_get_versorgungsatlas", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerHealthTools(server as any);
  });

  it("includes source URL and dataset list", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { results: [mockDataset] } },
    });

    const result = await tools["swiss_health_get_versorgungsatlas"]({ indicator: "mortalite" });
    const data = parseResult(result) as any;

    expect(data.source).toBe("https://www.versorgungsatlas.ch/");
    expect(data.datasets).toHaveLength(1);
    expect(data.datasets[0].title).toBe("Données COVID-19");
  });
});
