export type BotSeverity = "none" | "low" | "medium" | "high" | "critical";

export interface BotMetrics {
    totalClicks: number;
    botClicks: number;
    botRatio: number;
    lastEvaluatedAt?: Date;
}

export interface UserType {
    _id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: "admin" | "marketer";
    status: "active" | "disabled" | "flagged";
    botSeverity?: BotSeverity;
    botMetrics?: BotMetrics;
    organization?: string;
    lastLoginAt?: Date;
    createdAt?: string;
    updatedAt?: string;
}