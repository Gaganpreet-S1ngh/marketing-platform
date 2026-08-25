import { Types } from "mongoose";

export interface LinkType {
    _id?: string | Types.ObjectId;
    slug: string;
    destinationUrl: string;
    creatorId: string | Types.ObjectId;
    isActive?: boolean;
    expiresAt?: Date;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
