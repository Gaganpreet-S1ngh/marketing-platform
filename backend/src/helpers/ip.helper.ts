import { Request } from "express";

function isPrivateIp(ip: string): boolean {
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return true;
    if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("127.")) return true;
    if (ip.startsWith("172.")) {
        const parts = ip.split(".");
        if (parts.length >= 2) {
            const secondOctet = parseInt(parts[1], 10);
            if (secondOctet >= 16 && secondOctet <= 31) return true;
        }
    }
    return false;
}

/**
 * Utility to extract the actual originating client IP address behind proxy layers (Cloudflare, Nginx, Traefik, ngrok, ALB).
 * Filters out internal cluster/proxy IPs (e.g. 10.42.x.x) to locate the first public IP in header chains.
 */
export function getClientIp(req: Request): string {
    const candidateIps: string[] = [];

    // 1. Cloudflare header
    const cf = req.headers["cf-connecting-ip"];
    if (typeof cf === "string" && cf.trim()) candidateIps.push(cf.trim());

    // 2. X-Real-IP
    const realIp = req.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.trim()) candidateIps.push(realIp.trim());

    // 3. X-Forwarded-For (can be comma-separated list of IPs)
    const xff = req.headers["x-forwarded-for"];
    if (typeof xff === "string" && xff.trim()) {
        const ips = xff.split(",").map((s) => s.trim()).filter(Boolean);
        candidateIps.push(...ips);
    } else if (Array.isArray(xff)) {
        candidateIps.push(...xff.map((s) => s.trim()).filter(Boolean));
    }

    // 4. Express request IP & Socket remoteAddress fallbacks
    if (req.ip) candidateIps.push(req.ip.trim());
    if (req.socket?.remoteAddress) candidateIps.push(req.socket.remoteAddress.trim());

    // Clean up IPv6-mapped IPv4 prefix (::ffff:1.2.3.4 -> 1.2.3.4)
    const cleaned = candidateIps.map((ip) => (ip.startsWith("::ffff:") ? ip.substring(7) : ip));

    // Find the first public (non-private) IP in the candidate chain
    const publicIp = cleaned.find((ip) => ip && !isPrivateIp(ip));

    if (publicIp) return publicIp;

    // Fall back to the first available IP if all are private/internal
    return cleaned[0] || "unknown";
}
