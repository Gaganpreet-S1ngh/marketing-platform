import mongoose, { Schema, Document, Types } from "mongoose";
import { ClickType } from "../types/click.type";

export interface IClickDocument extends Omit<ClickType, "_id" | "linkId" | "creatorId">, Document {
    linkId: Types.ObjectId;
    creatorId: Types.ObjectId;
}

const clickSchema = new Schema<IClickDocument>(
    {
        linkId: {
            type: Schema.Types.ObjectId,
            ref: "Link",
            required: true,
            index: true,
        },
        creatorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        ip: {
            type: String,
            default: null,
        },
        country: {
            type: String,
            default: null,
        },
        city: {
            type: String,
            default: null,
        },
        device: {
            type: String,
            default: null,
        },
        browser: {
            type: String,
            default: null,
        },
        referrer: {
            type: String,
            default: null,
        },
        userAgent: {
            type: String,
            default: null,
        },
        isBot: {
            type: Boolean,
            default: false,
            index: true,
        },
        botReason: {
            type: String,
            default: null,
        },
        clickedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
    },
    {
        timestamps: false,
    }
);

// Compound indexes for optimal aggregation performance
clickSchema.index({ linkId: 1, isBot: 1 });
clickSchema.index({ creatorId: 1, isBot: 1 });
clickSchema.index({ isBot: 1, clickedAt: -1 });

export const ClickModel = mongoose.model<IClickDocument>("Click", clickSchema);
