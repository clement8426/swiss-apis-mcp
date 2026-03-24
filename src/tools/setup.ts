import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import os from "os";

// Keys are stored in ~/.swiss-apis-mcp/keys — works regardless of launch CWD
const KEYS_DIR  = path.join(os.homedir(), ".swiss-apis-mcp");
const KEYS_FILE = path.join(KEYS_DIR, "keys");

export const KNOWN_KEYS = {
  OTD_API_KEY:     "opentransportdata.swiss — GTFS real-time (trains/buses)",
  ZEFIX_USER:      "zefix.admin.ch — Swiss commercial register (username)",
  ZEFIX_PASS:      "zefix.admin.ch — Swiss commercial register (password)",
  FOODREPO_API_KEY:"foodrepo.org — Swiss barcoded food products (EPFL)",
} as const;

export const REGISTRATION_URLS: Record<string, string> = {
  OTD_API_KEY:      "https://api-manager.opentransportdata.swiss/",
  ZEFIX_USER:       "https://www.zefix.admin.ch",
  ZEFIX_PASS:       "https://www.zefix.admin.ch",
  FOODREPO_API_KEY: "https://www.foodrepo.org/en/users/sign_up",
};

/** Read the stored key file → { KEY: value } */
export function loadStoredKeys(): Record<string, string> {
  if (!fs.existsSync(KEYS_FILE)) return {};
  const stored: Record<string, string> = {};
  for (const line of fs.readFileSync(KEYS_FILE, "utf-8").split("\n")) {
    const eq = line.indexOf("=");
    if (eq > 0) {
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      if (key && val) stored[key] = val;
    }
  }
  return stored;
}

/** Persist a single key to the file AND inject it into process.env immediately. */
export function persistKey(name: string, value: string): void {
  fs.mkdirSync(KEYS_DIR, { recursive: true });

  // Update in memory right away — tools that read process.env will see it immediately
  process.env[name] = value;

  // Merge with existing stored keys
  const stored = loadStoredKeys();
  stored[name] = value;

  const content = Object.entries(stored)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n") + "\n";

  fs.writeFileSync(KEYS_FILE, content, { mode: 0o600 });
}

export function registerSetupTools(server: McpServer) {

  server.tool(
    "swiss_check_setup",
    "Check which optional API keys are configured. Call this first to know which Swiss API tools are fully operational and which need a free API key.",
    {},
    async () => {
      const status: Record<string, object> = {};

      for (const [key, description] of Object.entries(KNOWN_KEYS)) {
        const isSet = !!(process.env[key] && process.env[key]!.trim().length > 0);
        status[key] = {
          configured: isSet,
          description,
          register_url: isSet ? undefined : REGISTRATION_URLS[key],
        };
      }

      const allOk      = Object.values(status).every((s: any) => s.configured);
      const missingKeys = Object.entries(status)
        .filter(([, s]: any) => !s.configured)
        .map(([k]) => k);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            all_configured: allOk,
            missing_keys: missingKeys,
            note: allOk
              ? "All API keys are set. Every tool is fully operational."
              : `${missingKeys.length} optional key(s) missing. Tools requiring them will return setup instructions. Use swiss_set_api_key to configure them.`,
            keys: status,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "swiss_set_api_key",
    "Store an optional API key so Swiss API tools that require it become fully operational. Keys are saved in ~/.swiss-apis-mcp/keys and take effect immediately — no server restart needed. Ask the user for the value before calling this tool.",
    {
      key_name: z.enum(["OTD_API_KEY", "ZEFIX_USER", "ZEFIX_PASS", "FOODREPO_API_KEY"])
        .describe("Name of the key to set"),
      value: z.string().min(1).describe("The API key / credential value provided by the user"),
    },
    async ({ key_name, value }) => {
      persistKey(key_name, value);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            key: key_name,
            message: `✅ ${key_name} has been saved and is active immediately. No server restart needed.`,
            stored_at: KEYS_FILE,
          }, null, 2),
        }],
      };
    }
  );
}
