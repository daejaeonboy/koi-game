import React, { useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { Koi, GrowthStage } from '../types';
import { createListing } from '../services/marketplace';
import { getPhenotype, getDisplayColor } from '../utils/genetics';
import { KoiDetailModal } from './KoiDetailModal';
import { KoiCSSPreview } from './KoiCSSPreview';

interface CreateListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    kois: Koi[]; // Available kois
    userId: string;
    userNickname: string; // Should come from profile in real app, passed from App for now
    onListingCreated: (koiId: string) => void; // Code to remove koi from local pond
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
    isOpen,
    onClose,
    kois,
    userId,
    userNickname,
    onListingCreated
}) => {
    const [selectedKoiId, setSelectedKoiId] = useState<string | null>(null);
    const [buyNowPrice, setBuyNowPrice] = useState<string>('500');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Detail Modal State
    const [detailKoi, setDetailKoi] = useState<Koi | null>(null);

    // Filter eligible kois (Adults only?) - Let's allow any for now.
    const eligibleKois = kois;

    const handleSubmit = async () => {
        if (!selectedKoiId) {
            setError("판매할 코이를 선택해주세요.");
            return;
        }

        const buyNowPriceNum = parseInt(buyNowPrice);
        if (isNaN(buyNowPriceNum) || buyNowPriceNum < 100) {
            setError("판매가는 최소 100 AP 이상이어야 합니다.");
            return;
        }

        if (!userId) {
            setError("로그인이 필요합니다.");
            return;
        }

        const selectedKoi = kois.find(k => k.id === selectedKoiId);
        if (!selectedKoi) return;

        setIsSubmitting(true);
        setError(null);

        try {
            // Using buyNowPrice as both startPrice and buyNowPrice for instant sale effectively
            await createListing(userId, userNickname, selectedKoi, buyNowPriceNum, buyNowPriceNum);
            onListingCreated(selectedKoiId);
            onClose();
        } catch (e) {
            console.error(e);
            setError("판매 등록 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            {/* Detail Modal Layer */}
            {detailKoi && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center">
                    <KoiDetailModal
                        koi={detailKoi}
                        onClose={() => setDetailKoi(null)}
                        onSell={() => { }} // Hide sell/release in view-only mode
                        totalKoiCount={kois.length} // Just for prop satisfaction
                        hideActions={true}
                    />
                </div>
            )}

            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-6 relative flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-white">판매 등록</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
                </div>

                <div className="flex gap-6 flex-1 overflow-hidden">
                    {/* Left: Koi Selection */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <h3 className="text-sm text-gray-400 mb-2">판매할 코이 선택 ({eligibleKois.length})</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-800/50 rounded-lg p-2 grid grid-cols-3 gap-2 align-content-start">
                            {eligibleKois.map((koi, index) => {
                                const phenotype = getPhenotype(koi.genetics.baseColorGenes);
                                const isSelected = selectedKoiId === koi.id;

                                return (
                                    <div
                                        key={koi.id}
                                        onClick={() => setSelectedKoiId(koi.id)}
                                        className={`aspect-square rounded-lg border-2 relative cursor-pointer flex items-center justify-center transition-all ${isSelected ? 'border-cyan-400 bg-cyan-900/20' : 'border-gray-700 hover:border-gray-500 bg-gray-800'}`}
                                    >
                                        <KoiCSSPreview
                                            koi={koi}
                                            className="w-10 h-10 shadow-sm"
                                        />
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 bg-cyan-500 text-black p-0.5 rounded-full">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                        <div className="absolute bottom-1 text-[10px] text-gray-300 w-full text-center truncate px-1">
                                            {koi.name}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-64 flex flex-col gap-4">
                        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 relative">
                            {selectedKoiId ? (
                                <div className="text-center">
                                    {(() => {
                                        const k = kois.find(k => k.id === selectedKoiId);
                                        if (!k) return null;
                                        return (
                                            <>
                                                <button
                                                    onClick={() => setDetailKoi(k)}
                                                    className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                                                    title="상세 정보 보기"
                                                >
                                                    <Search size={16} />
                                                </button>
                                                <KoiCSSPreview koi={k} className="w-16 h-16 mx-auto mb-2 border-2 border-white/20 shadow-lg" />
                                                <div className="font-bold text-white">{k.name}</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {k.growthStage === GrowthStage.FRY ? '치어' : k.growthStage === GrowthStage.JUVENILE ? '준성체' : '성체'}
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-600 text-sm py-8">
                                    코이를 선택하세요
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 mb-1">판매 가격 (AP)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    value={buyNowPrice}
                                    onChange={(e) => setBuyNowPrice(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 pl-3 pr-10 text-white focus:border-cyan-500 focus:outline-none"
                                    placeholder="500"
                                    min="100"
                                />
                                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">AP</span>
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded">
                                {error}
                            </div>
                        )}

                        <div className="mt-auto">
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedKoiId || isSubmitting}
                                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? '등록 중...' : '판매 등록'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
