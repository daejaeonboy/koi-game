import React, { useState, useEffect } from 'react';
import { X, Tv } from 'lucide-react';
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
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isWatching && countdown > 0) {
            timer = setInterval(() => {
                setCountdown(prev => prev - 1);
            }, 1000);
        } else if (!isWatching) {
            setCountdown(15);
        }
        return () => clearInterval(timer);
    }, [isWatching, countdown]);

    if (!isOpen) return null;

    const handleWatchAd = async (adType: AdType) => {
        setCountdown(15);
        try {
            await onWatchAd(adType);
        } catch (error) {
            console.error("Ad failed:", error);
            alert("광고를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.");
        }
    };

    const progress = ((15 - countdown) / 15) * 100;

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
                    {!isWatching ? (
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
                    ) : (
                        <div className="watching-container">
                            <Tv className="tv-icon" size={48} />
                            <div className="text-center">
                                <p className="font-bold text-lg mb-1">광고 시청 중...</p>
                                <p className="text-sm text-gray-400">잠시만 기다려주세요</p>
                            </div>

                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${progress}%` }}
                                />
                            </div>

                            <div className="text-yellow-400 font-mono text-xl font-bold">
                                {countdown}s
                            </div>
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
