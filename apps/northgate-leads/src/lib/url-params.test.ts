// URL param helper tests. Filter combinations are guaranteed-to-bug if not
// covered (toggle temperature while brand is set; clearAll preserves
// per_page; toggling current value clears it; multi-value add/remove).

import { describe, expect, it } from "vitest";
import {
  toggleParam,
  toggleMultiParam,
  setParam,
  clearParam,
  clearAll,
  cycleSort,
  getMulti,
  getSingle,
} from "./url-params";

describe("toggleParam (single-value)", () => {
  it("sets the param when absent", () => {
    expect(toggleParam({}, "since", "7d")).toBe("?since=7d");
  });

  it("preserves other params when adding a new one", () => {
    expect(toggleParam({ brand: "x" }, "since", "7d")).toBe(
      "?brand=x&since=7d",
    );
  });

  it("clears the param when toggling its current value", () => {
    expect(toggleParam({ since: "7d" }, "since", "7d")).toBe("");
  });

  it("clears + preserves other params when toggling the current value", () => {
    expect(toggleParam({ brand: "x", since: "7d" }, "since", "7d")).toBe(
      "?brand=x",
    );
  });

  it("replaces a different value for the same key", () => {
    expect(toggleParam({ since: "7d" }, "since", "30d")).toBe("?since=30d");
  });

  it("resets pagination to page 1 (drops page param)", () => {
    expect(toggleParam({ brand: "x", page: "5" }, "since", "7d")).toBe(
      "?brand=x&since=7d",
    );
  });
});

describe("toggleMultiParam", () => {
  it("adds the value when absent", () => {
    expect(toggleMultiParam({}, "brand", "northgate-protection")).toBe(
      "?brand=northgate-protection",
    );
  });

  it("appends a second value when one already present", () => {
    expect(
      toggleMultiParam(
        { brand: "northgate-protection" },
        "brand",
        "northgate-heritage",
      ),
    ).toBe("?brand=northgate-protection&brand=northgate-heritage");
  });

  it("removes the value when already present (single)", () => {
    expect(toggleMultiParam({ brand: "x" }, "brand", "x")).toBe("");
  });

  it("removes one value from a multi-value param leaving the rest", () => {
    expect(
      toggleMultiParam({ brand: ["x", "y"] }, "brand", "x"),
    ).toBe("?brand=y");
  });

  it("preserves unrelated params when adding/removing", () => {
    expect(
      toggleMultiParam({ brand: "x", since: "7d" }, "temp", "hot"),
    ).toBe("?brand=x&since=7d&temp=hot");
  });

  it("resets pagination on toggle (drops page param)", () => {
    expect(
      toggleMultiParam({ brand: "x", page: "3" }, "brand", "y"),
    ).toBe("?brand=x&brand=y");
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
  it("drops the named param + page", () => {
    expect(clearParam({ brand: "x", temp: "hot", page: "3" }, "brand")).toBe(
      "?temp=hot",
    );
  });

  it("returns empty string when only the cleared key remained", () => {
    expect(clearParam({ brand: "x" }, "brand")).toBe("");
  });

  it("clears multi-value entirely", () => {
    expect(clearParam({ brand: ["x", "y"] }, "brand")).toBe("");
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
        brand: ["x", "y"],
        product: "y",
        temp: ["hot", "warm"],
        since: "7d",
        page: "3",
        per_page: "100",
      }),
    ).toBe("?per_page=100");
  });
});

describe("cycleSort", () => {
  it("starts asc when no sort is set", () => {
    expect(cycleSort({}, "created_at")).toBe("?sort=created_at&dir=asc");
  });

  it("starts asc on a different column even if another is currently sorted", () => {
    expect(
      cycleSort({ sort: "created_at", dir: "desc" }, "last_name"),
    ).toBe("?sort=last_name&dir=asc");
  });

  it("toggles asc → desc on the same column", () => {
    expect(cycleSort({ sort: "last_name", dir: "asc" }, "last_name")).toBe(
      "?sort=last_name&dir=desc",
    );
  });

  it("clears (back to default) when toggling desc on the same column", () => {
    expect(cycleSort({ sort: "last_name", dir: "desc" }, "last_name")).toBe(
      "",
    );
  });

  it("preserves filter params across sort cycles", () => {
    expect(cycleSort({ brand: "x", temp: ["hot", "warm"] }, "age")).toBe(
      "?brand=x&temp=hot&temp=warm&sort=age&dir=asc",
    );
  });

  it("resets pagination on sort change (drops page)", () => {
    expect(cycleSort({ page: "5" }, "age")).toBe("?sort=age&dir=asc");
  });
});

describe("getMulti / getSingle", () => {
  it("getMulti returns [] for missing key", () => {
    expect(getMulti({}, "brand")).toEqual([]);
  });

  it("getMulti normalizes string to single-element array", () => {
    expect(getMulti({ brand: "x" }, "brand")).toEqual(["x"]);
  });

  it("getMulti returns array as-is", () => {
    expect(getMulti({ brand: ["x", "y"] }, "brand")).toEqual(["x", "y"]);
  });

  it("getSingle returns undefined for missing key", () => {
    expect(getSingle({}, "since")).toBeUndefined();
  });

  it("getSingle returns the string value", () => {
    expect(getSingle({ since: "7d" }, "since")).toBe("7d");
  });

  it("getSingle returns first array element when multi", () => {
    expect(getSingle({ since: ["7d", "30d"] }, "since")).toBe("7d");
  });
});
