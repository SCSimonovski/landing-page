import { describe, it, expect } from "vitest";
import { inviteSchema } from "./invite-schema";

// Plan 4 Decision #23 (schema-only lowercasing) is enforced by the
// .toLowerCase() transform on email. The lowercasing test is the
// load-bearing assertion — if anyone removes the transform from the
// schema thinking it's redundant, this test fires loudly.

describe("inviteSchema", () => {
  it("normalizes mixed-case email to lowercase", () => {
    const r = inviteSchema.parse({
      email: "Mixed.Case@Example.COM",
      role: "admin",
    });
    expect(r.email).toBe("mixed.case@example.com");
  });

  it("trims whitespace around email", () => {
    const r = inviteSchema.parse({
      email: "  user@example.com  ",
      role: "admin",
    });
    expect(r.email).toBe("user@example.com");
  });

  it("rejects an invalid email", () => {
    const r = inviteSchema.safeParse({
      email: "not-an-email",
      role: "admin",
    });
    expect(r.success).toBe(false);
  });

  it("admin can submit without full_name or license_states", () => {
    const r = inviteSchema.safeParse({
      email: "ops@example.com",
      role: "admin",
    });
    expect(r.success).toBe(true);
  });

  it("superadmin can submit without full_name or license_states", () => {
    const r = inviteSchema.safeParse({
      email: "boss@example.com",
      role: "superadmin",
    });
    expect(r.success).toBe(true);
  });

  it("agent without full_name fails with a path on full_name", () => {
    const r = inviteSchema.safeParse({
      email: "agent@example.com",
      role: "agent",
      license_states: ["TX"],
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues.some((i) => i.path.includes("full_name"))).toBe(
        true,
      );
    }
  });

  it("agent without license_states fails with a path on license_states", () => {
    const r = inviteSchema.safeParse({
      email: "agent@example.com",
      role: "agent",
      full_name: "Alice",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(
        r.error.issues.some((i) => i.path.includes("license_states")),
      ).toBe(true);
    }
  });

  it("agent with empty license_states array fails", () => {
    const r = inviteSchema.safeParse({
      email: "agent@example.com",
      role: "agent",
      full_name: "Alice",
      license_states: [],
    });
    expect(r.success).toBe(false);
  });

  it("agent with full_name + at least one license state passes", () => {
    const r = inviteSchema.safeParse({
      email: "agent@example.com",
      role: "agent",
      full_name: "Alice Johnson",
      license_states: ["TX", "FL"],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.license_states).toEqual(["TX", "FL"]);
  });

  it("rejects unknown role", () => {
    const r = inviteSchema.safeParse({
      email: "user@example.com",
      role: "owner",
    });
    expect(r.success).toBe(false);
  });

  it("rejects an unknown US state code in license_states", () => {
    const r = inviteSchema.safeParse({
      email: "agent@example.com",
      role: "agent",
      full_name: "Alice",
      license_states: ["XX"],
    });
    expect(r.success).toBe(false);
  });
});
