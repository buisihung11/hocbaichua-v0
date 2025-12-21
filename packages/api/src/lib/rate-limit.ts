/**
 * Rate limiter for Q&A chat endpoints
 * Uses Upstash Redis for distributed rate limiting
 * Limit: 20 questions per minute per user
 */

// Note: Upstash Redis setup is optional
// To enable rate limiting, install @upstash/ratelimit and @upstash/redis:
// bun add @upstash/ratelimit @upstash/redis
//
// Then add to .env:
// UPSTASH_REDIS_REST_URL=your_redis_url
// UPSTASH_REDIS_REST_TOKEN=your_redis_token
//
// Uncomment the code below to enable:

/*
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const questionRateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"), // 20 requests per 1 minute
  analytics: true,
  prefix: "@hocbaichua/chat",
});
*/

/**
 * Check if user is rate limited
 * @param _userId - User ID to check (unused until Upstash is configured)
 * @returns Promise<{success: boolean, limit: number, remaining: number, reset: number}>
 */
export async function checkRateLimit(_userId: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  // TODO: Implement rate limiting when Upstash Redis is configured
  // For now, allow all requests
  return {
    success: true,
    limit: 20,
    remaining: 20,
    reset: Date.now() + 60_000, // 1 minute from now
  };

  /* With Upstash enabled:
  const { success, limit, remaining, reset } = await questionRateLimiter.limit(userId);
  return { success, limit, remaining, reset };
  */
}
