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

export const User = mongoose.model("User", userSchema);
