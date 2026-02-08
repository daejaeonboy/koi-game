import React, { useState } from 'react';
import { X, Check, Search } from 'lucide-react';
import { Koi, GrowthStage, SavedGameState } from '../types';
import { createListingAtomic } from '../services/marketplace';
import { getPhenotype, getDisplayColor } from '../utils/genetics';
import { KoiDetailModal } from './KoiDetailModal';
import { KoiCSSPreview } from './KoiCSSPreview';

const LISTING_FEE = 100; // 등록 비용 100 AP
const MIN_PRICE = 500; // 최소 판매가 500 AP

interface CreateListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    kois: Koi[]; // Available kois
    userId: string;
    userNickname: string;
    userAP: number; // 사용자 AP 잔액
    gameState: SavedGameState;
    onListingCreated: (koiId: string, listingFee: number) => void; // 등록 비용 전달
}

export const CreateListingModal: React.FC<CreateListingModalProps> = ({
    isOpen,
    onClose,
    kois,
    userId,
    userNickname,
    userAP,
    gameState,
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
        if (isNaN(buyNowPriceNum) || buyNowPriceNum < MIN_PRICE) {
            setError(`판매가는 최소 ${MIN_PRICE.toLocaleString()} AP 이상이어야 합니다.`);
            return;
        }

        if (userAP < LISTING_FEE) {
            setError(`등록 비용(${LISTING_FEE} AP)이 부족합니다. 현재: ${userAP} AP`);
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
            // 원자적 트랜잭션 사용: 상점 등록 + 내 연못에서 제거를 한 번에 처리
            await createListingAtomic(userId, userNickname, selectedKoi, buyNowPriceNum, gameState);
            onListingCreated(selectedKoiId, LISTING_FEE);
            onClose();
        } catch (e: any) {
            console.error('[Marketplace] Error during submission:', e);
            // 에러 메시지가 있으면 우선적으로 사용하고, 없으면 기본 메시지 사용
            const errorMessage = e?.message || "판매 등록 중 오류가 발생했습니다.";
            setError(errorMessage);
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
                        <h3 className="text-sm font-bold text-gray-400 mb-3 px-1">판매할 코이 선택 ({eligibleKois.length})</h3>
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-800/50 rounded-xl p-3 grid grid-cols-3 gap-3 align-content-start border border-gray-700/50 shadow-inner">
                            {eligibleKois.map((koi, index) => {
                                const phenotype = getPhenotype(koi.genetics.baseColorGenes);
                                const isSelected = selectedKoiId === koi.id;

                                return (
                                    <div
                                        key={koi.id}
                                        onClick={() => setSelectedKoiId(koi.id)}
                                        className={`aspect-square rounded-xl border-2 relative cursor-pointer flex items-center justify-center transition-all duration-200 ${isSelected ? 'border-cyan-400 bg-cyan-900/30 scale-[0.98] shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'border-gray-700 hover:border-gray-600 bg-gray-800 hover:bg-gray-700/50'}`}
                                    >
                                        <KoiCSSPreview
                                            koi={koi}
                                            className="w-12 h-12 shadow-sm"
                                        />
                                        {isSelected && (
                                            <div className="absolute top-1.5 right-1.5 bg-cyan-500 text-black p-0.5 rounded-full shadow-lg">
                                                <Check size={12} strokeWidth={4} />
                                            </div>
                                        )}
                                        <div className="absolute bottom-1.5 text-[10px] font-medium text-gray-400 w-full text-center truncate px-2">
                                            {koi.name}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Form */}
                    <div className="w-72 flex flex-col overflow-hidden">
                        <h3 className="text-sm font-bold text-gray-400 mb-3 px-1">선택된 코이 정보</h3>
                        <div className="bg-gray-800/80 p-5 rounded-xl border border-gray-700 relative flex-1 flex flex-col gap-5 shadow-xl">
                            <div className="bg-gray-900/60 p-5 rounded-xl border border-gray-700 relative">
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
                                                    <div className="text-xs text-gray-400 mt-1 whitespace-nowrap">
                                                        {k.growthStage === GrowthStage.FRY ? '치어' : k.growthStage === GrowthStage.JUVENILE ? '준성체' : '성체'}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-gray-600 text-sm py-8 whitespace-nowrap">
                                        코이를 선택하세요
                                    </div>
                                )}
                            </div>

                            <div className="mt-2">
                                <label className="block text-xs text-gray-400 mb-1 whitespace-nowrap">판매 가격 (AP)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={buyNowPrice}
                                        onChange={(e) => setBuyNowPrice(e.target.value)}
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg py-2 pl-3 pr-10 text-white focus:border-cyan-500 focus:outline-none"
                                        placeholder="500"
                                        min={MIN_PRICE}
                                    />
                                    <span className="absolute right-3 top-2.5 text-gray-400 text-sm">AP</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1 whitespace-nowrap">최소 {MIN_PRICE.toLocaleString()} AP</p>
                            </div>

                            <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                                <div className="flex justify-between items-center text-xs whitespace-nowrap gap-2">
                                    <span className="text-yellow-400">등록 비용</span>
                                    <span className="text-yellow-300 font-bold">{LISTING_FEE} AP</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1 whitespace-nowrap gap-2">
                                    <span>내 AP 잔액</span>
                                    <span className={userAP >= LISTING_FEE ? 'text-green-400' : 'text-red-400'}>{userAP.toLocaleString()} AP</span>
                                </div>
                            </div>

                            {error && (
                                <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded">
                                    {error}
                                </div>
                            )}

                            <div className="mt-auto pt-4">
                                <button
                                    onClick={handleSubmit}
                                    disabled={!selectedKoiId || isSubmitting}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                >
                                    {isSubmitting ? '등록 중...' : '판매 등록'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
