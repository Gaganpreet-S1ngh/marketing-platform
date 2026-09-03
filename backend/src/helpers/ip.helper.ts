import { Request } from "express";

/**
 * Utility to extract the actual originating client IP address behind proxy layers (Nginx, ngrok, Cloudflare, ALB).
 */
export function getClientIp(req: Request): string {
    const xForwardedFor = req.headers["x-forwarded-for"];

    let ip = "";

    if (typeof xForwardedFor === "string" && xForwardedFor.trim().length > 0) {
        // X-Forwarded-For can contain multiple IP addresses: "client_ip, proxy1_ip, proxy2_ip"
        ip = xForwardedFor.split(",")[0].trim();
    } else if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
        ip = xForwardedFor[0].trim();
    } else {
        const xRealIp = req.headers["x-real-ip"];
        if (typeof xRealIp === "string" && xRealIp.trim().length > 0) {
            ip = xRealIp.trim();
        } else {
            ip = (req.ip || req.socket.remoteAddress || "").toString().trim();
        }
    }

    // Strip IPv6-mapped IPv4 prefix (e.g. ::ffff:192.168.1.1 -> 192.168.1.1)
    if (ip.startsWith("::ffff:")) {
        ip = ip.substring(7);
    }

    return ip || "unknown";
}
