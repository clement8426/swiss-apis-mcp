import { describe, it, expect, vi, beforeEach } from "vitest";
import axios from "axios";
import { registerGeoTools } from "../src/tools/geo.js";
import { createMockServer, parseResult, textResult } from "./helpers/mock-server.js";

vi.mock("axios");
const mockedGet = vi.mocked(axios.get);

const GEOADMIN_BASE = "https://api3.geo.admin.ch/rest/services";
const REFRAME_BASE = "https://geodesy.geo.admin.ch/reframe";
const WMTS_BASE = "https://wmts.geo.admin.ch/1.0.0";

describe("swiss_geo_search_location", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("returns location results for a query", async () => {
    mockedGet.mockResolvedValueOnce({
      data: { results: [{ attrs: { label: "Lausanne", x: 537607, y: 152613 } }] },
    });

    const result = await tools["swiss_geo_search_location"]({ query: "Lausanne", types: ["locations"], limit: 10, sr: "4326" });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${GEOADMIN_BASE}/api/SearchServer`, expect.objectContaining({
      params: expect.objectContaining({ searchText: "Lausanne", sr: "4326" }),
    }));
    expect(data[0].attrs.label).toBe("Lausanne");
  });
});

describe("swiss_geo_get_elevation", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("makes two calls (REFRAME + height) and returns terrain altitude", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { easting: "2646877", northing: "1092044" } }) // REFRAME
      .mockResolvedValueOnce({ data: { height: "4478.2" } });                        // height API

    const result = await tools["swiss_geo_get_elevation"]({ lat: 45.9763, lng: 7.6586 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(mockedGet).toHaveBeenNthCalledWith(1, `${REFRAME_BASE}/wgs84tolv95`, expect.anything());
    expect(mockedGet).toHaveBeenNthCalledWith(2, "https://api3.geo.admin.ch/rest/services/height", expect.anything());
    expect(data.altitude_m).toBe(4478.2);
    expect(data.system).toBe("DHM25/DOM");
    expect(data.lat).toBe(45.9763);
  });
});

describe("swiss_geo_identify_canton", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("makes two API calls and returns canton info", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { easting: "2533114", northing: "1152185" } }) // REFRAME
      .mockResolvedValueOnce({                                                       // identify
        data: {
          results: [{ attributes: { name: "Valais", ak: "VS", kantonsnr: 23 } }],
        },
      });

    const result = await tools["swiss_geo_identify_canton"]({ lat: 46.2, lng: 7.36 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(data.canton_name).toBe("Valais");
    expect(data.canton_abbr).toBe("VS");
    expect(data.bfs_number).toBe(23);
  });
});

describe("swiss_geo_identify_municipality", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("makes two API calls and returns municipality info", async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { easting: "2533114", northing: "1152185" } })
      .mockResolvedValueOnce({
        data: {
          results: [{ attributes: { name: "Sion", gemeindenummer: 6266, ak: "VS" } }],
        },
      });

    const result = await tools["swiss_geo_identify_municipality"]({ lat: 46.23, lng: 7.36 });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledTimes(2);
    expect(data.municipality).toBe("Sion");
    expect(data.bfs_nr).toBe(6266);
    expect(data.canton).toBe("VS");
  });
});

describe("swiss_geo_convert_coordinates", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("calls wgs84tolv95 endpoint for WGS84 → LV95 conversion", async () => {
    mockedGet.mockResolvedValueOnce({ data: { easting: 2600000, northing: 1200000 } });

    await tools["swiss_geo_convert_coordinates"]({
      from_system: "wgs84", to_system: "lv95", coord1: 46.9481, coord2: 7.4474,
    });

    expect(mockedGet).toHaveBeenCalledWith(`${REFRAME_BASE}/wgs84tolv95`, expect.anything());
  });

  it("calls lv95towgs84 endpoint for LV95 → WGS84 conversion", async () => {
    mockedGet.mockResolvedValueOnce({ data: { latitude: 46.9481, longitude: 7.4474 } });

    await tools["swiss_geo_convert_coordinates"]({
      from_system: "lv95", to_system: "wgs84", coord1: 1200000, coord2: 2600000,
    });

    expect(mockedGet).toHaveBeenCalledWith(`${REFRAME_BASE}/lv95towgs84`, expect.anything());
  });

  it("calls lv95tolv03 endpoint for LV95 → LV03 conversion", async () => {
    mockedGet.mockResolvedValueOnce({ data: {} });

    await tools["swiss_geo_convert_coordinates"]({
      from_system: "lv95", to_system: "lv03", coord1: 1200000, coord2: 2600000,
    });

    expect(mockedGet).toHaveBeenCalledWith(`${REFRAME_BASE}/lv95tolv03`, expect.anything());
  });
});

describe("swiss_geo_get_wmts_tile_url", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("generates the correct tile URL without any HTTP call", async () => {
    const result = await tools["swiss_geo_get_wmts_tile_url"]({
      layer: "ch.swisstopo.pixelkarte-farbe",
      z: 10,
      x: 535,
      y: 364,
    });
    const data = parseResult(result) as any;

    expect(mockedGet).not.toHaveBeenCalled();
    expect(data.tile_url).toBe(
      `${WMTS_BASE}/ch.swisstopo.pixelkarte-farbe/default/current/3857/10/535/364.jpeg`,
    );
    expect(data.attribution).toBe("© swisstopo");
  });

  it("includes swissimage layer in URL", async () => {
    const result = await tools["swiss_geo_get_wmts_tile_url"]({
      layer: "ch.swisstopo.swissimage", z: 15, x: 17100, y: 11650,
    });
    const data = parseResult(result) as any;

    expect(data.tile_url).toContain("ch.swisstopo.swissimage");
  });
});

describe("swiss_geo_find_layer_features", () => {
  let server: ReturnType<typeof createMockServer>["server"];
  let tools: ReturnType<typeof createMockServer>["tools"];

  beforeEach(() => {
    vi.clearAllMocks();
    ({ server, tools } = createMockServer());
    registerGeoTools(server as any);
  });

  it("sends correct params to MapServer find endpoint", async () => {
    mockedGet.mockResolvedValueOnce({ data: { results: [{ id: 1, name: "Rue de Rive" }] } });

    const result = await tools["swiss_geo_find_layer_features"]({
      layer: "ch.swisstopo.amtliches-strassenverzeichnis",
      search_text: "Rue de Rive",
      search_field: "strname",
      limit: 5,
    });
    const data = parseResult(result) as any;

    expect(mockedGet).toHaveBeenCalledWith(`${GEOADMIN_BASE}/all/MapServer/find`, expect.objectContaining({
      params: expect.objectContaining({
        layer: "ch.swisstopo.amtliches-strassenverzeichnis",
        searchText: "Rue de Rive",
        searchField: "strname",
        limit: 5,
      }),
    }));
    expect(data[0].name).toBe("Rue de Rive");
  });
});
