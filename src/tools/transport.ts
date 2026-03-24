import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import axios from "axios";

// transport.opendata.ch — NO API KEY required
const TRANSPORT_BASE = "https://transport.opendata.ch/v1";

// opentransportdata.swiss — API KEY required (free, register at api-manager.opentransportdata.swiss)
const OTD_BASE = "https://api.opentransportdata.swiss";

export function registerTransportTools(server: McpServer) {

  // --- transport.opendata.ch (no auth) ---

  server.tool(
    "swiss_transport_stationboard",
    "Get next departures from a Swiss public transport station. No API key needed.",
    {
      station: z.string().describe("Station name, e.g. 'Genève', 'Zürich HB', 'Bern'"),
      limit: z.number().int().min(1).max(40).default(10).describe("Number of departures to return"),
      transportations: z.array(z.enum(["train", "tram", "bus", "boat", "cableway"]))
        .optional()
        .describe("Filter by transport type"),
    },
    async ({ station, limit, transportations }) => {
      const params: Record<string, unknown> = { station, limit };
      if (transportations) params.transportations = transportations.join("&transportations[]=");

      const resp = await axios.get(`${TRANSPORT_BASE}/stationboard`, { params });
      const board = resp.data;

      const summary = board.stationboard?.slice(0, limit).map((d: any) => ({
        line: d.name,
        destination: d.to,
        departure: d.stop?.departure,
        delay: d.stop?.delay ?? 0,
        platform: d.stop?.platform,
        category: d.category,
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ station: board.station?.name, departures: summary }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_transport_connections",
    "Find train/bus connections between two Swiss locations. No API key needed.",
    {
      from: z.string().describe("Departure station or address"),
      to: z.string().describe("Arrival station or address"),
      via: z.string().optional().describe("Optional intermediate stop"),
      datetime: z.string().optional().describe("ISO datetime, defaults to now"),
      limit: z.number().int().min(1).max(6).default(3),
    },
    async ({ from, to, via, datetime, limit }) => {
      const params: Record<string, unknown> = { from, to, limit };
      if (via) params.via = via;
      if (datetime) params.datetime = datetime;

      const resp = await axios.get(`${TRANSPORT_BASE}/connections`, { params });
      const connections = resp.data.connections?.map((c: any) => ({
        departure: c.from?.departure,
        arrival: c.to?.arrival,
        duration: c.duration,
        transfers: c.transfers,
        products: c.products,
        sections: c.sections?.map((s: any) => ({
          departure: s.departure?.station?.name,
          arrival: s.arrival?.station?.name,
          line: s.journey?.name,
          category: s.journey?.category,
        })),
      }));

      return {
        content: [{ type: "text", text: JSON.stringify(connections, null, 2) }],
      };
    }
  );

  server.tool(
    "swiss_transport_station_search",
    "Search for Swiss public transport stations by name or coordinates.",
    {
      query: z.string().optional().describe("Station name to search for"),
      lat: z.number().optional().describe("Latitude for nearby stations"),
      lon: z.number().optional().describe("Longitude for nearby stations"),
      limit: z.number().int().default(5),
    },
    async ({ query, lat, lon, limit }) => {
      const params: Record<string, unknown> = { limit };
      if (query) params.query = query;
      if (lat && lon) { params["x"] = lon; params["y"] = lat; }

      const resp = await axios.get(`${TRANSPORT_BASE}/locations`, { params });
      return {
        content: [{ type: "text", text: JSON.stringify(resp.data.stations, null, 2) }],
      };
    }
  );

  // --- opentransportdata.swiss (API key required) ---

  server.tool(
    "swiss_transport_gtfs_realtime",
    "Get real-time GTFS data from opentransportdata.swiss. Requires OTD_API_KEY env variable.",
    {
      feed_type: z.enum(["trip_updates", "vehicle_positions", "alerts"])
        .describe("Type of GTFS-RT feed"),
    },
    async ({ feed_type }) => {
      const apiKey = process.env.OTD_API_KEY;
      if (!apiKey) {
        return {
          content: [{
            type: "text",
            text: "OTD_API_KEY environment variable not set. Register free at: https://api-manager.opentransportdata.swiss/",
          }],
        };
      }

      const endpoints: Record<string, string> = {
        trip_updates: `${OTD_BASE}/gtfsrttripupdates/v1`,
        vehicle_positions: `${OTD_BASE}/gtfsrtvehicleposition/v1`,
        alerts: `${OTD_BASE}/gtfsrtalerts/v1`,
      };

      const resp = await axios.get(endpoints[feed_type], {
        headers: { Authorization: `Bearer ${apiKey}` },
        responseType: "arraybuffer",
      });

      return {
        content: [{
          type: "text",
          text: `GTFS-RT ${feed_type} feed fetched (${resp.data.byteLength} bytes). Use a protobuf decoder to parse.`,
        }],
      };
    }
  );
}
