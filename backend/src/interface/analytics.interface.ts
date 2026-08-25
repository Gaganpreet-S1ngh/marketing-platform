export interface AnalyticsRepositoryInterface {
    getLinkStats(linkId: string): Promise<any>;
    getCreatorStats(creatorId: string): Promise<any>;
    getPlatformTotals(): Promise<any>;
}
