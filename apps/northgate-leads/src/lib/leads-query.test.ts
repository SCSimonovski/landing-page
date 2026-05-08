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
} from "./leads-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@platform/shared/types/database";

describe("parseFilters", () => {
  it("returns defaults when no params", () => {
    expect(parseFilters({})).toEqual({
      brand: undefined,
      product: undefined,
      temp: undefined,
      since: undefined,
      agent: undefined,
      page: 1,
      perPage: DEFAULT_PER_PAGE,
    });
  });

  it("parses all filter values", () => {
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
      brand: "northgate-heritage",
      product: "final_expense",
      temp: "hot",
      since: "30d",
      agent: "abc-123",
      page: 3,
      perPage: 100,
    });
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

  it("takes the first value when a param is an array", () => {
    expect(parseFilters({ brand: ["a", "b"] }).brand).toBe("a");
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
    buildLeadsQuery(
      { page: 1, perPage: 50 },
      "agent",
      client,
    );
    const select = calls.find((c) => c.method === "select");
    expect(select?.args[0]).toBe("*");
  });

  it("admin role: select includes agents join", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { page: 1, perPage: 50 },
      "admin",
      client,
    );
    const select = calls.find((c) => c.method === "select");
    expect(select?.args[0]).toContain("agent:agents");
  });

  it("orders by created_at desc", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery({ page: 1, perPage: 50 }, "agent", client);
    const order = calls.find((c) => c.method === "order");
    expect(order?.args).toEqual(["created_at", { ascending: false }]);
  });

  it("applies brand filter via .eq", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { page: 1, perPage: 50, brand: "northgate-heritage" },
      "agent",
      client,
    );
    const eqCalls = calls.filter((c) => c.method === "eq");
    expect(eqCalls).toContainEqual({
      method: "eq",
      args: ["brand", "northgate-heritage"],
    });
  });

  it("applies product + temperature filters", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { page: 1, perPage: 50, product: "final_expense", temp: "hot" },
      "agent",
      client,
    );
    const eqCalls = calls.filter((c) => c.method === "eq");
    expect(eqCalls).toContainEqual({
      method: "eq",
      args: ["product", "final_expense"],
    });
    expect(eqCalls).toContainEqual({
      method: "eq",
      args: ["temperature", "hot"],
    });
  });

  it("applies date range via .gte", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery({ page: 1, perPage: 50, since: "7d" }, "agent", client);
    const gte = calls.find((c) => c.method === "gte");
    expect(gte?.args[0]).toBe("created_at");
    expect(typeof gte?.args[1]).toBe("string");
  });

  it("agent filter ignored for agent role (RLS handles isolation)", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { page: 1, perPage: 50, agent: "some-other-agent" },
      "agent",
      client,
    );
    // No .eq("agent_id", ...) call should appear.
    const agentEq = calls.find(
      (c) => c.method === "eq" && c.args[0] === "agent_id",
    );
    expect(agentEq).toBeUndefined();
  });

  it("agent filter applied for admin role", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { page: 1, perPage: 50, agent: "admin-picked-agent" },
      "admin",
      client,
    );
    const agentEq = calls.find(
      (c) => c.method === "eq" && c.args[0] === "agent_id",
    );
    expect(agentEq?.args[1]).toBe("admin-picked-agent");
  });

  it("agent=unassigned uses .is null for admin role", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery(
      { page: 1, perPage: 50, agent: "unassigned" },
      "admin",
      client,
    );
    const isCall = calls.find((c) => c.method === "is");
    expect(isCall?.args).toEqual(["agent_id", null]);
  });

  it("range computed from page + perPage", () => {
    const { client, calls } = makeMockClient();
    buildLeadsQuery({ page: 3, perPage: 50 }, "agent", client);
    const range = calls.find((c) => c.method === "range");
    // page 3 of 50 → start 100, end 149
    expect(range?.args).toEqual([100, 149]);
  });
});
