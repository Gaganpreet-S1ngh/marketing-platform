import { ClientSession } from "mongoose";
import { UserType } from "../types/user.type";

export interface UserRepositoryInterface {
    create(userDetails: UserType): Promise<string>;
    update(
        userID: string,
        userDetails: Partial<UserType>,
        session?: ClientSession,
    ): Promise<UserType>;
    delete(userID: string): Promise<boolean>;
    findByID(userID: string): Promise<UserType>;
    findByEmail(email: string): Promise<UserType>;
    getUsers(
        limit: number,
        offset: number,
        cursor?: string,
    ): Promise<UserType[]>;
}