import { getRedisClient, isRedisAvailable } from "../config/redis";

/**
 * Cache key prefixes for different use cases.
 */
const CACHE_KEYS = {
  CONVERSATION_EXISTS: "conversation:",
  RATE_LIMIT: "rate:",
} as const;

/**
 * TTL values in seconds.
 */
const TTL = {
  CONVERSATION_EXISTS: 6 * 60 * 60, // 6 hours
  RATE_LIMIT: 60, // 1 minute
} as const;

/**
 * Rate limit configuration.
 */
const RATE_LIMIT = {
  MAX_MESSAGES_PER_MINUTE: 15,
} as const;

/**
 * Safe wrapper for Redis operations.
 * Returns fallback value on any error.
 */
async function safeRedisOp<T>(
  operation: () => Promise<T>,
  fallback: T,
): Promise<T> {
  if (!isRedisAvailable()) {
    return fallback;
  }

  try {
    return await operation();
  } catch (err) {
    console.error("[Cache] Redis operation failed:", err);
    return fallback;
  }
}

/**
 * Cache utilities for conversation session existence.
 */
export const sessionCache = {
  /**
   * Check if a conversation exists in cache.
   * Returns null if not cached (caller should check DB).
   */
  async exists(conversationId: string): Promise<boolean | null> {
    return safeRedisOp(async () => {
      const client = getRedisClient();
      if (!client) return null;

      const key = `${CACHE_KEYS.CONVERSATION_EXISTS}${conversationId}`;
      const result = await client.get(key);
      return result === "1" ? true : null; // null means not cached
    }, null);
  },

  /**
   * Mark a conversation as existing in cache.
   * Only caches positive existence.
   */
  async setExists(conversationId: string): Promise<void> {
    await safeRedisOp(async () => {
      const client = getRedisClient();
      if (!client) return;

      const key = `${CACHE_KEYS.CONVERSATION_EXISTS}${conversationId}`;
      await client.setex(key, TTL.CONVERSATION_EXISTS, "1");
    }, undefined);
  },
};

/**
 * Rate limiting utilities.
 */
export const rateLimiter = {
  /**
   * Check if a session has exceeded the rate limit.
   * Returns { allowed: boolean, remaining: number, retryAfter?: number }
   */
  async checkLimit(
    identifier: string,
  ): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    return safeRedisOp(
      async () => {
        const client = getRedisClient();
        if (!client) {
          // If Redis unavailable, allow all requests
          return {
            allowed: true,
            remaining: RATE_LIMIT.MAX_MESSAGES_PER_MINUTE,
          };
        }

        const key = `${CACHE_KEYS.RATE_LIMIT}${identifier}`;

        // Increment counter
        const count = await client.incr(key);

        // Set TTL on first request
        if (count === 1) {
          await client.expire(key, TTL.RATE_LIMIT);
        }

        const remaining = Math.max(
          0,
          RATE_LIMIT.MAX_MESSAGES_PER_MINUTE - count,
        );
        const allowed = count <= RATE_LIMIT.MAX_MESSAGES_PER_MINUTE;

        if (!allowed) {
          const ttl = await client.ttl(key);
          return { allowed: false, remaining: 0, retryAfter: ttl };
        }

        return { allowed, remaining };
      },
      { allowed: true, remaining: RATE_LIMIT.MAX_MESSAGES_PER_MINUTE },
    );
  },
};
