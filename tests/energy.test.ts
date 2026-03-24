import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerEnergyTools } from "../src/tools/energy.js";
import { createMockServer, parseResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";

const mockDataset = (title: string) => ({
  title: { fr: title, de: null },
  name: title.toLowerCase().replace(/ /g, "-"),
  resources: [{ format: "CSV", url: `https://data/${title}.csv` }],
});

describe("swiss_energy_search_datasets", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerEnergyTools(server as any);
  });

  it("filters by SFOE organization", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { results: [mockDataset("Stations de recharge EV")] } },
    });

    const result = await tools["swiss_energy_search_datasets"]({ query: "charging stations", rows: 10 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({ fq: "organization:bundesamt-fur-energie-bfe" }),
    }));
    expect(data.note).toContain("SFOE");
    expect(data.datasets[0].title).toBe("Stations de recharge EV");
  });

  it("deduplicates formats using Set", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          results: [{
            ...mockDataset("Énergie"),
            resources: [
              { format: "CSV", url: "a.csv" },
              { format: "CSV", url: "b.csv" },
              { format: "JSON", url: "c.json" },
            ],
          }],
        },
      },
    });

    const result = await tools["swiss_energy_search_datasets"]({ query: "solar", rows: 5 });
    const data = parseResult(result) as any;

    expect(data.datasets[0].formats).toHaveLength(2);
    expect(data.datasets[0].formats).toContain("CSV");
    expect(data.datasets[0].formats).toContain("JSON");
  });
});

describe("swiss_grid_energy_data", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerEnergyTools(server as any);
  });

  it("filters by Swissgrid organization", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { result: { results: [mockDataset("Production électrique 2024")] } },
    });

    const result = await tools["swiss_grid_energy_data"]({ query: "energy grid" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.objectContaining({
      params: expect.objectContaining({ fq: "organization:swissgrid-ag" }),
    }));
    expect(data.note).toContain("Swissgrid");
    expect(data.datasets[0].title).toBe("Production électrique 2024");
  });
});
