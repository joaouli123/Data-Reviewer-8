import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

export const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    })
  : null;

if (redis) {
  redis.on("error", (err) => {
    console.error("[Redis] Connection error:", err);
  });
}