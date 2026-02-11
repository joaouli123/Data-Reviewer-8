import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

export const redis = REDIS_URL
  ? new Redis(REDIS_URL, {
      maxRetriesPerRequest: 5,
      enableReadyCheck: true,
      retryStrategy(times) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
      reconnectOnError(err) {
        const targetError = "READONLY";
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
      tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
    })
  : null;

if (redis) {
  redis.on("error", (err) => {
    console.error("[Redis] Connection error:", err.message);
  });
  redis.on("connect", () => {
    console.log("[Redis] Connected successfully");
  });
}