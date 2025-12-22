// services/ads.ts
// Mock Ad Service for testing - in production this would be replaced with actual AdMob SDK

export type AdType = '15sec' | '30sec';

export interface AdReward {
    type: AdType;
    points: number;
}

const AD_REWARDS: Record<AdType, number> = {
    '15sec': 200,
    '30sec': 500,
};

// Simulate ad watching
export const watchAd = (adType: AdType): Promise<AdReward> => {
    return new Promise((resolve) => {
        const duration = adType === '15sec' ? 15000 : 30000;
        console.log(`[Mock Ad] Starting ${adType} ad...`);

        setTimeout(() => {
            console.log(`[Mock Ad] Ad completed!`);
            resolve({
                type: adType,
                points: AD_REWARDS[adType]
            });
        }, duration);
    });
};

export const getAdReward = (adType: AdType): number => {
    return AD_REWARDS[adType];
};
