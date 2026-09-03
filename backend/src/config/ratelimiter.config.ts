import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import Redis from "ioredis";
import RedisStore from "rate-limit-redis";
import { getClientIp } from "../helpers/ip.helper";

// Factory function for creating Redis-backed rate limiters
export const createRateLimiter = (
  timeWindowMs: number,
  maxRequests: number,
  keyPrefix: string,
  redisClient: Redis,
  customMessage?: string
) => {
  return rateLimit({
    windowMs: timeWindowMs,
    max: maxRequests,
    message: {
      error: customMessage || "Too many requests, please try again later.",
      retryAfter: Math.ceil(timeWindowMs / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const ip = getClientIp(req);
      return `${keyPrefix}:${ipKeyGenerator(ip)}`;
    },
    store: new RedisStore({
      sendCommand: (...args: [string, ...string[]]) =>
        redisClient.call(...args) as Promise<any>,
      prefix: keyPrefix + ":",
    }),
  });
};