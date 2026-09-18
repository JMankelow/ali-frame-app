export const MARKETING_CATEGORIES = ["BRANDING", "LOGO", "SOCIAL_MEDIA", "PENDING_CONTENT"] as const;
export type MarketingCategory = (typeof MARKETING_CATEGORIES)[number];
