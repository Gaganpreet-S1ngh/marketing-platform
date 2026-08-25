export interface JwtUser {
    user_id: string;
    email: string;
    role: "guest" | "user" | "admin";
    token_type: string;
}
