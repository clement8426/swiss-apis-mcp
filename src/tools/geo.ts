import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

// All swisstopo/GeoAdmin APIs are FREE with NO API KEY
const GEOADMIN_BASE = "https://api3.geo.admin.ch/rest/services";
const REFRAME_BASE  = "https://geodesy.geo.admin.ch/reframe";
const WMTS_BASE     = "https://wmts.geo.admin.ch/1.0.0";

export function registerGeoTools(server: McpServer) {

  server.tool(
    "swiss_geo_search_location",
    "Search for any Swiss location: cities, addresses, communes, postal codes, points of interest.",
    {
      query: z.string().describe("Search text, e.g. 'Lausanne', 'Rue de Rive Genève', '1201'"),
      types: z.array(z.enum(["locations", "featuresearch"])).default(["locations"]),
      limit: z.number().int().default(10),
      sr: z.enum(["4326", "2056", "21781"]).default("4326").describe("Spatial reference (4326=WGS84)"),
    },
    async ({ query, types, limit, sr }) => {
      const resp = await axios.get(`${GEOADMIN_BASE}/api/SearchServer`, {
        params: {
          type: types.join(","),
          searchText: query,
          limit,
          sr,
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data.results ?? [], null, 2) }],
      };
    }
  );

  server.tool(
    "swiss_geo_get_elevation",
    "Get elevation (altitude in meters) for WGS84 coordinates anywhere in Switzerland using the official swisstopo REFRAME service.",
    {
      lat: z.number().describe("Latitude (WGS84), e.g. 46.9481"),
      lng: z.number().describe("Longitude (WGS84), e.g. 7.4474"),
    },
    async ({ lat, lng }) => {
      // Step 1: convert WGS84 → LV95 to get metric coordinates
      const lv = await axios.get(`${REFRAME_BASE}/wgs84tolv95`, {
        params: { easting: lng, northing: lat, altitude: 0, format: "json" },
      });
      const { easting, northing } = lv.data;

      // Step 2: query the GeoAdmin terrain height service (DHM25/DOM)
      const heightResp = await axios.get("https://api3.geo.admin.ch/rest/services/height", {
        params: { easting, northing, sr: 2056 },
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            lat, lng,
            altitude_m: parseFloat(heightResp.data.height),
            system: "DHM25/DOM",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_geo_identify_canton",
    "Identify which Swiss canton a coordinate belongs to.",
    {
      lat: z.number().describe("Latitude WGS84"),
      lng: z.number().describe("Longitude WGS84"),
    },
    async ({ lat, lng }) => {
      // Convert WGS84 to LV95 first via REFRAME
      const lv = await axios.get(`${REFRAME_BASE}/wgs84tolv95`, {
        params: { easting: lng, northing: lat, altitude: 0, format: "json" },
      });
      const { easting: e, northing: n } = lv.data;

      const resp = await axios.get(`${GEOADMIN_BASE}/all/MapServer/identify`, {
        params: {
          geometry: `${e},${n}`,
          geometryType: "esriGeometryPoint",
          layers: "all:ch.swisstopo.swissboundaries3d-kanton-flaeche.fill",
          mapExtent: `${e - 10000},${n - 10000},${e + 10000},${n + 10000}`,
          imageDisplay: "100,100,96",
          returnGeometry: false,
          sr: 2056,
          tolerance: 50,
        },
      });
      const result = resp.data.results?.[0]?.attributes;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            lat, lng,
            canton_name: result?.name,
            canton_abbr: result?.ak,
            bfs_number: result?.kantonsnr,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_geo_identify_municipality",
    "Identify which Swiss municipality (commune) a coordinate belongs to.",
    {
      lat: z.number(),
      lng: z.number(),
    },
    async ({ lat, lng }) => {
      const lv = await axios.get(`${REFRAME_BASE}/wgs84tolv95`, {
        params: { easting: lng, northing: lat, altitude: 0, format: "json" },
      });
      const { easting: e, northing: n } = lv.data;

      const resp = await axios.get(`${GEOADMIN_BASE}/all/MapServer/identify`, {
        params: {
          geometry: `${e},${n}`,
          geometryType: "esriGeometryPoint",
          layers: "all:ch.swisstopo.swissboundaries3d-gemeinde-flaeche.fill",
          mapExtent: `${e - 5000},${n - 5000},${e + 5000},${n + 5000}`,
          imageDisplay: "100,100,96",
          returnGeometry: false,
          sr: 2056,
          tolerance: 50,
        },
      });
      const r = resp.data.results?.[0]?.attributes;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ lat, lng, municipality: r?.name, bfs_nr: r?.gemeindenummer, canton: r?.ak }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_geo_convert_coordinates",
    "Convert coordinates between Swiss LV95 (CH1903+), LV03 (CH1903) and WGS84 using official swisstopo REFRAME service.",
    {
      from_system: z.enum(["wgs84", "lv95", "lv03"]),
      to_system: z.enum(["wgs84", "lv95", "lv03"]),
      coord1: z.number().describe("First coordinate (lat for WGS84, northing for Swiss)"),
      coord2: z.number().describe("Second coordinate (lng for WGS84, easting for Swiss)"),
    },
    async ({ from_system, to_system, coord1, coord2 }) => {
      const endpointMap: Record<string, Record<string, string>> = {
        wgs84: { lv95: "wgs84tolv95", lv03: "wgs84tolv03" },
        lv95:  { wgs84: "lv95towgs84", lv03: "lv95tolv03"  },
        lv03:  { wgs84: "lv03towgs84", lv95: "lv03tolv95"  },
      };
      const endpoint = endpointMap[from_system]?.[to_system];
      if (!endpoint) throw new Error(`Conversion ${from_system} → ${to_system} not supported`);

      const isWgs = from_system === "wgs84";
      const params = isWgs
        ? { northing: coord1, easting: coord2, altitude: 0, format: "json" }
        : { northing: coord1, easting: coord2, altitude: 0, format: "json" };

      const resp = await axios.get(`${REFRAME_BASE}/${endpoint}`, { params });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data, null, 2) }],
      };
    }
  );

  server.tool(
    "swiss_geo_get_wmts_tile_url",
    "Generate a swisstopo WMTS tile URL for map display (official Swiss national map).",
    {
      layer: z.enum([
        "ch.swisstopo.pixelkarte-farbe",
        "ch.swisstopo.pixelkarte-grau",
        "ch.swisstopo.swissimage",
        "ch.swisstopo.landeskarte-farbe",
        "ch.swisstopo.swisstlm3d-wanderwege",
      ]).default("ch.swisstopo.pixelkarte-farbe"),
      z: z.number().int().min(0).max(18).describe("Zoom level"),
      x: z.number().int().describe("Tile X"),
      y: z.number().int().describe("Tile Y"),
    },
    async ({ layer, z, x, y }) => {
      const url = `${WMTS_BASE}/${layer}/default/current/3857/${z}/${x}/${y}.jpeg`;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            tile_url: url,
            attribution: "© swisstopo",
            note: "Free to use, no API key required",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_geo_find_layer_features",
    "Search features in a swisstopo map layer by text (streets, buildings, stations, etc.).",
    {
      layer: z.string().describe("Layer ID e.g. 'ch.swisstopo.amtliches-strassenverzeichnis', 'ch.bfs.gebaeude_wohnungs_register'"),
      search_text: z.string().describe("Text to search within the layer"),
      search_field: z.string().describe("Field name to search in"),
      limit: z.number().int().default(10),
    },
    async ({ layer, search_text, search_field, limit }) => {
      const resp = await axios.get(`${GEOADMIN_BASE}/all/MapServer/find`, {
        params: {
          layer,
          searchText: search_text,
          searchField: search_field,
          returnGeometry: false,
          limit,
        },
      });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data.results ?? [], null, 2) }],
      };
    }
  );
}
