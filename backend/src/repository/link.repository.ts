import { logger } from "../utils/logger";
import { LinkType } from "../types/link.type";
import { LinkRepositoryInterface } from "../interface/link.interface";
import { LinkModel } from "../models/link.model";

export class LinkRepository implements LinkRepositoryInterface {
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000;

    // ============================================================
    // CREATE
    // ============================================================

    async create(linkDetails: Partial<LinkType>): Promise<LinkType> {
        try {
            const createdLink = new LinkModel({
                slug: linkDetails.slug,
                destinationUrl: linkDetails.destinationUrl,
                creatorId: linkDetails.creatorId,
                isActive: linkDetails.isActive ?? true,
                expiresAt: linkDetails.expiresAt ?? undefined,
            });

            await createdLink.save();

            return (createdLink.toObject() as unknown) as LinkType;
        } catch (error) {
            logger.error(
                error,
                "Create : Error creating link",
            );

            throw error;
        }
    }

    // ============================================================
    // UPDATE
    // ============================================================

    async update(linkID: string, linkDetails: Partial<LinkType>): Promise<LinkType | null> {
        return this.executeWithRetry(
            async () => {
                const updated = await LinkModel.findByIdAndUpdate(
                    linkID,
                    { $set: linkDetails },
                    { new: true }
                ).lean();

                if (!updated) return null;
                return (updated as unknown) as LinkType;
            },
            "Update Link",
        );
    }

    // ============================================================
    // DELETE LINK
    // ============================================================

    async delete(linkID: string): Promise<boolean> {
        return this.executeWithRetry(
            async () => {
                const deleted = await LinkModel.findByIdAndDelete(linkID);
                return !!deleted;
            },
            "Delete Link",
        );
    }

    // ============================================================
    // GET ALL LINKS
    // ============================================================

    async getAllLinks(limit: number = 100, offset: number = 0): Promise<LinkType[]> {
        return this.executeWithRetry(
            async () => {
                const links = await LinkModel.find({})
                    .sort({ createdAt: -1 })
                    .skip(offset)
                    .limit(limit)
                    .lean();

                return (links as unknown) as LinkType[];
            },
            "Get All Links",
        );
    }

    // ============================================================
    // FIND BY SLUG
    // ============================================================

    async findBySlug(slug: string): Promise<LinkType | null> {
        return this.executeWithRetry(
            async () => {
                const result = await LinkModel.findOne({ slug }).lean();
                if (!result) return null;
                return (result as unknown) as LinkType;
            },
            "Find By Slug",
        );
    }

    // ============================================================
    // FIND BY ID
    // ============================================================

    async findByID(linkID: string): Promise<LinkType | null> {
        return this.executeWithRetry(
            async () => {
                const result = await LinkModel.findById(linkID).lean();
                if (!result) return null;
                return (result as unknown) as LinkType;
            },
            "Find By ID",
        );
    }

    // ============================================================
    // RETRY MECHANISM
    // ============================================================

    private async executeWithRetry<T>(
        operation: () => Promise<T>,
        operationName: string,
    ): Promise<T> {
        let lastError: unknown;

        for (
            let attempt = 1;
            attempt <= this.maxRetries;
            attempt++
        ) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;

                logger.warn(
                    `${operationName} attempt ${attempt}/${this.maxRetries} failed:`,
                    error?.message,
                );

                if (attempt === this.maxRetries) {
                    break;
                }

                if (!this.shouldRetry(error)) {
                    break;
                }

                await this.delay(
                    this.retryDelay * attempt,
                );
            }
        }

        logger.error(
            lastError,
            `: ${operationName} failed after ${this.maxRetries} attempts`,
        );

        throw lastError;
    }

    // ============================================================
    // RETRYABLE ERRORS
    // ============================================================

    private shouldRetry(error: any): boolean {
        const retryableNames = [
            "MongoNetworkError",
            "MongoServerSelectionError",
            "MongoTimeoutError",
        ];

        if (error?.name && retryableNames.includes(error.name)) {
            return true;
        }

        const retryableNetworkErrors = [
            "ECONNRESET",
            "ECONNREFUSED",
            "ETIMEDOUT",
            "EPIPE",
        ];

        return retryableNetworkErrors.includes(
            error?.code,
        );
    }

    // ============================================================
    // DELAY
    // ============================================================

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) =>
            setTimeout(resolve, ms),
        );
    }
}
