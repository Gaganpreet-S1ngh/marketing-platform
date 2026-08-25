export interface UserType {
    _id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: "admin" | "marketer";
    status: "active" | "disabled" | "flagged";
    organization?: string;
    lastLoginAt?: Date;
    createdAt?: string;
    updatedAt?: string;
}