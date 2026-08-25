import mongoose, { Schema, Document, Types } from "mongoose";
import { LinkType } from "../types/link.type";

export interface ILinkDocument extends Omit<LinkType, "_id" | "creatorId">, Document {
    creatorId: Types.ObjectId;
}

const linkSchema = new Schema<ILinkDocument>(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            index: true,
        },
        destinationUrl: {
            type: String,
            required: true,
            trim: true,
        },
        creatorId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            default: undefined,
        },
    },
    {
        timestamps: true,
    }
);

export const LinkModel = mongoose.model<ILinkDocument>("Link", linkSchema);
export const Link = LinkModel;