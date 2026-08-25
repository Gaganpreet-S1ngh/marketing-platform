import { Request, Response, NextFunction } from "express";
import { Auth } from "../../utils/auth/auth";
import { userClearCookieOptions, userCookieOptions } from "../../config/cookie.config";
import { UserService } from "../../services/user.service";

export class UserController {
    private userService: UserService;
    private auth: Auth;

    constructor(userService: UserService, auth: Auth) {
        this.userService = userService;
        this.auth = auth;
    }

    //***************************************************************** AUTHORIZATION ******************************************************************************************** //

    userLogin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                res.status(400).json({
                    message: "Email and password are required",
                });
                return;
            }

            const data: any = await this.userService.userLogin(email, password);
            res.cookie("marketing-token", data.access_token, userCookieOptions);
            res.status(200).json({
                message: "User Login Successful!",
                user_id: data.user_id,
                role: data.role,
                access_token: data.access_token,
            });
        } catch (error: any) {
            res.status(401).json({
                message: "Error in user login",
                error: `User Login Error : ${error.message}`,
            });
        }
    };

    userLogout = async (req: Request, res: Response, next: NextFunction) => {
        try {
            res.clearCookie("marketing-token", userClearCookieOptions);
            res.status(200).json({
                message: "User Logout Successful!",
            });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in user logout",
                error: `User Logout Error : ${error.message}`,
            });
        }
    };

    //***************************************************************** GUEST / USER CONTROLLER ******************************************************************************************** //

    createNewUser = async (req: Request, res: Response) => {
        try {
            const userName = req.body.user_name;

            if (!userName) {
                res.status(400).json({
                    message: "Error in creating user",
                    error: `Please enter a user name`,
                });
                return;
            }

            const result = await this.userService.createNewUser(userName);
            res.status(200).json({ result, message: "Created User Successfully!" });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in creating user",
                error: `User Create Error : ${error.message}`,
            });
        }
    };

    getUser = async (req: Request, res: Response) => {
        try {
            const authUser = this.auth.getCurrentUser(req);
            if (!authUser || !authUser.user_id) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const userDetails: any = await this.userService.getUserByID(authUser.user_id);
            res.status(200).json({
                data: {
                    user_id: authUser.user_id,
                    role: authUser.role,
                    email: authUser.email,
                    user: userDetails?.user || userDetails,
                },
                message: "Fetched User Details Successfully!",
            });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in getting user",
                error: `User Fetch Error : ${error.message}`,
            });
        }
    };

    getUsers = async (req: Request, res: Response) => {
        try {
            const limit = Number(req.query.limit) || 20;
            const offset = Number(req.query.offset) || 0;
            const cursor = (req.query.cursor as string) || undefined;

            const result = await this.userService.getAllUsers(limit, offset, cursor);

            res.status(200).json({
                data: result.data,
                next_cursor: result.next_cursor,
                has_more: result.has_more,
                message: "Fetched All Users Successfully!",
            });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in getting all users",
                error: `All User Fetch Error : ${error.message}`,
            });
        }
    };

    changeUserPassword = async (req: Request, res: Response) => {
        try {
            const userID = req.params.id;
            const password = req.body.password;
            const oldPassword = req.body.old_password;

            if (!userID) {
                res.status(400).json({
                    message: "Error in updating user",
                    error: `Please provide valid userID`,
                });
                return;
            }
            if (!password) {
                res.status(400).json({
                    message: "Error in updating user",
                    error: `Please provide valid password`,
                });
                return;
            }

            const result = await this.userService.changeUserPassword(userID, oldPassword, password);
            res.status(200).json({ result, message: "Updated User Password Successfully!" });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in updating user key",
                error: `User Key Update Error : ${error.message}`,
            });
        }
    };

    updateUserPassword = async (req: Request, res: Response) => {
        try {
            const userID = req.params.id;

            if (!userID) {
                res.status(400).json({
                    message: "Error in updating user",
                    error: `Please provide valid userID`,
                });
                return;
            }

            const result = await this.userService.updateUserPassword(userID);
            res.status(200).json({ result, message: "Updated User Password Successfully!" });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in updating user key",
                error: `User Key Update Error : ${error.message}`,
            });
        }
    };

    deleteUser = async (req: Request, res: Response) => {
        try {
            const userID = req.params.id;

            if (!userID) {
                res.status(400).json({
                    message: "Error in deleting user",
                    error: `Please provide userID`,
                });
                return;
            }

            const result = await this.userService.deleteUser(userID);
            res.status(200).json({ result, message: "Deleted User Successfully!" });
        } catch (error: any) {
            res.status(500).json({
                message: "Error in deleting user",
                error: `User Delete Error : ${error.message}`,
            });
        }
    };
}
