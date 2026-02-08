// services/ads.ts

export type AdType = 'reward';

// AdSense H5 Types
declare global {
    interface Window {
        adBreak?: (options: any) => void;
        adConfig?: (options: any) => void;
    }
}

export const initializeAds = async () => {
    console.log('[AdService] Web platform detected. Initializing AdSense H5...');
    // AdSense H5 is initialized via script tag in index.html
    if (window.adConfig) {
        window.adConfig({
            sound: 'on',
            preloadAdBreaks: 'on'
        });
    }
};

export const prepareRewardAd = async () => {
    // Web AdSense H5 does not provide explicit preload API.
    return;
};

export const showRewardAd = async (): Promise<boolean> => {
    return new Promise((resolve) => {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Fallback mock ad for local/dev or when ad script is not ready.
        if (typeof window.adBreak !== 'function') {
            console.log('[AdService] adBreak function not found or pending. Using mock ad (15s)...');
            setTimeout(() => {
                console.log('[AdService] Mock ad completed.');
                resolve(true);
            }, 15000);
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
                if (placementInfo.breakStatus === 'viewed' || (isLocal && placementInfo.breakStatus !== 'dismissed')) {
                    if (isLocal && placementInfo.breakStatus !== 'viewed') {
                        console.log('[AdService] Localhost override: granting reward despite breakStatus:', placementInfo.breakStatus);
                    }
                    resolve(true);
                } else {
                    console.log('[AdSense] Ad not viewed completely:', placementInfo.breakStatus);
                    resolve(false);
                }
            }
        });
    });
};

export const getAdReward = (adType: string): number => {
    // Fixed reward amount for simplicity
    if (adType === '30sec') return 500;
    return 200; // default/15sec
};
