import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Per-route rate limiters with separate Redis prefixes (so the buckets
// don't share — a /api/leads burst doesn't lock out /api/health probes
// from the same IP, and vice versa). Reuses the same Upstash project.

const leadsRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: false,
  prefix: "leads-api",
});

const healthRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 h"),
  analytics: false,
  prefix: "health-api",
});

export async function checkRateLimit(
  ip: string,
): Promise<{ ok: boolean; remaining: number }> {
  const { success, remaining } = await leadsRatelimit.limit(ip);
  return { ok: success, remaining };
}

// Lenient rate limit for /api/health. Real monitoring tools poll on a
// schedule (typically once a minute), so 10/hour is generous for legit use
// but cuts off bots probing the endpoint brute-force-style after CT-log
// discovery of the deploy URL.
export async function checkHealthRateLimit(
  ip: string,
): Promise<{ ok: boolean; remaining: number }> {
  const { success, remaining } = await healthRatelimit.limit(ip);
  return { ok: success, remaining };
}
