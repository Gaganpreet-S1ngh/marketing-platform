import { Types } from "mongoose";
import { logger } from "../utils/logger";
import { AnalyticsRepositoryInterface } from "../interface/analytics.interface";
import { ClickModel } from "../models/click.model";

export class AnalyticsRepository implements AnalyticsRepositoryInterface {
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000;

    // ============================================================
    // PER-LINK STATS WITH BOT BREAKDOWN & LOCATION/DEVICE META
    // ============================================================

    async getLinkStats(linkId: string): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const objectLinkId = new Types.ObjectId(linkId);

                // 1. Overall stats with cond-based real/bot breakdown
                const linkStats = await ClickModel.aggregate([
                    { $match: { linkId: objectLinkId } },
                    {
                        $group: {
                            _id: "$linkId",
                            totalClicks: { $sum: 1 },
                            realClicks: {
                                $sum: { $cond: [{ $eq: ["$isBot", false] }, 1, 0] },
                            },
                            botClicks: {
                                $sum: { $cond: [{ $eq: ["$isBot", true] }, 1, 0] },
                            },
                        },
                    },
                ]);

                // 2. City breakdown
                const cityBreakdown = await ClickModel.aggregate([
                    { $match: { linkId: objectLinkId } },
                    { $group: { _id: "$city", clicks: { $sum: 1 } } },
                    { $sort: { clicks: -1 } },
                    { $limit: 10 },
                ]);

                // 3. Country breakdown
                const countryBreakdown = await ClickModel.aggregate([
                    { $match: { linkId: objectLinkId } },
                    { $group: { _id: "$country", clicks: { $sum: 1 } } },
                    { $sort: { clicks: -1 } },
                    { $limit: 10 },
                ]);

                // 4. Device breakdown
                const deviceBreakdown = await ClickModel.aggregate([
                    { $match: { linkId: objectLinkId } },
                    { $group: { _id: "$device", clicks: { $sum: 1 } } },
                    { $sort: { clicks: -1 } },
                ]);

                // 5. Browser breakdown
                const browserBreakdown = await ClickModel.aggregate([
                    { $match: { linkId: objectLinkId } },
                    { $group: { _id: "$browser", clicks: { $sum: 1 } } },
                    { $sort: { clicks: -1 } },
                    { $limit: 10 },
                ]);

