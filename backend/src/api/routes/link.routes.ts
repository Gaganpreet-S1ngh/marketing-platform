import express, { Router } from "express";
import { Auth } from "../../utils/auth/auth";
import { LinkController } from "../controllers/link.controller";

export class LinkRoutes {
    public router: Router;
    private auth: Auth;
    private controller: LinkController;

    constructor(auth: Auth, controller: LinkController) {
        this.router = express.Router();
        this.auth = auth;
        this.controller = controller;

        this.initializePrivateRoutes();
    }

    private initializePrivateRoutes() {
        // GET ALL LINKS (ADMIN ONLY)
        this.router.get(
            "/",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.getAllLinks
        );

        // CREATE LINK (ADMIN ONLY)
        this.router.post(
            "/",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.createLink
        );

        // UPDATE LINK (ADMIN ONLY)
        this.router.patch(
            "/:id",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.updateLink
        );

        // DELETE LINK (ADMIN ONLY)
        this.router.delete(
            "/:id",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.deleteLink
        );
    }
}
