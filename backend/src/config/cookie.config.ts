import { CookieOptions } from "express";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const
  userCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    signed: true,
  };

export const
  userClearCookieOptions: CookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    signed: true,
  };

export const adminCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  maxAge: SEVEN_DAYS,
  signed: true,
};

export const adminClearCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  domain: process.env.COOKIE_DOMAIN || undefined,
  path: "/",
  signed: true,
};