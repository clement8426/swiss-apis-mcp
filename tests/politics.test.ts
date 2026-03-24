import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerPoliticsTools } from "../src/tools/politics.js";
import { createMockServer, parseResult, textResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const CKAN_BASE = "https://ckan.opendata.swiss/api/3/action";
const PARLDATA_BASE = "https://api.openparldata.ch";

describe("swiss_parliament_search", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerPoliticsTools(server as any);
  });

  it("returns OpenParlData results on success", async () => {
    const parlData = { count: 2, results: [{ id: 1, title: "Motion climat" }] };
    mockedGet.mockResolvedValueOnce({ data: parlData });

    const result = await tools["swiss_parliament_search"]({ query: "climate", limit: 10 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${PARLDATA_BASE}/business`, expect.objectContaining({
      params: expect.objectContaining({ q: "climate" }),
    }));
    expect(data.count).toBe(2);
  });

  it("passes parliament filter when provided", async () => {
    mockedGet.mockResolvedValueOnce({ data: { results: [] } });

    await tools["swiss_parliament_search"]({ query: "health", parliament: "GE", limit: 5 });

    const callParams = mockedGet.mock.calls[0][1] as any;
    expect(callParams.params.parliament).toBe("GE");
  });

  it("falls back to CKAN when OpenParlData fails", async () => {
    mockedGet
      .mockRejectedValueOnce(new Error("Service unavailable"))
      .mockResolvedValueOnce({
        data: { result: { results: [{ title: { fr: "Parlement fédéral" }, resources: [] }] } },
      });

    const result = await tools["swiss_parliament_search"]({ query: "health", limit: 5 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(data.note).toContain("OpenParlData");
    expect(data.fallback_results).toHaveLength(1);
  });
});

describe("swiss_parliament_persons", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerPoliticsTools(server as any);
  });

  it("returns persons from OpenParlData", async () => {
    const persons = [{ id: 42, name: "Ada Lovelace", parliament: "ch" }];
    mockedGet.mockResolvedValueOnce({ data: persons });

    const result = await tools["swiss_parliament_persons"]({ parliament: "ch", limit: 20 });
    const data = parseResult(result) as any;

    expect(data[0].name).toBe("Ada Lovelace");
  });

  it("returns API documentation when OpenParlData fails", async () => {
    mockedGet.mockRejectedValueOnce(new Error("503"));

    const result = await tools["swiss_parliament_persons"]({ parliament: "ch", limit: 10 });
    const data = parseResult(result) as any;

    expect(data.api_docs).toContain("openparldata.ch");
    expect(data.note).toBeTruthy();
  });
});

describe("swiss_federal_law_search", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerPoliticsTools(server as any);
  });

  it("returns SPARQL bindings on success", async () => {
    const bindings = [{ uri: { value: "https://fedlex.data.admin.ch/eli/cc/27/317" }, title: { value: "Code civil" } }];
    mockedGet.mockResolvedValueOnce({ data: { results: { bindings } } });

    const result = await tools["swiss_federal_law_search"]({ query: "code civil" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(
      "https://fedlex.data.admin.ch/sparqlendpoint",
      expect.objectContaining({ params: expect.objectContaining({ format: "json" }) }),
    );
    expect(data[0].title.value).toBe("Code civil");
  });

  it("returns Fedlex portal info when SPARQL fails", async () => {
    mockedGet.mockRejectedValueOnce(new Error("SPARQL timeout"));

    const result = await tools["swiss_federal_law_search"]({ query: "assurance maladie" });
    const data = parseResult(result) as any;

    expect(data.portal).toBe("https://www.fedlex.admin.ch/");
    expect(data.search_hint).toContain("assurance maladie");
  });
});