                // 6. Time-series chart (filtered for real user trends)
                const clicksByDay = await ClickModel.aggregate([
                    { $match: { linkId: objectLinkId, isBot: false } },
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$clickedAt" } },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]);

                const summary = linkStats[0] || {
                    _id: linkId,
                    totalClicks: 0,
                    realClicks: 0,
                    botClicks: 0,
                };

                const topCity = cityBreakdown.length > 0 ? cityBreakdown[0]._id : "N/A";
                const topDevice = deviceBreakdown.length > 0 ? deviceBreakdown[0]._id : "N/A";

                return {
                    summary: {
                        ...summary,
                        topCity,
                        topDevice,
                        byCity: cityBreakdown.map((c) => ({ name: c._id || "Unknown", clicks: c.clicks })),
                        byCountry: countryBreakdown.map((c) => ({ name: c._id || "Unknown", clicks: c.clicks })),
                        byDevice: deviceBreakdown.map((d) => ({ name: d._id || "Unknown", clicks: d.clicks })),
                        byBrowser: browserBreakdown.map((b) => ({ name: b._id || "Unknown", clicks: b.clicks })),
                    },
                    clicksByDay,
                };
            },
            "Get Link Stats",
        );
    }

    // ============================================================
    // PER-CREATOR ROLLUP STATS WITH BOT BREAKDOWN & AUDIENCE META
    // ============================================================

    async getCreatorStats(creatorId: string): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const objectCreatorId = new Types.ObjectId(creatorId);

                const creatorStats = await ClickModel.aggregate([
                    { $match: { creatorId: objectCreatorId } },
                    {
                        $group: {
                            _id: "$linkId",
                            realClicks: {
                                $sum: { $cond: [{ $eq: ["$isBot", false] }, 1, 0] },
                            },
                            botClicks: {
                                $sum: { $cond: [{ $eq: ["$isBot", true] }, 1, 0] },
                            },
                        },
                    },
                    {
                        $lookup: {
                            from: "links",
                            localField: "_id",
                            foreignField: "_id",
                            as: "link",
                        },
                    },
                    { $unwind: "$link" },
                    {
                        $project: {
                            linkId: "$_id",
                            slug: "$link.slug",
                            destinationUrl: "$link.destinationUrl",
                            realClicks: 1,
                            botClicks: 1,
                            totalClicks: { $add: ["$realClicks", "$botClicks"] },
                        },
                    },
                    { $sort: { realClicks: -1 } }, // Ranked strictly by real clicks
                ]);

                // Audience metadata for creator
                const cityBreakdown = await ClickModel.aggregate([
                    { $match: { creatorId: objectCreatorId } },
                    { $group: { _id: "$city", clicks: { $sum: 1 } } },
                    { $sort: { clicks: -1 } },
                    { $limit: 10 },
                ]);

                const deviceBreakdown = await ClickModel.aggregate([
                    { $match: { creatorId: objectCreatorId } },
                    { $group: { _id: "$device", clicks: { $sum: 1 } } },
                    { $sort: { clicks: -1 } },
                ]);

                const topCity = cityBreakdown.length > 0 ? cityBreakdown[0]._id : "N/A";
                const topDevice = deviceBreakdown.length > 0 ? deviceBreakdown[0]._id : "N/A";

                return {
                    links: creatorStats,
                    metadata: {
                        topCity,
                        topDevice,
                        byCity: cityBreakdown.map((c) => ({ name: c._id || "Unknown", clicks: c.clicks })),
                        byDevice: deviceBreakdown.map((d) => ({ name: d._id || "Unknown", clicks: d.clicks })),
                    },
                };
            },
            "Get Creator Stats",
        );
    }

    // ============================================================
    // PLATFORM-WIDE TOTALS WITH LOCATION & DEVICE BREAKDOWN
    // ============================================================

    async getPlatformTotals(): Promise<any> {
        return this.executeWithRetry(
            async () => {
                const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                const platformTotals = await ClickModel.aggregate([
                    {
                        $facet: {
                            totals: [
                                {
                                    $group: {
                                        _id: null,
                                        totalClicks: { $sum: 1 },
                                        realClicks: {
                                            $sum: { $cond: [{ $eq: ["$isBot", false] }, 1, 0] },
                                        },
                                        botClicks: {
                                            $sum: { $cond: [{ $eq: ["$isBot", true] }, 1, 0] },
                                        },
                                    },
                                },
                            ],
                            byCreator: [
                                { $match: { isBot: false } },
                                { $group: { _id: "$creatorId", clicks: { $sum: 1 } } },
                                { $sort: { clicks: -1 } },
                                { $limit: 10 },
                                {
                                    $lookup: {
                                        from: "users",
                                        localField: "_id",
                                        foreignField: "_id",
                                        as: "creator",
                                    },
                                },
                                { $unwind: { path: "$creator", preserveNullAndEmptyArrays: true } },
                                {
                                    $project: {
                                        _id: 1,
                                        clicks: 1,
                                        name: { $ifNull: ["$creator.name", "Marketer Account"] },
                                        email: { $ifNull: ["$creator.email", ""] },
                                    },
                                },
                            ],
                            byCity: [
                                { $group: { _id: "$city", clicks: { $sum: 1 } } },
                                { $sort: { clicks: -1 } },
                                { $limit: 10 },
                            ],
                            byCountry: [
                                { $group: { _id: "$country", clicks: { $sum: 1 } } },
                                { $sort: { clicks: -1 } },
                                { $limit: 10 },
                            ],
                            byDevice: [
                                { $group: { _id: "$device", clicks: { $sum: 1 } } },
                                { $sort: { clicks: -1 } },
                            ],
                            byBrowser: [
                                { $group: { _id: "$browser", clicks: { $sum: 1 } } },
                                { $sort: { clicks: -1 } },
                                { $limit: 10 },
                            ],
                            last7Days: [
                                { $match: { clickedAt: { $gte: sevenDaysAgo }, isBot: false } },
                                { $count: "count" },
                            ],
                        },
                    },
                ]);

                const result = platformTotals[0] || {};
                const summary = result.totals?.[0] || {
                    totalClicks: 0,
                    realClicks: 0,
                    botClicks: 0,
                };

                const byCity = (result.byCity || []).map((c: any) => ({ name: c._id || "Unknown", clicks: c.clicks }));
                const byCountry = (result.byCountry || []).map((c: any) => ({ name: c._id || "Unknown", clicks: c.clicks }));
                const byDevice = (result.byDevice || []).map((d: any) => ({ name: d._id || "Unknown", clicks: d.clicks }));
                const byBrowser = (result.byBrowser || []).map((b: any) => ({ name: b._id || "Unknown", clicks: b.clicks }));

                const topCity = byCity.length > 0 ? byCity[0].name : "N/A";
                const topDevice = byDevice.length > 0 ? byDevice[0].name : "N/A";

                return {
                    totalClicks: summary.totalClicks,
                    realClicks: summary.realClicks,
                    botClicks: summary.botClicks,
                    topCity,
                    topDevice,
                    byCreator: result.byCreator || [],
                    byCity,
                    byCountry,
                    byDevice,
                    byBrowser,
                    last7DaysClicks: result.last7Days?.[0]?.count || 0,
                };
            },
            "Get Platform Totals",
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

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;

                logger.warn(
                    `${operationName} attempt ${attempt}/${this.maxRetries} failed:`,
                    error?.message,
                );

                if (attempt === this.maxRetries) break;

                if (!this.shouldRetry(error)) break;

                await this.delay(this.retryDelay * attempt);
            }
        }

        logger.error(
            lastError,
            `: ${operationName} failed after ${this.maxRetries} attempts`,
        );

        throw lastError;
    }

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

        return retryableNetworkErrors.includes(error?.code);
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
