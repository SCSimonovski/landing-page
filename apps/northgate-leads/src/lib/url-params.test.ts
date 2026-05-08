// URL param helper tests. Filter combinations are guaranteed-to-bug if not
// covered (toggle temperature while brand is set; clearAll preserves
// per_page; toggling current value clears it).

import { describe, expect, it } from "vitest";
import { toggleParam, setParam, clearParam, clearAll } from "./url-params";

describe("toggleParam", () => {
  it("sets the param when absent", () => {
    expect(toggleParam({}, "brand", "northgate-protection")).toBe(
      "?brand=northgate-protection",
    );
  });

  it("preserves other params when adding a new one", () => {
    expect(
      toggleParam({ brand: "northgate-protection" }, "temp", "hot"),
    ).toBe("?brand=northgate-protection&temp=hot");
  });

  it("clears the param when toggling its current value", () => {
    expect(toggleParam({ temp: "hot" }, "temp", "hot")).toBe("");
  });

  it("clears + preserves other params when toggling the current value", () => {
    expect(
      toggleParam({ brand: "northgate-protection", temp: "hot" }, "temp", "hot"),
    ).toBe("?brand=northgate-protection");
  });

  it("replaces a different value for the same key", () => {
    expect(toggleParam({ temp: "hot" }, "temp", "warm")).toBe("?temp=warm");
  });

  it("resets pagination to page 1 (drops page param)", () => {
    expect(
      toggleParam({ brand: "northgate-protection", page: "5" }, "temp", "hot"),
    ).toBe("?brand=northgate-protection&temp=hot");
  });
});

describe("setParam", () => {
  it("sets unconditionally", () => {
    expect(setParam({}, "page", "3")).toBe("?page=3");
  });

  it("replaces the existing value", () => {
    expect(setParam({ page: "1" }, "page", "5")).toBe("?page=5");
  });

  it("preserves other params", () => {
    expect(setParam({ brand: "x", page: "1" }, "page", "5")).toBe(
      "?brand=x&page=5",
    );
  });
});

describe("clearParam", () => {
  it("drops the named param", () => {
    expect(clearParam({ brand: "x", temp: "hot" }, "brand")).toBe("?temp=hot");
  });

  it("returns empty string when no params remain", () => {
    expect(clearParam({ brand: "x" }, "brand")).toBe("");
  });

  it("is a no-op for an absent key", () => {
    expect(clearParam({ brand: "x" }, "temp")).toBe("?brand=x");
  });
});

describe("clearAll", () => {
  it("returns empty string when no per_page set", () => {
    expect(clearAll({ brand: "x", temp: "hot", page: "3" })).toBe("");
  });

  it("preserves per_page (UI preference)", () => {
    expect(clearAll({ brand: "x", per_page: "100" })).toBe("?per_page=100");
  });

  it("preserves only per_page, drops everything else", () => {
    expect(
      clearAll({
        brand: "x",
        product: "y",
        temp: "hot",
        since: "7d",
        page: "3",
        per_page: "100",
      }),
    ).toBe("?per_page=100");
  });
});
