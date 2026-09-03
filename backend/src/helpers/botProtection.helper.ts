import crypto from "crypto";
import Redis from "ioredis";

const BOT_KEYWORDS = [
    "bot", "crawler", "spider", "headless", "curl", "wget", "python",
    "postman", "insomnia", "phantomjs", "puppeteer", "selenium", "axios",
    "httpclient", "java", "go-http-client", "node-fetch", "got", "superagent"
];

/**
 * Generates a unique 64-character SHA-256 fingerprint for every request based on IP, User-Agent, and Accept-Language.
 */
export function generateFingerprint(ip: string, userAgent: string, acceptLanguage: string): string {
    const rawString = `${ip || ""}|${userAgent || ""}|${acceptLanguage || ""}`;
    return crypto.createHash("sha256").update(rawString).digest("hex");
}

/**
 * Instant synchronous check for obvious bot User-Agents and missing headers.
 */
export function isKnownBotUserAgent(userAgent: string, acceptLanguage: string): { isBot: boolean; reason?: string } {
    const ua = (userAgent || "").toLowerCase();

    if (!ua) {
        return { isBot: true, reason: "Missing User-Agent header" };
    }

    if (!acceptLanguage) {
        return { isBot: true, reason: "Missing Accept-Language header" };
    }

    for (const keyword of BOT_KEYWORDS) {
        if (ua.includes(keyword)) {
            return { isBot: true, reason: `User-Agent contains '${keyword}'` };
        }
    }

    return { isBot: false };
}

/**
 * Rate limit check for bots using Redis counter with TTL.
 * Returns true if request count exceeds maxRequests in the given windowSeconds.
 */
export async function isBotRateLimited(
    redisClient: Redis,
    ip: string,
    fingerprint: string,
    windowSeconds: number = 60,
    maxRequests: number = 30
): Promise<boolean> {
    try {
        const key = `rl:bot:${ip || fingerprint}`;
        const current = await redisClient.incr(key);
        if (current === 1) {
            await redisClient.expire(key, windowSeconds);
        }
        return current > maxRequests;
    } catch {
        return false;
    }
}

/**
 * Checks if an IP or device fingerprint is blacklisted in Redis.
 */
export async function isBlacklistedInRedis(redisClient: Redis, ip: string, fingerprint: string): Promise<boolean> {
    try {
        const pipeline = redisClient.pipeline();
        if (ip) pipeline.get(`block:bot:ip:${ip}`);
        if (fingerprint) pipeline.get(`block:bot:fp:${fingerprint}`);
        const results = await pipeline.exec();

        if (results) {
            for (const [err, val] of results) {
                if (!err && val) return true;
            }
        }
    } catch {
        // Fallback gracefully if Redis check fails temporarily
    }
    return false;
}

/**
 * Blocks a bot IP and device fingerprint in Redis with 24h TTL to prevent key flooding.
 */
export async function blockInRedisWithTTL(redisClient: Redis, ip: string, fingerprint: string, reason?: string, ttlSeconds: number = 86400): Promise<void> {
    try {
        const pipeline = redisClient.pipeline();
        const value = JSON.stringify({ blockedAt: new Date().toISOString(), reason: reason || "Bot detected" });

        if (ip) pipeline.set(`block:bot:ip:${ip}`, value, "EX", ttlSeconds);
        if (fingerprint) pipeline.set(`block:bot:fp:${fingerprint}`, value, "EX", ttlSeconds);

        await pipeline.exec();
    } catch {
        // Redis log error handled caller-side
    }
}
