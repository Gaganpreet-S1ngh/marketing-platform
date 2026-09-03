import mongoose, { Schema } from "mongoose";

const userSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ["admin", "marketer"],
            required: true,
            default: "marketer",
        },
        status: {
            type: String,
            enum: ["active", "disabled", "flagged"],
            required: true,
            default: "active",
        },
        botSeverity: {
            type: String,
            enum: ["none", "low", "medium", "high", "critical"],
            default: "none",
        },
        botMetrics: {
            totalClicks: { type: Number, default: 0 },
            botClicks: { type: Number, default: 0 },
            botRatio: { type: Number, default: 0 },
            lastEvaluatedAt: { type: Date, default: null },
        },
        organization: {
            type: String,
            default: undefined,
        },
        lastLoginAt: {
            type: Date,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ status: 1 });
userSchema.index({ botSeverity: 1 });

export const User = mongoose.model("User", userSchema);
