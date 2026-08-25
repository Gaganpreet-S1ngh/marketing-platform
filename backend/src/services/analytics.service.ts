import { logger } from "../utils/logger";
import { AnalyticsRepositoryInterface } from "../interface/analytics.interface";
import { LinkRepositoryInterface } from "../interface/link.interface";
import { UserRepositoryInterface } from "../interface/user.interface";

export class AnalyticsService {
    private analyticsRepo: AnalyticsRepositoryInterface;
    private linkRepo: LinkRepositoryInterface;
    private userRepo: UserRepositoryInterface;

    constructor(
        analyticsRepo: AnalyticsRepositoryInterface,
        linkRepo: LinkRepositoryInterface,
        userRepo: UserRepositoryInterface,
    ) {
        this.analyticsRepo = analyticsRepo;
        this.linkRepo = linkRepo;
        this.userRepo = userRepo;
    }

    async getLinkStats(linkId: string) {
        try {
            if (!linkId) throw new Error("linkId is required");
            const link = await this.linkRepo.findByID(linkId);
            if (!link) throw new Error("Link not found");

            const stats = await this.analyticsRepo.getLinkStats(linkId);
            return {
                link,
                stats,
            };
        } catch (error) {
            logger.error(error, " : Error in fetching link stats");
            throw error;
        }
    }

    async getCreatorStats(creatorId: string) {
        try {
            if (!creatorId) throw new Error("creatorId is required");
            const creator = await this.userRepo.findByID(creatorId);
            if (!creator) throw new Error("Creator user not found");

            const stats = await this.analyticsRepo.getCreatorStats(creatorId);
            return {
                creator: {
                    _id: creator._id,
                    name: creator.name,
                    email: creator.email,
                    role: creator.role,
                },
                stats,
            };
        } catch (error) {
            logger.error(error, " : Error in fetching creator stats");
            throw error;
        }
    }

    async getPlatformTotals() {
        try {
            const totals = await this.analyticsRepo.getPlatformTotals();
            return totals;
        } catch (error) {
            logger.error(error, " : Error in fetching platform totals");
            throw error;
        }
    }
}
