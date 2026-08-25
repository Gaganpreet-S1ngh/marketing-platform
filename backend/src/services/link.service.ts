import { logger } from "../utils/logger";
import { LinkRepositoryInterface } from "../interface/link.interface";
import { UserRepositoryInterface } from "../interface/user.interface";
import { generateRandomString } from "../helpers/genRandom";
import { RedisManager } from "../config/redis.config";
import { LinkType } from "../types/link.type";

export interface CreateLinkInput {
    destinationUrl?: string;
    destination_url?: string;
    creatorId?: string;
    creator_id?: string;
    expiresAt?: Date | string;
    expires_at?: Date | string;
    slug?: string;
}

export interface UpdateLinkInput {
    destinationUrl?: string;
    destination_url?: string;
    creatorId?: string;
    creator_id?: string;
    expiresAt?: Date | string;
    expires_at?: Date | string;
    isActive?: boolean;
}

const CACHE_TTL_SECONDS = 3600;

export class LinkService {
    private linkRepo: LinkRepositoryInterface;
    private userRepo: UserRepositoryInterface;

    constructor(
        linkRepo: LinkRepositoryInterface,
        userRepo: UserRepositoryInterface,
    ) {
        this.linkRepo = linkRepo;
        this.userRepo = userRepo;
    }

    public async setLinkCache(slug: string, linkData: any): Promise<void> {
        try {
            const redisKey = `link:${slug}`;
            const cacheValue = JSON.stringify({
                _id: linkData._id?.toString() || linkData.id,
                destinationUrl: linkData.destinationUrl,
                creatorId: linkData.creatorId?.toString() || linkData.creatorId,
                isActive: linkData.isActive,
                expiresAt: linkData.expiresAt ? new Date(linkData.expiresAt).toISOString() : null,
            });

            await RedisManager.instance.redisClient.set(redisKey, cacheValue, "EX", CACHE_TTL_SECONDS);
        } catch (redisError) {
            logger.warn(redisError, "Could not set Redis cache for link");
        }
    }

    async createLink(input: CreateLinkInput): Promise<LinkType & { short_url: string }> {
        try {
            const destinationUrl = input.destinationUrl || input.destination_url;
            const creatorId = input.creatorId || input.creator_id;
            const expiresAt = input.expiresAt || input.expires_at;
            const customSlug = input.slug;

            if (!destinationUrl || !this.isValidUrl(destinationUrl)) {
                throw new Error(
                    "Invalid destinationUrl. Must be a valid HTTP or HTTPS URL."
                );
            }

            if (!creatorId) {
                throw new Error("creatorId is required.");
            }

            const creator = await this.userRepo.findByID(creatorId);
            if (!creator) {
                throw new Error("Creator user not found.");
            }

            if (creator.role !== "marketer") {
                throw new Error("Creator must have the role 'marketer'.");
            }

            if (creator.status !== "active") {
                throw new Error("Creator account is not active.");
            }

            let finalSlug = "";

            if (customSlug && customSlug.trim().length > 0) {
                const trimmedSlug = customSlug.trim();
                if (!/^[a-zA-Z0-9_-]+$/.test(trimmedSlug)) {
                    throw new Error("Custom slug contains invalid characters.");
                }

                const existingSlug = await this.linkRepo.findBySlug(trimmedSlug);
                if (existingSlug) {
                    throw new Error(`Slug '${trimmedSlug}' is already in use.`);
                }

                finalSlug = trimmedSlug;
            } else {
                let isUnique = false;
                let attempts = 0;

                while (!isUnique && attempts < 10) {
                    attempts++;
                    const candidate = generateRandomString(7);
                    const existing = await this.linkRepo.findBySlug(candidate);
                    if (!existing) {
                        finalSlug = candidate;
                        isUnique = true;
                    }
                }

                if (!finalSlug) {
                    throw new Error("Failed to generate a unique slug. Please try again.");
                }
            }

            let expDateObj: Date | undefined = undefined;
            if (expiresAt) {
                expDateObj = new Date(expiresAt);
                if (isNaN(expDateObj.getTime())) {
                    throw new Error("Invalid expiration date format.");
                }
                if (expDateObj <= new Date()) {
                    throw new Error("Expiration date cannot be in the past.");
                }
            }

            const createdLink = await this.linkRepo.create({
                slug: finalSlug,
                destinationUrl: destinationUrl.trim(),
                creatorId,
                isActive: true,
                expiresAt: expDateObj,
            });

            await this.setLinkCache(finalSlug, createdLink);

            const baseUrl =
                process.env.APP_URL ||
                process.env.FRONTEND_URL ||
                `http://localhost:${process.env.PORT || 7007}`;

            const short_url = `${baseUrl}/r/${createdLink.slug}`;

            return {
                ...createdLink,
                short_url,
            };
        } catch (error) {
            logger.error(error, " : Error in creating link");
            throw error;
        }
    }

