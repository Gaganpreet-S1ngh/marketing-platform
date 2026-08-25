import { LinkType } from "../types/link.type";

export interface LinkRepositoryInterface {
    create(linkDetails: Partial<LinkType>): Promise<LinkType>;
    findBySlug(slug: string): Promise<LinkType | null>;
    findByID(linkID: string): Promise<LinkType | null>;
    update(linkID: string, linkDetails: Partial<LinkType>): Promise<LinkType | null>;
    delete(linkID: string): Promise<boolean>;
    getAllLinks(limit?: number, offset?: number): Promise<LinkType[]>;
}
