// Pure-function tests for the leads query layer.
//
// parseFilters is deterministic + simple to test directly.
// buildLeadsQuery returns a chained Supabase query; we mock the client to
// capture the chained calls and assert on those.

import { describe, expect, it } from "vitest";
import {
  buildLeadsQuery,
  parseFilters,
  sinceToCutoff,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  type LeadFilters,
} from "./leads-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@platform/shared/types/database";

const baseFilters: LeadFilters = {
  brands: [],
  products: [],
  temps: [],
  agents: [],
  statuses: [],
  states: [],
  dir: "desc",
  page: 1,
  perPage: 50,
};

describe("parseFilters", () => {
  it("returns defaults when no params (multi-value dimensions = empty arrays)", () => {
    expect(parseFilters({})).toEqual({
      brands: [],
      products: [],
      temps: [],
      agents: [],
      statuses: [],
      states: [],
      since: undefined,
      sort: undefined,
      dir: "desc",
      page: 1,
      perPage: DEFAULT_PER_PAGE,
    });
  });

  it("parses multi-value status filter", () => {
    expect(
      parseFilters({ status: ["new", "contacted"] }).statuses,
    ).toEqual(["new", "contacted"]);
  });

  it("filters out unknown status values", () => {
    expect(
      parseFilters({ status: ["new", "bogus"] }).statuses,
    ).toEqual(["new"]);
  });

  it("parses multi-value state filter", () => {
    expect(parseFilters({ state: ["CA", "NY", "TX"] }).states).toEqual([
      "CA",
      "NY",
      "TX",
    ]);
  });

  it("filters out non-US-state state codes", () => {
    expect(parseFilters({ state: ["CA", "ZZ", "NY"] }).states).toEqual([
      "CA",
      "NY",
    ]);
  });

  it("parses valid sort + dir", () => {
    expect(parseFilters({ sort: "last_name", dir: "asc" })).toMatchObject({
      sort: "last_name",
      dir: "asc",
    });
  });

  it("rejects sort columns not on the whitelist", () => {
    expect(parseFilters({ sort: "phone_e164" }).sort).toBeUndefined();
  });

  it("dir defaults to desc for any non-asc value", () => {
    expect(parseFilters({ sort: "age", dir: "DESC" }).dir).toBe("desc");
    expect(parseFilters({ sort: "age", dir: "garbage" }).dir).toBe("desc");
  });

  it("parses single-value form of multi-value params", () => {
    expect(
      parseFilters({
        brand: "northgate-heritage",
        product: "final_expense",
        temp: "hot",
        since: "30d",
        agent: "abc-123",
        page: "3",
        per_page: "100",
      }),
    ).toEqual({
      brands: ["northgate-heritage"],
      products: ["final_expense"],
      temps: ["hot"],
      agents: ["abc-123"],
      statuses: [],
      states: [],
      since: "30d",
      sort: undefined,
      dir: "desc",
      page: 3,
      perPage: 100,
    });
  });

  it("parses repeated-key form (?brand=x&brand=y) as an array", () => {
    expect(
      parseFilters({
        brand: ["northgate-protection", "northgate-heritage"],
        temp: ["hot", "warm"],
        agent: ["a", "b"],
      }),
    ).toMatchObject({
      brands: ["northgate-protection", "northgate-heritage"],
      temps: ["hot", "warm"],
      agents: ["a", "b"],
    });
  });

  it("filters out unknown temperature values", () => {
    expect(parseFilters({ temp: ["hot", "lukewarm"] }).temps).toEqual(["hot"]);
  });

  it("rejects unknown since values to undefined", () => {
    expect(parseFilters({ since: "1y" }).since).toBeUndefined();
  });

  it("clamps page to >= 1", () => {
    expect(parseFilters({ page: "0" }).page).toBe(1);
    expect(parseFilters({ page: "-5" }).page).toBe(1);
    expect(parseFilters({ page: "abc" }).page).toBe(1);
  });

  it("caps perPage at MAX_PER_PAGE", () => {
    expect(parseFilters({ per_page: "9999" }).perPage).toBe(MAX_PER_PAGE);
  });

  it("floors perPage at 1", () => {
    expect(parseFilters({ per_page: "0" }).perPage).toBe(1);
    expect(parseFilters({ per_page: "-5" }).perPage).toBe(1);
  });

  it("takes the first value when page is an array", () => {
    expect(parseFilters({ page: ["3", "5"] }).page).toBe(3);
  });
});

describe("sinceToCutoff", () => {
  it("returns null for undefined", () => {
    expect(sinceToCutoff(undefined)).toBeNull();
  });

  it("returns ISO string for 7d", () => {
    const cutoff = sinceToCutoff("7d");
    expect(cutoff).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const ms = Date.now() - new Date(cutoff!).getTime();
    expect(ms).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
    expect(ms).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 1000);
  });

  it("30d is ~30 days back", () => {
    const cutoff = sinceToCutoff("30d");
    const ms = Date.now() - new Date(cutoff!).getTime();
    expect(ms).toBeGreaterThanOrEqual(30 * 24 * 60 * 60 * 1000 - 1000);
  });
});

