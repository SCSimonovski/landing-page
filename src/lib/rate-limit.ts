import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: false,
  prefix: "leads-api",
});

export async function checkRateLimit(
  ip: string,
): Promise<{ ok: boolean; remaining: number }> {
  const { success, remaining } = await ratelimit.limit(ip);
  return { ok: success, remaining };
}
