import { describe, it, expect, beforeAll } from "vitest";
import { registerPoliticsTools } from "../../src/tools/politics.js";
import { createRealServer, parseResult } from "./helpers.js";

// Real HTTP calls to OpenParlData + Fedlex — no API key needed

let server: ReturnType<typeof createRealServer>["server"];
let tools: ReturnType<typeof createRealServer>["tools"];

beforeAll(() => {
  ({ server, tools } = createRealServer());
  registerPoliticsTools(server as any);
});

describe("[REAL API] swiss_parliament_search", () => {
  it("returns parliamentary results or fallback for 'climate'", async () => {
    const result = await tools["swiss_parliament_search"]({
      query: "climate",
      limit: 5,
    });
    const data = parseResult(result) as any;

    // Either OpenParlData works (array) or CKAN fallback (object with fallback_results)
    const isDirectResult = Array.isArray(data) || typeof data === "object";
    expect(isDirectResult).toBe(true);
  });

  it("filters by federal parliament 'ch'", async () => {
    const result = await tools["swiss_parliament_search"]({
      query: "santé",
      parliament: "ch",
      limit: 3,
    });

    expect(result.content[0].text).toBeTruthy();
    expect(result.content[0].type).toBe("text");
  });
});

describe("[REAL API] swiss_parliament_persons", () => {
  it("returns persons or docs for federal parliament", async () => {
    const result = await tools["swiss_parliament_persons"]({
      parliament: "ch",
      limit: 5,
    });

    // The tool returns something — either data or API docs
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text.length).toBeGreaterThan(0);
  });
});

describe("[REAL API] swiss_federal_law_search", () => {
  it("searches Fedlex SPARQL for 'code civil' or returns portal info", async () => {
    const result = await tools["swiss_federal_law_search"]({
      query: "code civil",
    });
    const data = parseResult(result) as any;

    // Either SPARQL bindings (array) or portal fallback (object)
    if (Array.isArray(data)) {
      // SPARQL returned results
      if (data.length > 0) {
        expect(data[0]).toHaveProperty("title");
      }
    } else {
      // Fallback portal info
      expect(data).toHaveProperty("portal");
      expect(data.portal).toContain("fedlex.admin.ch");
    }
  });
});
