import React, { useState } from 'react';
import { X, Tv } from 'lucide-react';
import { AdType, getAdReward } from '../services/ads';
import './AdRewardModal.css';

interface AdRewardModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentAP: number;
    onWatchAd: (adType: AdType) => Promise<void>;
    isWatching: boolean;
    watchProgress: number;
}

export const AdRewardModal: React.FC<AdRewardModalProps> = ({
    isOpen,
    onClose,
    currentAP,
    onWatchAd,
    isWatching,
    watchProgress
}) => {
    if (!isOpen) return null;

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
                    {isWatching ? (
                        <div className="watching-container">
                            <Tv size={48} className="tv-icon" />
                            <p>광고 시청 중...</p>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{ width: `${watchProgress}%` }}
                                />
                            </div>
                            <span className="progress-text">{Math.round(watchProgress)}%</span>
                        </div>
                    ) : (
                        <>
                            <button
                                className="ad-option"
                                onClick={() => onWatchAd('15sec')}
                            >
                                <div className="ad-option-icon">📺</div>
                                <div className="ad-option-info">
                                    <span className="ad-duration">15초 광고</span>
                                    <span className="ad-reward">+{getAdReward('15sec')} AP</span>
                                </div>
                            </button>

                            <button
                                className="ad-option premium"
                                onClick={() => onWatchAd('30sec')}
                            >
                                <div className="ad-option-icon">🎬</div>
                                <div className="ad-option-info">
                                    <span className="ad-duration">30초 광고</span>
                                    <span className="ad-reward">+{getAdReward('30sec')} AP</span>
                                </div>
                            </button>
                        </>
                    )}
                </div>

                <div className="ad-modal-footer">
                    현재 AP: <span className="ap-value">{currentAP.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};
