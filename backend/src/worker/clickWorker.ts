import "../config/env.config";
import path from "path";
import fs from "fs";
import maxmind, { CityResponse, Reader } from "maxmind";
import { DatabaseManager } from "../config/database.config";
import { RedisManager } from "../config/redis.config";
import { ClickModel } from "../models/click.model";
import { User } from "../models/user.model";
import { logger } from "../utils/logger";
import { UAParser } from "ua-parser-js";

const STREAM_KEY = "click_events";
const GROUP = "click_worker_group";
const CONSUMER = `worker_${process.pid}`;
const BATCH_SIZE = 100;
const BATCH_INTERVAL_MS = 500;

let geoReader: Reader<CityResponse> | null = null;

async function initGeoReader(): Promise<void> {
    try {
        const primaryPath = path.join(process.cwd(), "GeoLite2-City.mmdb");
        const fallbackPath = path.join(__dirname, "../../GeoLite2-City.mmdb");

        const targetPath = fs.existsSync(primaryPath)
            ? primaryPath
            : fs.existsSync(fallbackPath)
                ? fallbackPath
                : null;

        if (!targetPath) {
            logger.warn("GeoLite2-City.mmdb file not found. GeoIP resolution will fall back to Unknown.");
            return;
        }

        geoReader = await maxmind.open<CityResponse>(targetPath);
        logger.info(`MaxMind MMDB initialized successfully from: ${targetPath}`);
    } catch (err) {
        logger.error(err, "Failed to initialize MaxMind MMDB reader");
    }
}

interface RawClickEvent {
    streamId: string;
    linkId: string;
    creatorId: string;
    ip: string;
    userAgent: string;
    referrer: string;
    acceptLanguage: string;
    clickedAt: string;
}

function parseUA(userAgent: string) {
    try {
        const parser = new UAParser(userAgent);
        const res = parser.getResult();
        return {
            device: res.device.type || "desktop",
            browser: res.browser.name || "unknown",
        };
    } catch {
        return { device: "desktop", browser: "unknown" };
    }
}

function geoLookup(ip: string): { country: string; city: string } {
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
        return { country: "Local", city: "Localhost" };
    }

    if (!geoReader) {
        return { country: "Unknown", city: "Unknown" };
    }

    try {
        const response = geoReader.get(ip);
        if (!response) {
            return { country: "Unknown", city: "Unknown" };
        }

        const country =
            response.country?.names?.en ||
            response.registered_country?.names?.en ||
            response.continent?.names?.en ||
            "Unknown";

        const city = response.city?.names?.en || "Unknown";

        return { country, city };
    } catch {
        return { country: "Unknown", city: "Unknown" };
    }
}

function scoreClick(data: {
    userAgent: string;
    acceptLanguage: string;
    ip: string;
    burstCount: number;
}) {
    const ua = (data.userAgent || "").toLowerCase();
    const botKeywords = [
        "bot", "crawler", "spider", "headless", "curl", "wget", "python",
        "postman", "insomnia", "phantomjs", "puppeteer", "selenium", "axios"
    ];

    for (const keyword of botKeywords) {
        if (ua.includes(keyword)) {
            return { isBot: true, reason: `User-Agent contains '${keyword}'` };
        }
    }

    if (!ua) return { isBot: true, reason: "Missing User-Agent header" };
    if (!data.acceptLanguage) return { isBot: true, reason: "Missing Accept-Language header" };

    if (data.burstCount > 5) {
        return { isBot: true, reason: `High frequency burst (${data.burstCount} requests in batch)` };
    }

    return { isBot: false };
}

function parseStreamEntries(entries: any[]): RawClickEvent[] {
    const parsed: RawClickEvent[] = [];

    if (!entries || !Array.isArray(entries)) return parsed;

    for (const streamTuple of entries) {
        if (!Array.isArray(streamTuple) || streamTuple.length < 2) continue;
        const records = streamTuple[1];
        if (!Array.isArray(records)) continue;

        for (const record of records) {
            if (!Array.isArray(record) || record.length < 2) continue;
            const streamId = record[0];
            const keyValues = record[1];
            if (!Array.isArray(keyValues)) continue;

            for (let i = 0; i < keyValues.length; i += 2) {
                const key = keyValues[i];
                const val = keyValues[i + 1];

                if (key === "event" && val) {
                    try {
                        const payload = JSON.parse(val);
                        parsed.push({
                            streamId,
                            linkId: payload.linkId,
                            creatorId: payload.creatorId,
                            ip: payload.ip || "",
                            userAgent: payload.userAgent || "",
                            referrer: payload.referrer || "",
                            acceptLanguage: payload.acceptLanguage || "",
                            clickedAt: payload.clickedAt || new Date().toISOString(),
                        });
                    } catch (e) {
                        logger.error("Failed to parse stream click event JSON", e);
                    }
                }
            }
        }
    }

    return parsed;
}

