import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { getResendClient } from "../resend/client";

// Swappable email transport. Pre-launch we run on Gmail SMTP (no domain
// verification needed, free, but personal-looking from-address + 500/day
// rate limit). Production switches to Resend with a verified consumer
// domain. Picking the transport at runtime via EMAIL_TRANSPORT lets us
// flip back without code changes.
//
// Both implementations are wrapped to a tiny `EmailResult` so welcome.ts
// (and any future caller) doesn't care which SDK is underneath.

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
};

export type EmailResult = {
  id: string | null;
  error: { name: string; message: string } | null;
};

export interface EmailTransport {
  send(msg: EmailMessage): Promise<EmailResult>;
}

let cached: EmailTransport | null = null;

export function getEmailTransport(): EmailTransport {
  if (cached) return cached;
  const which = process.env.EMAIL_TRANSPORT === "gmail" ? "gmail" : "resend";
  cached = which === "gmail" ? createGmailTransport() : createResendTransport();
  return cached;
}

function createResendTransport(): EmailTransport {
  return {
    async send(msg) {
      const resend = getResendClient();
      const { data, error } = await resend.emails.send(msg);
      return {
        id: data?.id ?? null,
        error: error ? { name: error.name, message: error.message } : null,
      };
    },
  };
}

function createGmailTransport(): EmailTransport {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "EMAIL_TRANSPORT=gmail but GMAIL_USER / GMAIL_APP_PASSWORD not set",
    );
  }
  const transporter: Transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
  return {
    async send(msg) {
      try {
        const info = await transporter.sendMail(msg);
        return { id: info.messageId ?? null, error: null };
      } catch (err) {
        const e = err as Error;
        return { id: null, error: { name: e.name, message: e.message } };
      }
    },
  };
}
