// services/ads.ts
import { AdMob, RewardAdOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export type AdType = 'reward';

// Google Test Ad Unit ID for Rewarded Video (Android)
const AD_UNIT_ID = 'ca-app-pub-3940256099942544/5224354917';

// AdSense H5 Types
declare global {
    interface Window {
        adBreak?: (options: any) => void;
        adConfig?: (options: any) => void;
    }
}

export const initializeAdMob = async () => {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
        console.log('[AdService] Web platform detected. Initializing AdSense H5...');
        // AdSense H5 is initialized via script tag in index.html
        // We can set global config here if needed
        if (window.adConfig) {
            window.adConfig({
                sound: 'on',
                preloadAdBreaks: 'on'
            });
        }
        return;
    }

    try {
        await AdMob.initialize({
            testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Add test devices if needed
            initializeForTesting: true,
        });
        console.log('[AdMob] Initialized');
    } catch (e) {
        console.error('[AdMob] Initialization failed', e);
    }
};

export const prepareRewardAd = async () => {
    const platform = Capacitor.getPlatform();
    if (platform === 'web') {
        // H5 Ads usually preload automatically or via adConfig, 
        // but currently there's no explicit manual preload API like AdMob's prepare
        return;
    }

    try {
        const options: RewardAdOptions = {
            adId: AD_UNIT_ID,
        };
        await AdMob.prepareRewardVideoAd(options);
        console.log('[AdMob] Reward video prepared');
    } catch (e) {
        console.error('[AdMob] Failed to prepare reward video', e);
    }
};

export const showRewardAd = async (): Promise<boolean> => {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
        return new Promise((resolve) => {
            if (typeof window.adBreak !== 'function') {
                console.warn('[AdService] adBreak function not found. Is AdSense script loaded?');
                // Fallback for dev environment without valid ad script loading (e.g. adblocker)
                // Simulate success for testing flow
                setTimeout(() => resolve(true), 1000);
                return;
            }

            window.adBreak({
                type: 'reward',
                name: 'reward_ad',
                beforeAd: () => {
                    console.log('[AdSense] Ad starting...');
                },
                afterAd: () => {
                    console.log('[AdSense] Ad finished');
                },
                adBreakDone: (placementInfo: any) => {
                    console.log('[AdSense] adBreakDone', placementInfo);
                    // breakStatus: 'viewed', 'dismissed', 'timeout', 'error', 'notReady'
                    if (placementInfo.breakStatus === 'viewed') {
                        resolve(true);
                    } else {
                        console.log('[AdSense] Ad not viewed completely:', placementInfo.breakStatus);
                        resolve(false);
                    }
                }
            });
        });
    }

    // Native AdMob Logic
    return new Promise((resolve) => {
        const showAd = async () => {
            try {
                const rewardItem = await AdMob.showRewardVideoAd();
                console.log('[AdMob] Ad watched, reward:', rewardItem);
                resolve(true);
            } catch (e) {
                console.error('[AdMob] Failed to show reward video', e);
                // Try to prepare again for next time
                await prepareRewardAd();
                resolve(false);
            }
        };
        showAd();
    });
};

export const getAdReward = (adType: string): number => {
    // Fixed reward amount for simplicity
    if (adType === '30sec') return 500;
    return 200; // default/15sec
};
