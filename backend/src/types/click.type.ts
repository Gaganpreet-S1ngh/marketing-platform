import { Types } from "mongoose";

export interface ClickType {
    _id?: string | Types.ObjectId;
    linkId: string | Types.ObjectId;
    creatorId: string | Types.ObjectId;
    ip?: string;
    country?: string;
    city?: string;
    device?: string;
    browser?: string;
    referrer?: string;
    userAgent?: string;
    fingerprint?: string;
    isBot?: boolean;
    botReason?: string;
    clickedAt?: Date | string;
}