    async updateLink(linkID: string, input: UpdateLinkInput): Promise<LinkType & { short_url: string }> {
        try {
            const existingLink = await this.linkRepo.findByID(linkID);
            if (!existingLink) {
                throw new Error("Link not found");
            }

            const updateData: Partial<LinkType> = {};

            const destinationUrl = input.destinationUrl || input.destination_url;
            if (destinationUrl !== undefined) {
                if (!this.isValidUrl(destinationUrl)) {
                    throw new Error("Invalid destinationUrl. Must be a valid HTTP or HTTPS URL.");
                }
                updateData.destinationUrl = destinationUrl.trim();
            }

            const creatorId = input.creatorId || input.creator_id;
            if (creatorId !== undefined) {
                const creator = await this.userRepo.findByID(creatorId);
                if (!creator || creator.role !== "marketer" || creator.status !== "active") {
                    throw new Error("Invalid or inactive marketer creatorId");
                }
                updateData.creatorId = creatorId;
            }

            if (input.isActive !== undefined) {
                updateData.isActive = input.isActive;
            }

            const expiresAt = input.expiresAt !== undefined ? input.expiresAt : input.expires_at;
            if (expiresAt !== undefined) {
                if (!expiresAt) {
                    updateData.expiresAt = undefined;
                } else {
                    const expDate = new Date(expiresAt);
                    if (isNaN(expDate.getTime())) {
                        throw new Error("Invalid expiration date format.");
                    }
                    if (expDate <= new Date()) {
                        throw new Error("Expiration date cannot be in the past.");
                    }
                    updateData.expiresAt = expDate;
                }
            }

            const updatedLink = await this.linkRepo.update(linkID, updateData);
            if (!updatedLink) {
                throw new Error("Failed to update link");
            }

            await this.setLinkCache(updatedLink.slug, updatedLink);

            const baseUrl =
                process.env.APP_URL ||
                process.env.FRONTEND_URL ||
                `http://localhost:${process.env.PORT || 7007}`;

            const short_url = `${baseUrl}/r/${updatedLink.slug}`;

            return {
                ...updatedLink,
                short_url,
            };
        } catch (error) {
            logger.error(error, " : Error in updating link");
            throw error;
        }
    }

    async getAllLinks(limit: number = 100, offset: number = 0): Promise<Array<LinkType & { short_url: string }>> {
        try {
            const links = await this.linkRepo.getAllLinks(limit, offset);
            const baseUrl =
                process.env.APP_URL ||
                process.env.FRONTEND_URL ||
                `http://localhost:${process.env.PORT || 7007}`;

            return links.map((link) => ({
                ...link,
                short_url: `${baseUrl}/r/${link.slug}`,
            }));
        } catch (error) {
            logger.error(error, " : Error in fetching all links");
            throw error;
        }
    }

    async deleteLink(linkID: string): Promise<boolean> {
        try {
            const link = await this.linkRepo.findByID(linkID);
            if (!link) {
                throw new Error("Link not found");
            }

            const deleted = await this.linkRepo.delete(linkID);
            if (deleted) {
                try {
                    await RedisManager.instance.redisClient.del(`link:${link.slug}`);
                } catch (redisErr) {
                    logger.warn(redisErr, "Could not delete Redis cache key for link");
                }
            }

            return deleted;
        } catch (error) {
            logger.error(error, " : Error in deleting link");
            throw error;
        }
    }

    async getLinkForRedirect(slug: string): Promise<{
        destinationUrl?: string;
        status: number;
        clickData?: { linkId: any; creatorId: any };
        error?: string;
    }> {
        const redisKey = `link:${slug}`;

        try {
            const cachedStr = await RedisManager.instance.redisClient.get(redisKey);
            if (cachedStr) {
                const cached = JSON.parse(cachedStr);

                if (cached.isActive === false) {
                    return { status: 410, error: "Link is disabled" };
                }

                if (cached.expiresAt && new Date(cached.expiresAt) <= new Date()) {
                    return { status: 410, error: "Link has expired" };
                }

                return {
                    destinationUrl: cached.destinationUrl,
                    status: 302,
                    clickData: {
                        linkId: cached._id,
                        creatorId: cached.creatorId,
                    },
                };
            }
        } catch (redisErr) {
            logger.warn(redisErr, "Redis error during redirect cache check");
        }

        const link = await this.linkRepo.findBySlug(slug);
        if (!link) {
            return { status: 404, error: "Link not found" };
        }

        // Cache expired and disabled link state in Redis so spam requests to expired/disabled links don't hit MongoDB
        await this.setLinkCache(slug, link);

        if (link.isActive === false) {
            return { status: 410, error: "Link is disabled" };
        }

        if (link.expiresAt && new Date(link.expiresAt) <= new Date()) {
            return { status: 410, error: "Link has expired" };
        }

        return {
            destinationUrl: link.destinationUrl,
            status: 302,
            clickData: {
                linkId: link._id,
                creatorId: link.creatorId,
            },
        };
    }

    private isValidUrl(urlStr: string): boolean {
        if (!urlStr || typeof urlStr !== "string") return false;
        try {
            const parsed = new URL(urlStr);
            return parsed.protocol === "http:" || parsed.protocol === "https:";
        } catch {
            return false;
        }
    }
}
