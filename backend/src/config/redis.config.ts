import Redis from "ioredis";
import { logger } from "../utils/logger";

export class RedisManager {
    private static _instance: RedisManager;
    private _redisClient: Redis | null = null;
    private _redisSession: Redis | null = null;
    private _isConnected = false;

    static get instance() {
        if (!this._instance) {
            this._instance = new RedisManager();
        }

        return this._instance;
    }

    public async connect() {
        if (this._isConnected) return;

        try {
            const redisPassword = process.env.REDIS_PASSWORD || undefined;

            this._redisClient = new Redis({
                host: process.env.REDIS_HOST || "localhost",
                port: Number(process.env.REDIS_PORT) || 6379,
                password: redisPassword,
                db: Number(process.env.REDIS_DB) || 0,
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                keepAlive: 30000,
                family: 4,
                connectTimeout: 10000,
                commandTimeout: 5000,
            });

            this._redisSession = new Redis({
                host: process.env.REDIS_HOST || "localhost",
                port: Number(process.env.REDIS_PORT) || 6379,
                password: redisPassword,
                db: 1, // Use separate database for sessions
                maxRetriesPerRequest: 3,
                lazyConnect: true,
                keepAlive: 30000,
                family: 4,
                connectTimeout: 10000,
                commandTimeout: 5000,
            });

            // Register error and connection handlers BEFORE connecting to capture auth errors cleanly
            this._redisClient.on("connect", () => {
                logger.info("Redis connected successfully");
            });

            this._redisClient.on("error", (err) => {
                logger.error("Redis connection error:", err);
            });

            this._redisClient.on("ready", () => {
                logger.info("Redis ready to accept commands");
            });

            this._redisSession.on("connect", () => {
                logger.info("Redis session store connected");
            });

            this._redisSession.on("error", (err) => {
                logger.error("Redis session store error:", err);
            });

            // Actually connect
            await Promise.all([
                this._redisClient.connect(),
                this._redisSession.connect(),
            ]);

            this._isConnected = true;
            logger.info("Redis Manager: All connections established successfully");
        } catch (error) {
            this._isConnected = false;

            // Cleanup on failure
            await this._cleanup();

            logger.error("Redis Manager: Failed to connect:", error);
            throw new Error(
                `Redis connection failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
        }
    }

    private async _cleanup(): Promise<void> {
        const promises: any = [];

        if (this._redisClient) {
            promises.push(this._redisClient.disconnect());
            this._redisClient = null;
        }

        if (this._redisSession) {
            promises.push(this._redisSession.disconnect());
            this._redisSession = null;
        }

        await Promise.allSettled(promises);
    }

    public async disconnect(): Promise<void> {
        if (!this._isConnected) return;

        try {
            await Promise.all([
                this._redisClient?.quit(),
                this._redisSession?.quit(),
            ]);

            this._isConnected = false;
            this._redisClient = null;
            this._redisSession = null;

            logger.info("Redis connections closed successfully");
        } catch (error) {
            logger.error("Error during Redis disconnect:", error);
            throw error;
        }
    }

    get redisClient(): Redis {
        if (!this._redisClient) {
            throw new Error("Redis client not initialized. Call connect() first.");
        }
        return this._redisClient;
    }

    get redisSession(): Redis {
        if (!this._redisSession) {
            throw new Error("Redis session not initialized. Call connect() first.");
        }
        return this._redisSession;
    }
}
