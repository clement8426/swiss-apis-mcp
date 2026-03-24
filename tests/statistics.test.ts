import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerStatisticsTools } from "../src/tools/statistics.js";
import { createMockServer, parseResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

const mockDataset = (title: string) => ({
  title: { fr: title, de: null },
  name: title.toLowerCase().replace(/ /g, "-"),
  notes: { fr: `Description de ${title}` },
  resources: [{ format: "CSV", url: `https://data/${title}.csv` }],
});

describe("swiss_statistics_search", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerStatisticsTools(server as any);
  });

  it("filters by BFS organization and returns count", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { count: 150, results: [mockDataset("Population résidante")] } },
    });

    const result = await tools["swiss_statistics_search"]({ query: "population", rows: 10 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({ fq: "organization:bundesamt-fur-statistik-bfs" }),
    }));
    expect(data.total).toBe(150);
    expect(data.datasets[0].title).toBe("Population résidante");
  });

  it("truncates description to 250 chars", async () => {
    const longNotes = "x".repeat(400);
    mockedGet.mockResolvedValueOnce({
      data: { result: { count: 1, results: [{ ...mockDataset("Test"), notes: { fr: longNotes } }] } },
    });

    const result = await tools["swiss_statistics_search"]({ query: "test", rows: 5 });
    const data = parseResult(result) as any;

    expect(data.datasets[0].description.length).toBeLessThanOrEqual(250);
  });
});

describe("swiss_snb_financial_data", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerStatisticsTools(server as any);
  });

  it("filters by SNB organization and includes API endpoint", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { results: [mockDataset("Taux de change EUR/CHF")] } },
    });

    const result = await tools["swiss_snb_financial_data"]({ query: "exchange rates EUR/CHF" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({ fq: "organization:schweizerische-nationalbank-snb" }),
    }));
    expect(data.api_endpoint).toBe("https://data.snb.ch/api");
    expect(data.datasets[0].title).toBe("Taux de change EUR/CHF");
  });
});

describe("swiss_postal_data", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerStatisticsTools(server as any);
  });

  it("fetches by postal code when provided", async () => {
    mockedGet.mockResolvedValueOnce({ data: [{ postalCode: "1201", name: "Genève" }] });

    const result = await tools["swiss_postal_data"]({ postal_code: "1201" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(
      "https://openplzapi.org/ch/Localities",
      expect.objectContaining({ params: { postalCode: "1201" } }),
    );
    expect(data[0].postalCode).toBe("1201");
  });

  it("fetches by municipality name when provided", async () => {
    mockedGet.mockResolvedValueOnce({ data: [{ name: "Zürich" }] });

    const result = await tools["swiss_postal_data"]({ municipality: "Zürich" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(
      "https://openplzapi.org/ch/Localities",
      expect.objectContaining({ params: { name: "Zürich" } }),
    );
    expect(data[0].name).toBe("Zürich");
  });

  it("returns API documentation when no params are provided", async () => {
    const result = await tools["swiss_postal_data"]({});
    const data = parseResult(result) as any;

    expect(mockedGet).not.toHaveBeenCalled();
    expect(data.api_base).toBe("https://openplzapi.org/ch");
    expect(data.endpoints).toHaveProperty("localities");
    expect(data.endpoints).toHaveProperty("cantons");
    expect(data.endpoints).toHaveProperty("streets");
  });
});

describe("swiss_migration_statistics", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerStatisticsTools(server as any);
  });

  it("filters by SEM organization and includes portal link", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { results: [mockDataset("Statistiques migrations 2024")] } },
    });

    const result = await tools["swiss_migration_statistics"]({ query: "migration" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({ fq: "organization:staatssekretariat-fur-migration-sem" }),
    }));
    expect(data.note).toContain("sem.admin.ch");
    expect(data.datasets[0].title).toBe("Statistiques migrations 2024");
  });
});
