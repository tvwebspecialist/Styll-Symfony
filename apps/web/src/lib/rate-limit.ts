/**
 * Lightweight in-memory rate limiter (fixed window).
 *
 * Intended for auth-gated, cost-sensitive endpoints (e.g. AI routes) to curb
 * abuse / runaway cost from a single caller. State lives in module memory, so
 * on serverless it throttles per warm instance — a pragmatic mitigation, not a
 * globally-consistent guarantee. For hard guarantees use a shared store (Redis/DB).
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastPrune = 0

function pruneExpired(now: number): void {
  // Prune at most once per minute to keep the map from growing unbounded.
  if (now - lastPrune < 60_000) return
  lastPrune = now
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  retryAfterSec: number
}

/**
 * Records a hit for `key` and returns whether it is within the limit.
 * @param key Unique identifier for the caller (e.g. `chat:${userId}`).
 * @param limit Max allowed hits within the window.
 * @param windowMs Window length in milliseconds.
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  pruneExpired(now)

  const bucket = buckets.get(key)
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) }
  }

  bucket.count++
  return { allowed: true, retryAfterSec: 0 }
}
