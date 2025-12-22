import React from 'react';
import { X } from 'lucide-react';
import { AdType, getAdReward } from '../services/ads';
import './AdRewardModal.css';

interface AdRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAP: number;
    onWatchAd: (adType: AdType) => Promise<void>;
    isWatching: boolean;
    watchProgress: number; // Keep for interface compatibility but not used
}

export const AdRewardModal: React.FC<AdRewardModalProps> = ({
    isOpen,
    onClose,
    currentAP,
    onWatchAd,
    isWatching
}) => {
    if (!isOpen) return null;

    const handleWatchAd = async (adType: AdType) => {
        try {
            await onWatchAd(adType);
        } catch (error) {
            console.error("Ad failed:", error);
            alert("광고를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    return (
        <div className="ad-modal-overlay">
            <div className="ad-modal-content">
                <div className="ad-modal-header">
                    <h2>⭐ 광고 포인트 획득</h2>
                    {!isWatching && (
                        <button className="close-btn" onClick={onClose}>
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="ad-modal-body">
                    <div className="flex flex-col gap-3">
                        <button
                            className="ad-option"
                            onClick={() => handleWatchAd('reward' as AdType)}
                            disabled={isWatching}
                        >
                            <div className="ad-option-icon">📺</div>
                            <div className="ad-option-info">
                                <span className="ad-duration">영상 광고 시청</span>
                                <span className="ad-reward">+{getAdReward('15sec')} AP</span>
                            </div>
                        </button>

                        <button
                            className="ad-option premium"
                            onClick={() => handleWatchAd('reward' as AdType)}
                            disabled={isWatching}
                        >
                            <div className="ad-option-icon">🎬</div>
                            <div className="ad-option-info">
                                <span className="ad-duration">프리미엄 광고 (준비중)</span>
                                <span className="ad-reward">+{getAdReward('30sec')} AP</span>
                            </div>
                        </button>
                    </div>
                    {isWatching && (
                        <div className="mt-4 text-center text-yellow-400 animate-pulse font-bold">
                            광고를 불러오는 중입니다...
                        </div>
                    )}
                </div>

                <div className="ad-modal-footer">
                    현재 AP: <span className="ap-value">{currentAP.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};
