import mongoose, { ClientSession } from "mongoose";
import { logger } from "../utils/logger";
import { UserRepositoryInterface } from "../interface/user.interface";
import { User } from "../models/user.model";
import { UserType } from "../types/user.type";

export class UserRepository implements UserRepositoryInterface {
    private userModel: mongoose.Model<any>;
    private readonly maxRetries: number = 3;
    private readonly retryDelay: number = 1000;

    constructor() {
        this.userModel = User;
    }

    async create(userDetails: UserType): Promise<string> {
        try {
            const result = await this.userModel.create(userDetails);
            return result;
        } catch (error) {
            logger.error(error, "Create : Error creating user");
            throw error;
        }
    }


    async update(
        userID: string,
        userDetails: Partial<UserType>,
        session?: ClientSession,
    ): Promise<UserType> {
        return this.executeWithRetry(async () => {
            if (!mongoose.Types.ObjectId.isValid(userID)) {
                throw new Error(`Invalid user ID : ${userID}`);
            }

            const updateduser = await this.userModel
                .findByIdAndUpdate(
                    userID,
                    { $set: { ...userDetails, updatedAt: new Date() } },
                    { new: true, runValidators: true, session },
                )
                .lean()
                .exec();

            return updateduser;
        }, "Update");
    }

    async delete(userID: string): Promise<boolean> {
        return this.executeWithRetry(async () => {
            if (!mongoose.Types.ObjectId.isValid(userID)) {
                throw new Error(`Invalid ObjectId: ${userID}`);
            }

            const result = await this.userModel.findByIdAndDelete(userID).exec();

            if (result) {
                logger.info(`Deleted ${this.userModel.modelName} with ID: ${userID}`);
                return true;
            }

            return false;
        }, "Delete");
    }

    async findByID(userID: string): Promise<UserType> {
        return this.executeWithRetry(async () => {
            if (!mongoose.Types.ObjectId.isValid(userID)) {
                throw new Error(`Invalid ObjectId: ${userID}`);
            }

            const result = await this.userModel.findById(userID).select("+password").lean().exec();
            return result;
        }, "Find By ID");
    }

    async findByEmail(email: string): Promise<UserType> {
        return this.executeWithRetry(async () => {
            const result = await this.userModel
                .findOne({
                    email: email,
                }).select("+passwordHash")
                .lean()
                .exec();
            return result;
        }, "Find By Username");
    }

    async findByUserNameAndPlatform(
        userName: string,
        platform: string,
        session?: ClientSession,
    ): Promise<UserType> {
        return this.executeWithRetry(async () => {
            const result = await this.userModel
                .findOne({
                    platforms: {
                        $elemMatch: {
                            platform_name: platform,
                            platform_username: userName,
                        },
                    },
                })
                .session(session || null)
                .lean()
                .exec();

            return result;
        }, "Find By Username And Platform");
    }

    async getUsers(limit: number, offset: number, cursor?: string): Promise<UserType[]> {
        return this.executeWithRetry(async () => {
            const filter: any = {};
            if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
                filter._id = { $lt: new mongoose.Types.ObjectId(cursor) };
            }
            const query = this.userModel.find(filter).sort({ _id: -1 });
            if (!cursor && offset > 0) {
                query.skip(offset);
            }
            const users = await query.limit(limit).lean().exec();
            return users;
        }, "Find All");
    }


    // ╔══════════════════════════════════════════════════════╗
    // ║                    RETRY MECHANISM                   ║
    // ║   Only used for read-only / idempotent operations.   ║
    // ║   Non-idempotent writes (create, changeBalance) are  ║
    // ║   handled separately above — see notes on each.      ║
    // ╚══════════════════════════════════════════════════════╝

    private async executeWithRetry(
        operation: () => Promise<any>,
        operationName: string,
    ) {
        let lastError: any;
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;
                logger.warn(
                    `${operationName} attempt ${attempt}/${this.maxRetries} failed:`,
                    error.message,
                );

                if (attempt === this.maxRetries) {
                    break;
                }

                // Only retry on specific errors
                if (this.shouldRetry(error)) {
                    await this.delay(this.retryDelay * attempt);
                } else {
                    break;
                }
            }
        }

        logger.error(
            lastError,
            ` : ${operationName} failed after ${this.maxRetries} attempts`,
        );
        throw lastError;
    }

    private shouldRetry(error: any): boolean {
        // Retry on network errors, timeout errors, or temporary MongoDB errors.
        // Note: this list is only appropriate for read-only operations run
        // through executeWithRetry. Do not add write-oriented codes like
        // WriteConflict (112) or the TransientTransactionError label here —
        // those need whole-transaction retry, not single-operation retry.
        const retryableErrors = [
            "MongoNetworkError",
            "MongoTimeoutError",
            "MongoServerSelectionError",
            "ECONNRESET",
            "ETIMEDOUT",
        ];

        return retryableErrors.some(
            (errorType) =>
                error.name === errorType ||
                error.code === errorType ||
                (error.message && error.message.includes(errorType)),
        );
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}