function enrichBatch(batch: RawClickEvent[]) {
    const batchCounts: Record<string, number> = {};
    for (const c of batch) {
        const key = `${c.linkId}:${c.ip}`;
        batchCounts[key] = (batchCounts[key] || 0) + 1;
    }

    return batch.map((raw) => {
        const geo = geoLookup(raw.ip);
        const deviceInfo = parseUA(raw.userAgent);
        const key = `${raw.linkId}:${raw.ip}`;
        const burstCount = batchCounts[key] || 1;

        const botCheck = scoreClick({
            userAgent: raw.userAgent,
            acceptLanguage: raw.acceptLanguage,
            ip: raw.ip,
            burstCount,
        });

        return {
            linkId: raw.linkId,
            creatorId: raw.creatorId,
            ip: raw.ip,
            country: geo.country,
            city: geo.city,
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            referrer: raw.referrer,
            userAgent: raw.userAgent,
            isBot: botCheck.isBot,
            botReason: botCheck.reason,
            clickedAt: new Date(raw.clickedAt),
        };
    });
}

async function startWorker() {
    logger.info("Initializing Click Worker...");

    // Initialize MaxMind GeoIP Reader
    await initGeoReader();

    await DatabaseManager.instance.connect(process.env.MONGODB_URL || "mongodb://localhost:27017/marketing_platform", {});
    await RedisManager.instance.connect();

    const redis = RedisManager.instance.redisClient;

    // Setup Consumer Group
    try {
        await redis.xgroup("CREATE", STREAM_KEY, GROUP, "$", "MKSTREAM");
        logger.info(`Consumer group '${GROUP}' created for stream '${STREAM_KEY}'`);
    } catch (err: any) {
        if (!err?.message?.includes("BUSYGROUP")) {
            logger.warn(err, "XGROUP CREATE note:");
        }
    }

    logger.info(`Click worker running. Group=${GROUP}, Consumer=${CONSUMER}`);

    // Continuous Processing Loop
    while (true) {
        try {
            const entries: any = await redis.xreadgroup(
                "GROUP",
                GROUP,
                CONSUMER,
                "COUNT",
                BATCH_SIZE,
                "BLOCK",
                BATCH_INTERVAL_MS,
                "STREAMS",
                STREAM_KEY,
                ">"
            );

            if (!entries || entries.length === 0) {
                continue;
            }

            const batch = parseStreamEntries(entries);
            if (batch.length === 0) {
                continue;
            }

            const enriched = enrichBatch(batch);

            try {
                await ClickModel.insertMany(enriched, { ordered: false });
            } catch (insertError: any) {
                console.log(insertError)
                logger.error("ClickModel.insertMany partial batch warning:", insertError?.message);
            }

            // Detect creators receiving bot/burst attacks and flag them
            const flaggedCreatorIds = new Set<string>();
            for (const item of enriched) {
                if (item.isBot && item.creatorId) {
                    flaggedCreatorIds.add(item.creatorId);
                }
            }
            if (flaggedCreatorIds.size > 0) {
                for (const cId of flaggedCreatorIds) {
                    try {
                        await User.updateOne({ _id: cId, status: "active" }, { $set: { status: "flagged" } });
                        logger.warn(`Creator '${cId}' has been FLAGGED due to bot spam detection.`);
                    } catch (flagErr) {
                        logger.error(flagErr, `Failed to flag creator '${cId}'`);
                    }
                }
            }

            const streamIds = batch.map((item) => item.streamId);
            if (streamIds.length > 0) {
                await redis.xack(STREAM_KEY, GROUP, ...streamIds);
                await redis.xdel(STREAM_KEY, ...streamIds);
            }

            // Periodic trim safeguard
            await redis.xtrim(STREAM_KEY, "MAXLEN", "~", 1000).catch(() => {});
        } catch (loopError: any) {
            logger.error(loopError, "Error in worker processing loop");
            await new Promise((res) => setTimeout(res, 1000));
        }
    }
}

process.on("uncaughtException", (err) => {
    logger.error(err, "Uncaught Exception in Click Worker process");
    process.exit(1);
});

process.on("unhandledRejection", (reason) => {
    logger.error(reason, "Unhandled Rejection in Click Worker process");
    process.exit(1);
});

startWorker().catch((err) => {
    logger.error(err, "Fatal error in Click Worker process");
    process.exit(1);
});
