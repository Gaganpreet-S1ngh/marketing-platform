import { Request, Response } from "express";
import { AnalyticsService } from "../../services/analytics.service";

export class AnalyticsController {
    private analyticsService: AnalyticsService;

    constructor(analyticsService: AnalyticsService) {
        this.analyticsService = analyticsService;
    }

    getLinkStats = async (req: Request, res: Response) => {
        try {
            const { linkId } = req.params;
            const result = await this.analyticsService.getLinkStats(linkId);

            res.status(200).json({
                data: result,
                message: "Fetched link analytics successfully!",
            });
        } catch (error: any) {
            res.status(400).json({
                message: "Error fetching link analytics",
                error: error.message,
            });
        }
    };

    getCreatorStats = async (req: Request, res: Response) => {
        try {
            const { creatorId } = req.params;
            const result = await this.analyticsService.getCreatorStats(creatorId);

            res.status(200).json({
                data: result,
                message: "Fetched creator analytics successfully!",
            });
        } catch (error: any) {
            res.status(400).json({
                message: "Error fetching creator analytics",
                error: error.message,
            });
        }
    };

    getPlatformTotals = async (req: Request, res: Response) => {
        try {
            const result = await this.analyticsService.getPlatformTotals();

            res.status(200).json({
                data: result,
                message: "Fetched platform totals successfully!",
            });
        } catch (error: any) {
            res.status(500).json({
                message: "Error fetching platform totals",
                error: error.message,
            });
        }
    };
}
