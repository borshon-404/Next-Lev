/**
 * Minimal fixed-window rate limiter (in-memory).
 *
 * Architecture note: on Vercel serverless each instance has its own memory, so
 * this provides per-instance protection suitable for brute-force slowing. For
 * strict global limits in production, swap the storage behind this interface
 * for a distributed store (e.g. Upstash Redis) without changing call sites.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodic cleanup so the map doesn't grow unbounded.
let cleanupTimer: ReturnType<typeof setInterval> | null = null;
function ensureCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, 60_000);
  // Don't keep the process alive just for cleanup (serverless/tests).
  if (typeof cleanupTimer === "object" && "unref" in cleanupTimer) cleanupTimer.unref();
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  ensureCleanup();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  bucket.count += 1;
  return { ok: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

/** Convenience: throw a RateLimitedError when the limit is exceeded. */
export function assertRateLimit(key: string, limit: number, windowMs: number): void {
  const result = rateLimit(key, limit, windowMs);
  if (!result.ok) {
    // Lazy import avoided to keep this module dependency-free; inline message.
    throw Object.assign(new Error("Too many attempts. Please slow down and try again later."), {
      name: "RateLimitedError",
      code: "RATE_LIMITED",
    });
  }
}

export function resetRateLimits(): void {
  buckets.clear();
}
