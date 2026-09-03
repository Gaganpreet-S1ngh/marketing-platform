// ========================
// Constants
// ========================

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { generateRandomString } from "../../helpers/genRandom";

import { randomInt, randomUUID } from "crypto";
import crypto from "crypto"
import { JwtUser } from "../../types/auth.type";
import { getClientIp } from "../../helpers/ip.helper";
// Change access token expiry
export const ACCESS_TOKEN_EXPIRY = "7d";

// ========================
// Auth Class
// ========================

export class Auth {
  private access_secret: string;
  private refresh_secret: string;
  // TODO : REDIS CLIENT

  constructor(accessSecret: string, refreshSecret: string) {
    this.access_secret = accessSecret;
    this.refresh_secret = refreshSecret;
  }

  // ========================
  // Password Hashing & Verification
  // ========================

  async createHashedPassword(password: string): Promise<string> {
    if (password.length < 6) {
      throw new Error("Password length should be at least 6 characters long");
    }

    return await bcrypt.hash(password, 10);
  }

  async verifyPassword(
    plainPassword: string,
    hashPassword: string,
  ): Promise<void> {
    if (plainPassword.length < 6) {
      throw new Error("Password length should be at least 6 characters long");
    }


    const match = await bcrypt.compare(plainPassword, hashPassword);
    if (!match) throw new Error("Password doesn't match");
  }

  // ========================
  // JWT Token Generation
  // ========================

  async generateAccessToken(
    userID: string,
    role: "marketer" | "admin",
    email: string,
  ): Promise<any> {
    const accessToken = jwt.sign(
      {
        user_id: userID,
        email,
        role: role,
        token_type: "access",
      },
      this.access_secret,
      {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        issuer: "marketing-platform",
        audience: "marketing-platform",
        jwtid: generateRandomString(16),
      },
    );

    return accessToken;
  }

  // ========================
  // JWT Token Verification
  // ========================

  async verifyAccessToken(token: string): Promise<any> {
    if (!token) {
      throw new Error("Invalid token or no token provided");
    }

    return jwt.verify(token, this.access_secret, {
      issuer: "marketing-platform",
      audience: "marketing-platform",
    });
  }

  // ========================
  // Redis Token Management
  // ========================

  // ========================
  // Middleware: Auth Guard
  // ========================

  authorizeRoles = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
      const user = (req as any).user as JwtUser;

      if (!user) {
        res.status(401).json({
          error: "Unauthorized",
        });

        return;
      }

      if (!roles.includes(user.role)) {
        console.log(`Forbidden: user=${user.user_id} role=${user.role} required=[${roles.join(",")}]`);
        res.status(403).json({
          error: "Forbidden",
        });

        return;
      }

      next();
    };
  };

  authenticate = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token =
        req.signedCookies["marketing-token"] ||
        req.cookies["marketing-token"] ||
        req.signedCookies["shiva-xchange-token"] ||
        (req.headers.authorization?.startsWith("Bearer ")
          ? req.headers.authorization.split(" ")[1]
          : undefined);

      let accessToken = token;

      if (token?.startsWith("s:")) {
        accessToken = token.slice(2);
      }

      if (!accessToken) {
        res.status(401).json({
          error: "Please login or register first.",
          code: "TOKEN_MISSING",
        });

        return;
      }

      const user = await this.verifyAccessToken(accessToken);


      if (user.token_type !== "access") {
        res.status(401).json({
          error: "Invalid token type",
          code: "TOKEN_TYPE_INVALID",
        });

        return;
      }

      (req as any).user = user as JwtUser;

      next();
      return;
    } catch (err: any) {
      console.log("Authorization error (outer):", err.message);
      res.status(401).json({
        error: `Authorization Failed : ${err.message}`,
      });
      return;
    }
  };

  // ========================
  // Utilities
  // ========================

  getCurrentUser(req: Request) {
    return (req as any).user as JwtUser;
  }

  generateKey(length = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    return Array.from({ length }, () =>
      chars[crypto.randomInt(chars.length)]
    ).join("");

  }

  async generateVerificationCode(): Promise<string> {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async generateRandomGuestID(): Promise<string> {
    return `guest_${randomUUID()}`;
  }

  getDeviceInfo = (req: Request) => {
    return {
      userAgent: req.get("User-Agent"),
      ip: getClientIp(req),
      platform: req.get("Sec-CH-UA-Platform"),
      timestamp: Date.now(),
    };
  };

  generatePassword = (length = 12) => {
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()-_=+";

    const allChars = lowercase + uppercase + numbers + symbols;

    // Ensure at least one character from each category
    const password = [
      lowercase[randomInt(lowercase.length)],
      uppercase[randomInt(uppercase.length)],
      numbers[randomInt(numbers.length)],
      symbols[randomInt(symbols.length)],
    ];

    // Fill remaining characters
    for (let i = password.length; i < length; i++) {
      password.push(allChars[randomInt(allChars.length)]);
    }

    // Cryptographically secure shuffle
    for (let i = password.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [password[i], password[j]] = [password[j], password[i]];
    }

    return password.join("");
  }
}


