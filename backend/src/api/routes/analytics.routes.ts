import express, { Router } from "express";
import { Auth } from "../../utils/auth/auth";
import { AnalyticsController } from "../controllers/analytics.controller";

export class AnalyticsRoutes {
    public router: Router;
    private auth: Auth;
    private controller: AnalyticsController;

    constructor(auth: Auth, controller: AnalyticsController) {
        this.router = express.Router();
        this.auth = auth;
        this.controller = controller;

        this.initializePrivateRoutes();
    }

    private initializePrivateRoutes() {
        // PLATFORM TOTALS (ADMIN ONLY)
        this.router.get(
            "/platform",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.getPlatformTotals
        );

        // PER-LINK STATS (ADMIN ONLY)
        this.router.get(
            "/links/:linkId",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.getLinkStats
        );

        // PER-CREATOR ROLLUP STATS (ADMIN ONLY)
        this.router.get(
            "/creators/:creatorId",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.getCreatorStats
        );
    }
}
