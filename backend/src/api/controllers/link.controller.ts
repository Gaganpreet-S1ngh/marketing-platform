import { Request, Response } from "express";
import { LinkService } from "../../services/link.service";
import { RedisManager } from "../../config/redis.config";
import { logger } from "../../utils/logger";
import {
    generateFingerprint,
    isKnownBotUserAgent,
    isBlacklistedInRedis,
    permanentlyBlockInRedis,
} from "../../helpers/botProtection.helper";

export class LinkController {
    private linkService: LinkService;

    constructor(linkService: LinkService) {
        this.linkService = linkService;
    }

    // ============================================================
    // CREATE LINK (ADMIN ONLY)
    // ============================================================

    createLink = async (req: Request, res: Response) => {
        try {
            const { destinationUrl, destination_url, creatorId, creator_id, expiresAt, expires_at, slug } = req.body;

            const finalDestinationUrl = destinationUrl || destination_url;
            const finalCreatorId = creatorId || creator_id;

            if (!finalDestinationUrl || !finalCreatorId) {
                res.status(400).json({
                    message: "Error in creating link",
                    error: "destinationUrl and creatorId are required fields",
                });
                return;
            }

            const result = await this.linkService.createLink({
                destinationUrl: finalDestinationUrl,
                creatorId: finalCreatorId,
                expiresAt: expiresAt || expires_at,
                slug,
            });

            res.status(201).json({
                data: result,
                message: "Created Link Successfully!",
            });
        } catch (error: any) {
            res.status(400).json({
                message: "Error in creating link",
                error: `Link Create Error : ${error.message}`,
            });
        }
    };

    // ============================================================
    // GET ALL LINKS (ADMIN ONLY)
    // ============================================================

    getAllLinks = async (req: Request, res: Response) => {
        try {
            const limit = Number(req.query.limit) || 100;
            const offset = Number(req.query.offset) || 0;
            const result = await this.linkService.getAllLinks(limit, offset);
            res.status(200).json({
                data: result,
                message: "Fetched All Links Successfully!",
            });
        } catch (error: any) {
            res.status(500).json({
                message: "Error fetching links",
                error: error.message,
            });
        }
    };

    // ============================================================
    // UPDATE LINK (ADMIN ONLY)
    // ============================================================

    updateLink = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { destinationUrl, destination_url, creatorId, creator_id, isActive, expiresAt, expires_at } = req.body;

            if (!id) {
                res.status(400).json({
                    message: "Error in updating link",
                    error: "Link ID is required",
                });
                return;
            }

            const result = await this.linkService.updateLink(id, {
                destinationUrl: destinationUrl || destination_url,
                creatorId: creatorId || creator_id,
                isActive,
                expiresAt: expiresAt || expires_at,
            });

            res.status(200).json({
                data: result,
                message: "Updated Link Successfully!",
            });
        } catch (error: any) {
            res.status(400).json({
                message: "Error in updating link",
                error: `Link Update Error : ${error.message}`,
            });
        }
    };

    // ============================================================
    // DELETE LINK (ADMIN ONLY)
    // ============================================================

    deleteLink = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            if (!id) {
                res.status(400).json({
                    message: "Error deleting link",
                    error: "Link ID is required",
                });
                return;
            }

            await this.linkService.deleteLink(id);
            res.status(200).json({
                message: "Deleted Link Successfully!",
            });
        } catch (error: any) {
            res.status(400).json({
                message: "Error deleting link",
                error: error.message,
            });
        }
    };

    // ============================================================
    // REDIRECT HANDLER (PUBLIC GET /r/:slug)
    // ============================================================

    handleRedirect = async (req: Request, res: Response) => {
        try {
            const { slug } = req.params;

            if (!slug) {
                res.status(400).json({ error: "Slug parameter is required" });
                return;
            }

            const userAgent = (req.headers["user-agent"] || "") as string;
            const acceptLanguage = (req.headers["accept-language"] || "") as string;
            const rawIp = (req.ip || req.socket.remoteAddress || "").toString();

            // 1. Universal Device Fingerprint generation for every request
            const fingerprint = generateFingerprint(rawIp, userAgent, acceptLanguage);
            const redis = RedisManager.instance.redisClient;

            // 2. Check if IP or Fingerprint is permanently blacklisted in Redis
            const isBlocked = await isBlacklistedInRedis(redis, rawIp, fingerprint);
            if (isBlocked) {
                res.status(403).json({ error: "Access denied: Permanently blocked due to bot activity" });
                return;
            }

            // 3. Instant Bot Signature Check (e.g. Postman, Axios, Curl, Python, missing headers)
            const botCheck = isKnownBotUserAgent(userAgent, acceptLanguage);
            if (botCheck.isBot) {
                // Permanently block this bot IP and Fingerprint in Redis immediately
                await permanentlyBlockInRedis(redis, rawIp, fingerprint, botCheck.reason);
                logger.warn(`Permanently banned bot (${botCheck.reason}) IP: ${rawIp}, Fingerprint: ${fingerprint}`);
                res.status(403).json({ error: "Access denied: Bot activity detected" });
                return;
            }

            const result = await this.linkService.getLinkForRedirect(slug);

            if (result.status !== 302 || !result.destinationUrl) {
                res.status(result.status).json({ message: result.error || "Link not found" });
                return;
            }

            if (result.clickData) {
                const clickEvent = {
                    linkId: result.clickData.linkId,
                    creatorId: result.clickData.creatorId,
                    ip: rawIp,
                    fingerprint,
                    userAgent,
                    referrer: (req.headers["referer"] || req.headers["referrer"] || "") as string,
                    acceptLanguage,
                    clickedAt: new Date().toISOString(),
                };

                redis
                    .xadd("click_events", "MAXLEN", "~", "10000", "*", "event", JSON.stringify(clickEvent))
                    .catch((err) => logger.error("click stream push failed", err));
            }

            res.redirect(302, result.destinationUrl);
        } catch (error: any) {
            logger.error(error, "Error in handleRedirect");
            res.status(500).json({ error: "Internal server error" });
        }
    };
}
