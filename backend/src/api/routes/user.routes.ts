import express, { Router, RequestHandler } from "express";
import { Auth } from "../../utils/auth/auth";
import { UserController } from "../controllers/user.controller";

export class UserRoutes {
    public router: Router;
    private auth: Auth;
    private controller: UserController;
    private authRateLimiter?: RequestHandler;

    constructor(auth: Auth, controller: UserController, authRateLimiter?: RequestHandler) {
        this.router = express.Router();
        this.auth = auth;
        this.controller = controller;
        this.authRateLimiter = authRateLimiter;

        this.initializePublicRoutes();
        this.initializePrivateRoutes();
    }

    private initializePublicRoutes() {
        if (this.authRateLimiter) {
            this.router.post("/auth/login", this.authRateLimiter, this.controller.userLogin);
        } else {
            this.router.post("/auth/login", this.controller.userLogin);
        }
    }

    private initializePrivateRoutes() {
        // LOGOUT USER
        this.router.get(
            "/auth/logout",
            this.auth.authenticate,
            this.auth.authorizeRoles("marketer", "admin"),
            this.controller.userLogout
        );

        // CREATE A NEW USER (ADMIN)
        this.router.post(
            "/",
            // this.auth.authenticate,
            // this.auth.authorizeRoles("admin"),
            this.controller.createNewUser
        );

        // GET CURRENT LOGGED IN USER FOR SESSION FETCH
        this.router.get(
            "/auth/me",
            this.auth.authenticate,
            this.auth.authorizeRoles("marketer", "admin"),
            this.controller.getUser,
        );

        // GET ALL USERS (ADMIN)
        this.router.get(
            "/",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.getUsers,
        );

        // CHANGE USER PASSWORD (MARKETER)
        this.router.patch(
            "/:id/change-password",
            this.auth.authenticate,
            this.auth.authorizeRoles("marketer"),
            this.controller.changeUserPassword,
        );

        // UPDATE USER PASSWORD (ADMIN)
        this.router.patch(
            "/:id/password",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.updateUserPassword,
        );

        // DELETE USER (ADMIN)
        this.router.delete(
            "/:id",
            this.auth.authenticate,
            this.auth.authorizeRoles("admin"),
            this.controller.deleteUser
        );
    }
}