describe("buildLeadsQuery", () => {
  // Fluent mock — every method returns the same proxy so chained calls work.
  // Track which methods were called with what.
  function makeMockClient() {
    const calls: Array<{ method: string; args: unknown[] }> = [];
    const proxy: Record<string, (...args: unknown[]) => unknown> = {};
    const handler: ProxyHandler<typeof proxy> = {
      get(_target, prop: string) {
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
          return new Proxy(proxy, handler);
        };
      },
    };
    return {
      client: new Proxy(proxy, handler) as unknown as SupabaseClient<Database>,
      calls,
    };
  }

  it("agent role: select * (no agents join)", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(baseFilters, "agent", client);
    const select = calls.find((c) => c.method === "select");
    expect(select?.args[0]).toBe("*");
  });

  it("admin role: select includes agents join", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(baseFilters, "admin", client);
    const select = calls.find((c) => c.method === "select");
    expect(select?.args[0]).toContain("agent:agents");
  });

  it("default sort: created_at desc", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(baseFilters, "agent", client);
    const order = calls.find((c) => c.method === "order");
    expect(order?.args).toEqual(["created_at", { ascending: false }]);
  });

  it("respects user-controllable sort + asc dir", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, sort: "last_name", dir: "asc" },
      "agent",
      client,
    );
    const order = calls.find((c) => c.method === "order");
    expect(order?.args).toEqual(["last_name", { ascending: true }]);
  });

  it("respects user-controllable sort + desc dir", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, sort: "intent_score", dir: "desc" },
      "agent",
      client,
    );
    const order = calls.find((c) => c.method === "order");
    expect(order?.args).toEqual(["intent_score", { ascending: false }]);
  });

  it("status filter applied via .in", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, statuses: ["new", "contacted"] },
      "agent",
      client,
    );
    const inCalls = calls.filter((c) => c.method === "in");
    expect(inCalls).toContainEqual({
      method: "in",
      args: ["status", ["new", "contacted"]],
    });
  });

  it("admin: assigned_agent_name sort uses foreignTable=agent", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, sort: "assigned_agent_name", dir: "asc" },
      "admin",
      client,
    );
    const order = calls.find((c) => c.method === "order");
    expect(order?.args).toEqual([
      "full_name",
      { foreignTable: "agent", ascending: true },
    ]);
  });

  it("agent: assigned_agent_name sort falls back to default (no agent join)", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, sort: "assigned_agent_name", dir: "asc" },
      "agent",
      client,
    );
    const order = calls.find((c) => c.method === "order");
    expect(order?.args).toEqual(["created_at", { ascending: true }]);
  });

  it("single brand filter via .in", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, brands: ["northgate-heritage"] },
      "agent",
      client,
    );
    const inCalls = calls.filter((c) => c.method === "in");
    expect(inCalls).toContainEqual({
      method: "in",
      args: ["brand", ["northgate-heritage"]],
    });
  });

  it("multiple brand filters via .in([a, b])", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, brands: ["northgate-protection", "northgate-heritage"] },
      "agent",
      client,
    );
    const inCalls = calls.filter((c) => c.method === "in");
    expect(inCalls).toContainEqual({
      method: "in",
      args: ["brand", ["northgate-protection", "northgate-heritage"]],
    });
  });

  it("applies product + temperature filters", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      {
        ...baseFilters,
        products: ["final_expense"],
        temps: ["hot", "warm"],
      },
      "agent",
      client,
    );
    const inCalls = calls.filter((c) => c.method === "in");
    expect(inCalls).toContainEqual({
      method: "in",
      args: ["product", ["final_expense"]],
    });
    expect(inCalls).toContainEqual({
      method: "in",
      args: ["temperature", ["hot", "warm"]],
    });
  });

  it("applies date range via .gte", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery({ ...baseFilters, since: "7d" }, "agent", client);
    const gte = calls.find((c) => c.method === "gte");
    expect(gte?.args[0]).toBe("created_at");
    expect(typeof gte?.args[1]).toBe("string");
  });

  it("agent filter ignored for agent role (RLS handles isolation)", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, agents: ["some-other-agent"] },
      "agent",
      client,
    );
    // No .in("agent_id", ...) or .is("agent_id", ...) call should appear.
    const agentCalls = calls.filter(
      (c) =>
        (c.method === "in" || c.method === "is" || c.method === "or") &&
        (c.args[0] === "agent_id" ||
          (typeof c.args[0] === "string" && c.args[0].includes("agent_id"))),
    );
    expect(agentCalls).toEqual([]);
  });

  it("admin: single agent filter via .in", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, agents: ["admin-picked-agent"] },
      "admin",
      client,
    );
    const inCall = calls.find(
      (c) => c.method === "in" && c.args[0] === "agent_id",
    );
    expect(inCall?.args[1]).toEqual(["admin-picked-agent"]);
  });

  it("admin: agents=[unassigned] uses .is null", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, agents: ["unassigned"] },
      "admin",
      client,
    );
    const isCall = calls.find((c) => c.method === "is");
    expect(isCall?.args).toEqual(["agent_id", null]);
  });

  it("admin: agents=[unassigned, x, y] uses .or for null OR in (...)", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { ...baseFilters, agents: ["unassigned", "agent-1", "agent-2"] },
      "admin",
      client,
    );
    const orCall = calls.find((c) => c.method === "or");
    expect(orCall?.args[0]).toBe(
      "agent_id.is.null,agent_id.in.(agent-1,agent-2)",
    );
  });

  it("range computed from page + perPage", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery({ ...baseFilters, page: 3, perPage: 50 }, "agent", client);
    const range = calls.find((c) => c.method === "range");
    // page 3 of 50 → start 100, end 149
    expect(range?.args).toEqual([100, 149]);
  });
});
