import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { registerBusinessTools } from "../src/tools/business.js";
import { createMockServer, parseResult, textResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet  = vi.mocked(axios.get);
const mockedPost = vi.mocked(axios.post);

const ZEFIX_BASE = "https://www.zefix.admin.ch/ZefixPublicREST/api/v1";
const CKAN_BASE  = "https://ckan.opendata.swiss/api/3/action";

function setZefixCreds() {
  process.env.ZEFIX_USER = "testuser";
  process.env.ZEFIX_PASS = "testpass";
}

function clearZefixCreds() {
  delete process.env.ZEFIX_USER;
  delete process.env.ZEFIX_PASS;
}

describe("swiss_company_search", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerBusinessTools(server as any);
    clearZefixCreds();
  });

  afterEach(clearZefixCreds);

  it("returns setup instructions when credentials are missing", async () => {
    const result = await tools["swiss_company_search"]({ name: "Nestlé", active_only: true, max_results: 20 });
    const text = textResult(result);

    expect(mockedPost).not.toHaveBeenCalled();
    expect(text).toContain("ZEFIX_USER");
    expect(text).toContain("zefix.admin.ch");
  });

  it("POSTs to ZEFIX search endpoint with credentials", async () => {
    setZefixCreds();
    const companies = [{ name: "Nestlé S.A.", uid: "CHE-115.635.759", canton: "VD", status: "active" }];
    mockedPost.mockResolvedValueOnce({ data: { list: companies } });

    const result = await tools["swiss_company_search"]({ name: "Nestlé", active_only: true, max_results: 20 });
    const data = parseResult(result) as any;

    expect(mockedPost).toHaveBeenCalledWith(
      `${ZEFIX_BASE}/company/search`,
      expect.objectContaining({ name: "Nestlé", activeOnly: true, maxEntries: 20 }),
      expect.objectContaining({ auth: { username: "testuser", password: "testpass" } }),
    );
    expect(data[0].name).toBe("Nestlé S.A.");
    expect(data[0].uid).toBe("CHE-115.635.759");
  });

  it("includes canton filter when provided", async () => {
    setZefixCreds();
    mockedPost.mockResolvedValueOnce({ data: { list: [] } });

    await tools["swiss_company_search"]({ name: "Roche", canton: "BS", active_only: true, max_results: 10 });

    const body = mockedPost.mock.calls[0][1] as any;
    expect(body.canton).toBe("BS");
  });
});

describe("swiss_company_by_uid", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerBusinessTools(server as any);
    clearZefixCreds();
  });

  afterEach(clearZefixCreds);

  it("returns error message when credentials are missing", async () => {
    const result = await tools["swiss_company_by_uid"]({ uid: "CHE-115.635.759" });
    const text = textResult(result);

    expect(text).toContain("ZEFIX_USER");
  });

  it("calls GET with formatted UID", async () => {
    setZefixCreds();
    mockedGet.mockResolvedValueOnce({ data: { name: "Nestlé S.A.", uid: "CHE-115.635.759" } });

    const result = await tools["swiss_company_by_uid"]({ uid: "CHE-115.635.759" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringContaining("/company/uid/"),
      expect.objectContaining({ auth: { username: "testuser", password: "testpass" } }),
    );
    expect(data.name).toBe("Nestlé S.A.");
  });
});

describe("swiss_company_publications", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerBusinessTools(server as any);
    clearZefixCreds();
  });

  afterEach(clearZefixCreds);

  it("returns error message when credentials are missing", async () => {
    const result = await tools["swiss_company_publications"]({ uid: "CHE-115.635.759" });
    const text = textResult(result);

    expect(text).toContain("ZEFIX_USER");
  });

  it("calls SOGC publications endpoint", async () => {
    setZefixCreds();
    mockedGet.mockResolvedValueOnce({ data: [{ publicationDate: "2020-01-01", type: "INSCRIPTION" }] });

    const result = await tools["swiss_company_publications"]({ uid: "CHE-115.635.759" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(
      expect.stringContaining("/sogcpublication/uid/CHE-115.635.759"),
      expect.anything(),
    );
    expect(data[0].type).toBe("INSCRIPTION");
  });
});

describe("swiss_opendata_search_datasets", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerBusinessTools(server as any);
  });

  it("searches the CKAN catalog and maps results", async () => {
    mockedGet.mockResolvedValueOnce({
      data: {
        result: {
          count: 42,
          results: [
            {
              title: { fr: "Population suisse", de: null },
              name: "population-suisse",
              organization: { name: "bfs" },
              notes: { fr: "Données de population" },
              resources: [{ format: "CSV", url: "https://data.csv" }],
              metadata_modified: "2024-06-01",
            },
          ],
        },
      },
    });

    const result = await tools["swiss_opendata_search_datasets"]({ query: "population", rows: 10 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${CKAN_BASE}/package_search`, expect.anything());
    expect(data.total).toBe(42);
    expect(data.datasets[0].title).toBe("Population suisse");
    expect(data.datasets[0].formats).toContain("CSV");
  });

  it("applies organization and format filters", async () => {
    mockedGet.mockResolvedValueOnce({ data: { result: { results: [] } } });

    await tools["swiss_opendata_search_datasets"]({ query: "health", organization: "bag", format: "CSV", rows: 5 });

    const callParams = mockedGet.mock.calls[0][1] as any;
    expect(callParams.params.fq).toContain("organization:bag");
    expect(callParams.params.fq).toContain("res_format:CSV");
  });
});
