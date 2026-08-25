import { corsOptions } from "./config/cors.config";
import { helmetOptions } from "./config/helmet.config";
import { HandleErrorWithLogger } from "./utils/errors";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import { httpLogger } from "./utils/logger";
import express, { Request, Response } from "express";
import { DatabaseManager } from "./config/database.config";

import { Auth } from "./utils/auth/auth";
import { UserRepository } from "./repository/user.repository";
import { UserController } from "./api/controllers/user.controller";
import { UserRoutes } from "./api/routes/user.routes";
import { UserService } from "./services/user.service";

import { LinkRepository } from "./repository/link.repository";
import { LinkService } from "./services/link.service";
import { LinkController } from "./api/controllers/link.controller";
import { LinkRoutes } from "./api/routes/link.routes";

import { AnalyticsRepository } from "./repository/analytics.repository";
import { AnalyticsService } from "./services/analytics.service";
import { AnalyticsController } from "./api/controllers/analytics.controller";
import { AnalyticsRoutes } from "./api/routes/analytics.routes";

import { RedisManager } from "./config/redis.config";
import { createRateLimiter } from "./config/ratelimiter.config";

export const expressApp = async () => {
  const app = express();

  // ╔══════════════════════════════════════════════════════╗
  // ║                    TRUST PROXY                       ║
  // ╚══════════════════════════════════════════════════════╝

  // Trust proxy for proper IP extraction behind Cloudflare/Nginx/ALB
  app.set("trust proxy", 1);

  // ╔══════════════════════════════════════════════════════╗
  // ║                GLOBAL SECURITY MIDDLEWARES           ║
  // ╚══════════════════════════════════════════════════════╝

  app.use(helmet(helmetOptions)); // Secure HTTP headers
  app.use(cors(corsOptions)); // Enable CORS
  app.use(cookieParser(process.env.COOKIE_SECRET));

  // ╔══════════════════════════════════════════════════════╗
  // ║             INITIALIZE DATABASE & REDIS              ║
  // ╚══════════════════════════════════════════════════════╝

  await DatabaseManager.instance.connect(
    process.env.MONGODB_URI || process.env.MONGODB_URL || "mongodb://localhost:27017/marketing_platform",
    {}
  );
  await RedisManager.instance.connect();

  // ╔══════════════════════════════════════════════════════╗
  // ║             REDIS RATE LIMITERS (ANTI-DDoS)          ║
  // ╚══════════════════════════════════════════════════════╝

  // 1. Global Anti-DDoS Rate Limiter (300 requests per 15 mins per IP)
  const globalRateLimiter = createRateLimiter(
    15 * 60 * 1000,
    300,
    "rl_global",
    RedisManager.instance.redisClient,
    "Too many requests from this IP. Access restricted to prevent abuse."
  );
  app.use(globalRateLimiter);

  // 2. Strict Auth Login Rate Limiter (5 login attempts per 15 mins per IP)
  const authRateLimiter = createRateLimiter(
    15 * 60 * 1000,
    5,
    "rl_auth",
    RedisManager.instance.redisClient,
    "Too many login attempts. Account access temporarily limited for security. Please try again in 15 minutes."
  );

  // 3. Public Redirect Rate Limiter (100 redirects per minute per IP)
  const redirectRateLimiter = createRateLimiter(
    60 * 1000,
    100,
    "rl_redirect",
    RedisManager.instance.redisClient,
    "Redirect rate limit exceeded. Please slow down your requests."
  );

  // ╔══════════════════════════════════════════════════════╗
  // ║                    BODY PARSING                      ║
  // ╚══════════════════════════════════════════════════════╝

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // ╔══════════════════════════════════════════════════════╗
  // ║                HTTP REQUEST LOGGER                   ║
  // ╚══════════════════════════════════════════════════════╝

  app.use(httpLogger);

  // ╔══════════════════════════════════════════════════════╗
  // ║                     HEALTH CHECK                     ║
  // ╚══════════════════════════════════════════════════════╝

  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json("✅ I am healthy!");
  });

  // ╔══════════════════════════════════════════════════════╗
  // ║                  DEPENDENCY INJECTIONS               ║
  // ╚══════════════════════════════════════════════════════╝

  // Authentication & Token Service
  const auth = new Auth(
    process.env.JWT_ACCESS_SECRET || "",
    process.env.JWT_REFRESH_SECRET || "",
  );

  // Repositories
  const userRepository = new UserRepository();
  const linkRepository = new LinkRepository();
  const analyticsRepository = new AnalyticsRepository();

  // User Service, Controller, Routes
  const userService = new UserService(
    userRepository,
    auth,
  );
  const userController = new UserController(userService, auth);
  const userRoutes = new UserRoutes(auth, userController, authRateLimiter);

  app.use("/api/user", userRoutes.router);

  // Link Service, Controller, Routes
  const linkService = new LinkService(linkRepository, userRepository);
  const linkController = new LinkController(linkService);
  const linkRoutes = new LinkRoutes(auth, linkController);

  app.use("/api/admin/links", linkRoutes.router);
  app.use("/api/link", linkRoutes.router);

  // Public Redirect Handlers (/r/:slug and /api/r/:slug) with redirectRateLimiter
  app.get("/r/:slug", redirectRateLimiter, linkController.handleRedirect);
  app.get("/api/r/:slug", redirectRateLimiter, linkController.handleRedirect);

  // Analytics Service, Controller, Routes
  const analyticsService = new AnalyticsService(
    analyticsRepository,
    linkRepository,
    userRepository
  );
  const analyticsController = new AnalyticsController(analyticsService);
  const analyticsRoutes = new AnalyticsRoutes(auth, analyticsController);

  app.use("/api/admin/analytics", analyticsRoutes.router);

  // ╔══════════════════════════════════════════════════════╗
  // ║                 GLOBAL ERROR HANDLER                 ║
  // ╚══════════════════════════════════════════════════════╝

  app.use(HandleErrorWithLogger);

  return app;
};
