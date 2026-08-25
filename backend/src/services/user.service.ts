import { logger } from "../utils/logger";
import { Auth } from "../utils/auth/auth";
import { UserRepositoryInterface } from "../interface/user.interface";
import { UserType } from "../types/user.type";


export class UserService {
    private _repo: UserRepositoryInterface;
    private auth: Auth;


    constructor(
        repository: UserRepositoryInterface,
        auth: Auth,

    ) {
        this._repo = repository;
        this.auth = auth;
    }

    //***************************************************************** AUTHORIZATION ******************************************************************************************** //

    async userLogin(email: string, password: string): Promise<{
        access_token: string;
        user_id: string | undefined;
        email: string;
        role: string
    }> {
        try {
            const user = await this._repo.findByEmail(email.toLowerCase());
            if (!user) {
                throw new Error("User is not registered yet")
            }

            await this.auth.verifyPassword(
                password, user.passwordHash || ""
            )

            const accessToken = await this.auth.generateAccessToken(
                user._id || "",
                user.role,
                user.email
            )

            return {
                access_token: accessToken,
                user_id: user._id,
                email: user.email,
                role: user.role
            }

        } catch (error) {
            logger.error(error, " : Error in user login");
            throw error;
        }
    }

    //***************************************************************** USER OPERATIONS ******************************************************************************************** //


    async createNewUser(userName: string) {
        try {
            const cleanUserName = userName.trim().toLowerCase();
            const userEmail = cleanUserName + "@marketing.com"
            // check if the user exists already
            const existingUser = await this._repo.findByEmail(userEmail)
            if (existingUser) {
                throw new Error(`${cleanUserName} already exists.`);
            }

            // Generate a secure password and hash it
            const newPassword = this.auth.generatePassword();
            const hashedPassword = await this.auth.createHashedPassword(newPassword);

            const newUser: UserType = {
                email: userEmail,
                passwordHash: hashedPassword,
                status: "active",
                name: userName,
                role: "marketer"
            }

            const result = await this._repo.create(newUser);

            return {
                user_password: newPassword,
                result
            };

        } catch (error) {
            logger.error(error, " : Error in creating user");
            throw error;
        }
    }

    async getUserByID(userID: string) {
        try {
            const user = await this._repo.findByID(userID);
            if (!user) return null;
            return {
                user
            };
        } catch (error) {
            logger.error(error, " : Error fetching user by ID");
            throw error;
        }
    }

    async changeUserPassword(userID: string, oldPassword: string, newPassword: string) {
        try {
            if (!oldPassword || typeof oldPassword !== "string" || !oldPassword.trim()) {
                throw new Error("Please provide your current password.");
            }

            if (!newPassword || typeof newPassword !== "string" || newPassword.trim().length < 6) {
                throw new Error("New password must be at least 6 characters long.");
            }

            const existingUser = await this._repo.findByID(userID);

            if (!existingUser) {
                throw new Error("User is not found!");
            }

            // Check if the old password matches
            await this.auth.verifyPassword(oldPassword, existingUser.passwordHash);

            //generate a new secure password
            const hashedPassword = await this.auth.createHashedPassword(
                newPassword
            )

            const response = await this._repo.update(existingUser._id || "", {
                passwordHash: hashedPassword,
            });

            return {
                new_password: newPassword,
                user: response
            };

        } catch (error) {
            logger.error(error, " : Error in updating user password");
            throw error;
        }
    }

    async updateUserPassword(userID: string) {
        try {
            const existingUser = await this._repo.findByID(userID);

            if (!existingUser) {
                throw new Error("User is not found!");
            }

            //generate a new secure password

            const newPassword = this.auth.generatePassword()
            const hashedPassword = await this.auth.createHashedPassword(
                newPassword
            )

            const response = await this._repo.update(existingUser._id || "", {
                passwordHash: hashedPassword,
            });

            return {
                new_password: newPassword,
                user: response
            };

        } catch (error) {
            logger.error(error, " : Error in updating user password");
            throw error;
        }
    }

    async getAllUsers(
        limit: number,
        offset: number,
        cursor?: string,
    ): Promise<{ data: UserType[]; next_cursor: string | null; has_more: boolean }> {
        try {
            if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
                limit = 20;
            }

            if (!Number.isInteger(offset) || offset < 0) {
                offset = 0;
            }

            const users = await this._repo.getUsers(limit + 1, offset, cursor);
            const has_more = users.length > limit;
            const data = has_more ? users.slice(0, limit) : users;
            const next_cursor =
                has_more && data.length > 0
                    ? (data[data.length - 1] as any)._id?.toString() || null
                    : null;

            return {
                data,
                next_cursor,
                has_more,
            };
        } catch (error) {
            logger.error(error, " : Error fetching users");
            throw error;
        }
    }

    async deleteUser(userID: string): Promise<any> {
        try {
            // check if the user with this platform already exists
            const existingUser = await this._repo.findByID(userID);

            if (!existingUser) {
                throw new Error("User is not found!");
            }

            const result = await this._repo.delete(userID);
            return result;

        } catch (error) {
            logger.error(error, " : Error in deleting user");
            throw error;
        }
    }

}
