import { Request } from "express";

/**
 * Utility to extract the actual originating client IP address behind proxy layers (Cloudflare, Nginx, Traefik, ngrok, ALB).
 */
export function getClientIp(req: Request): string {
    // 1. Cloudflare header takes highest priority
    const cfConnectingIp = req.headers["cf-connecting-ip"];
    if (typeof cfConnectingIp === "string" && cfConnectingIp.trim().length > 0) {
        return cfConnectingIp.trim();
    }

    // 2. X-Real-IP header (set by Nginx/Traefik proxies)
    const xRealIp = req.headers["x-real-ip"];
    if (typeof xRealIp === "string" && xRealIp.trim().length > 0) {
        return xRealIp.trim();
    }

    // 3. X-Forwarded-For (first IP in comma-separated list is the original client IP)
    const xForwardedFor = req.headers["x-forwarded-for"];
    let ip = "";

    if (typeof xForwardedFor === "string" && xForwardedFor.trim().length > 0) {
        ip = xForwardedFor.split(",")[0].trim();
    } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
        ip = xForwardedFor[0].trim();
    } else {
        ip = (req.ip || req.socket.remoteAddress || "").toString().trim();
    }

    // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }

    return ip || "unknown";
}
