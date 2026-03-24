import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { createMockServer, parseResult } from "./helpers/mock-server.js";
import { registerSetupTools, loadStoredKeys, persistKey } from "../src/tools/setup.js";

// Use the real keys file but back it up so tests are non-destructive
const KEYS_DIR  = path.join(os.homedir(), ".swiss-apis-mcp");
const KEYS_FILE = path.join(KEYS_DIR, "keys");
const BACKUP    = KEYS_FILE + ".test-backup";

let server: ReturnType<typeof createMockServer>["server"];
let tools:  ReturnType<typeof createMockServer>["tools"];

beforeEach(() => {
  ({ server, tools } = createMockServer());
  registerSetupTools(server);

  // Back up existing key file, wipe for test isolation
  if (fs.existsSync(KEYS_FILE)) fs.copyFileSync(KEYS_FILE, BACKUP);
  if (fs.existsSync(KEYS_FILE)) fs.unlinkSync(KEYS_FILE);

  delete process.env.OTD_API_KEY;
  delete process.env.ZEFIX_USER;
  delete process.env.ZEFIX_PASS;
  delete process.env.FOODREPO_API_KEY;
});

afterEach(() => {
  // Restore original key file
  if (fs.existsSync(BACKUP)) {
    fs.copyFileSync(BACKUP, KEYS_FILE);
    fs.unlinkSync(BACKUP);
  } else if (fs.existsSync(KEYS_FILE)) {
    fs.unlinkSync(KEYS_FILE);
  }
  delete process.env.OTD_API_KEY;
  delete process.env.ZEFIX_USER;
  delete process.env.ZEFIX_PASS;
  delete process.env.FOODREPO_API_KEY;
});

describe("swiss_check_setup", () => {
  it("reports all keys missing when env is clean", async () => {
    const result = await tools["swiss_check_setup"]({});
    const data = parseResult(result) as any;

    expect(data.all_configured).toBe(false);
    expect(data.missing_keys).toContain("OTD_API_KEY");
    expect(data.missing_keys).toContain("ZEFIX_USER");
    expect(data.missing_keys).toContain("ZEFIX_PASS");
    expect(data.missing_keys).toContain("FOODREPO_API_KEY");
    expect(data.missing_keys).toHaveLength(4);
  });

  it("reports a key as configured when present in process.env", async () => {
    process.env.OTD_API_KEY = "test-key-123";

    const result = await tools["swiss_check_setup"]({});
    const data = parseResult(result) as any;

    expect(data.keys.OTD_API_KEY.configured).toBe(true);
    expect(data.keys.ZEFIX_USER.configured).toBe(false);
    expect(data.missing_keys).not.toContain("OTD_API_KEY");
  });

  it("reports all_configured: true when all keys are set", async () => {
    process.env.OTD_API_KEY      = "a";
    process.env.ZEFIX_USER       = "b";
    process.env.ZEFIX_PASS       = "c";
    process.env.FOODREPO_API_KEY = "d";

    const result = await tools["swiss_check_setup"]({});
    const data = parseResult(result) as any;

    expect(data.all_configured).toBe(true);
    expect(data.missing_keys).toHaveLength(0);
  });

  it("includes registration URLs for missing keys", async () => {
    const result = await tools["swiss_check_setup"]({});
    const data = parseResult(result) as any;

    expect(data.keys.ZEFIX_USER.register_url).toContain("zefix.admin.ch");
    expect(data.keys.FOODREPO_API_KEY.register_url).toContain("foodrepo.org");
    expect(data.keys.OTD_API_KEY.register_url).toContain("opentransportdata.swiss");
  });
});

describe("swiss_set_api_key", () => {
  it("sets the key in process.env immediately — no restart needed", async () => {
    expect(process.env.OTD_API_KEY).toBeUndefined();

    await tools["swiss_set_api_key"]({ key_name: "OTD_API_KEY", value: "my-real-key" });

    expect(process.env.OTD_API_KEY).toBe("my-real-key");
  });

  it("returns a success confirmation message", async () => {
    const result = await tools["swiss_set_api_key"]({ key_name: "FOODREPO_API_KEY", value: "abc123" });
    const data = parseResult(result) as any;

    expect(data.success).toBe(true);
    expect(data.key).toBe("FOODREPO_API_KEY");
    expect(data.message).toContain("✅");
    expect(data.message).toContain("FOODREPO_API_KEY");
    expect(data.stored_at).toContain(".swiss-apis-mcp");
  });

  it("key is visible in swiss_check_setup immediately after being set", async () => {
    await tools["swiss_set_api_key"]({ key_name: "ZEFIX_USER", value: "user@example.ch" });

    const result = await tools["swiss_check_setup"]({});
    const data = parseResult(result) as any;

    expect(data.keys.ZEFIX_USER.configured).toBe(true);
    expect(data.missing_keys).not.toContain("ZEFIX_USER");
  });

  it("persists the key to disk so it survives a server restart", async () => {
    await tools["swiss_set_api_key"]({ key_name: "ZEFIX_PASS", value: "secret" });

    // Simulate server restart: wipe process.env, reload from disk
    delete process.env.ZEFIX_PASS;
    const loaded = loadStoredKeys();

    expect(loaded.ZEFIX_PASS).toBe("secret");
  });

  it("setting multiple keys preserves previously stored keys", async () => {
    await tools["swiss_set_api_key"]({ key_name: "ZEFIX_USER", value: "user@x.ch" });
    await tools["swiss_set_api_key"]({ key_name: "ZEFIX_PASS", value: "pass123" });

    const loaded = loadStoredKeys();
    expect(loaded.ZEFIX_USER).toBe("user@x.ch");
    expect(loaded.ZEFIX_PASS).toBe("pass123");
  });
});

describe("persistKey / loadStoredKeys", () => {
  it("round-trips a key through disk correctly", () => {
    persistKey("OTD_API_KEY", "roundtrip-test");
    const loaded = loadStoredKeys();
    expect(loaded.OTD_API_KEY).toBe("roundtrip-test");
  });

  it("loadStoredKeys returns empty object when no file exists", () => {
    const loaded = loadStoredKeys();
    expect(typeof loaded).toBe("object");
    expect(Object.keys(loaded)).toHaveLength(0);
  });
});
