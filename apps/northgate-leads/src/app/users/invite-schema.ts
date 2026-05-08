import { z } from "zod";
import { US_STATES } from "@platform/shared/validation/common";

// Single source of truth for invite-form validation. The .toLowerCase()
// transform on email is LOAD-BEARING — platform_users.email has a CHECK
// constraint forcing lowercase, and the JWT-side RLS lookup uses
// lower(). Don't add a second lowercase layer in the action; consume
// the parsed value as-is.

const ROLES = ["agent", "admin", "superadmin"] as const;

const stateValues = US_STATES as readonly [string, ...string[]];

export const inviteSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Please enter a valid email."),
    role: z.enum(ROLES, "Pick a role."),
    full_name: z.string().trim().min(1).optional(),
    license_states: z
      .array(z.enum(stateValues))
      .optional(),
  })
  .superRefine((val, ctx) => {
    if (val.role === "agent") {
      if (!val.full_name || val.full_name.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["full_name"],
          message: "Full name is required for agents.",
        });
      }
      if (!val.license_states || val.license_states.length < 1) {
        ctx.addIssue({
          code: "custom",
          path: ["license_states"],
          message: "Pick at least one license state.",
        });
      }
    }
  });

export type InviteInput = z.input<typeof inviteSchema>;
export type InviteParsed = z.output<typeof inviteSchema>;

export type InviteResult =
  | { ok: true }
  | { ok: false; error: string };
