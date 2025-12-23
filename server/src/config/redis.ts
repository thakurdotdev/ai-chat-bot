import Redis from "ioredis";
import { env } from "./env";

/**
 * Redis client singleton.
 * Lazily initialized only when REDIS_URL is provided.
 * Returns null if Redis is not configured.
 */
let redisClient: Redis | null = null;
let hasLoggedWarning = false;

/**
 * Get the Redis client instance.
 * Returns null if Redis is not configured or connection fails.
 */
export function getRedisClient(): Redis | null {
  if (!env.REDIS_URL) {
    if (!hasLoggedWarning) {
      console.log("[Redis] REDIS_URL not configured. Running without Redis.");
      hasLoggedWarning = true;
    }
    return null;
  }

  if (!redisClient) {
    try {
      redisClient = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => {
          if (times > 3) {
            console.warn("[Redis] Max retries reached. Disabling Redis.");
            return null; // Stop retrying
          }
          return Math.min(times * 100, 2000);
        },
        lazyConnect: true,
      });

      redisClient.on("error", (err) => {
        console.error("[Redis] Connection error:", err.message);
      });

      redisClient.on("connect", () => {
        console.log("[Redis] Connected successfully.");
      });

      // Connect lazily
      redisClient.connect().catch((err) => {
        console.error("[Redis] Failed to connect:", err.message);
        redisClient = null;
      });
    } catch (err) {
      console.error("[Redis] Failed to initialize:", err);
      redisClient = null;
    }
  }

  return redisClient;
}

/**
 * Check if Redis is available and connected.
 */
export function isRedisAvailable(): boolean {
  const client = getRedisClient();
  return client !== null && client.status === "ready";
}

/**
 * Gracefully close Redis connection.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
