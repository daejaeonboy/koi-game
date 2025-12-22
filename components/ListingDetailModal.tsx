import React, { useEffect, useMemo, useState } from 'react';
import { X, DollarSign, Gavel } from 'lucide-react';
import { Koi, MarketplaceListing } from '../types';
import { buyNowListing, cancelListing, listenToListing, placeBid } from '../services/marketplace';
import { SingleKoiCanvas } from './SingleKoiCanvas';

// Reusing generic modal styles or similar
interface ListingDetailModalProps {
    listing: MarketplaceListing;
    onClose: () => void;
    currentUserId?: string;
    userNickname: string;
    userAP: number;
    onBuySuccess: (koi?: Koi) => void;
    onCancelSuccess: () => void;
}

export const ListingDetailModal: React.FC<ListingDetailModalProps> = ({
    listing,
    onClose,
    currentUserId,
    userNickname,
    userAP,
    onBuySuccess,
    onCancelSuccess
}) => {
    const [liveListing, setLiveListing] = useState<MarketplaceListing>(listing);
    const isOwner = currentUserId === liveListing.sellerId;
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [pendingBidAmount, setPendingBidAmount] = useState<number | null>(null);
    const [bidAmount, setBidAmount] = useState<string>(String((listing.currentBid ?? listing.startPrice ?? 0) + 50));

    useEffect(() => {
        setLiveListing(listing);
        setBidAmount(String((listing.currentBid ?? listing.startPrice ?? 0) + 50));
        setError(null);
        setNotice(null);
        setPendingBidAmount(null);
        setIsProcessing(false);
    }, [listing.id]);

    useEffect(() => {
        const unsubscribe = listenToListing(listing.id, (next) => {
            if (!next) return;
            setLiveListing(next);
        });
        return () => unsubscribe();
    }, [listing.id]);

    const TRANSACTION_FEE_RATE = 0.05;

    const parsedBidAmount = useMemo(() => {
        const amount = parseInt(bidAmount);
        return Number.isFinite(amount) ? amount : NaN;
    }, [bidAmount]);

    const requiredBidAp = useMemo(() => {
        if (!Number.isFinite(parsedBidAmount)) return Infinity;
        return Math.ceil(parsedBidAmount * (1 + TRANSACTION_FEE_RATE));
    }, [parsedBidAmount]);

    const requiredBuyNowAp = useMemo(() => {
        if (typeof liveListing.buyNowPrice !== 'number' || liveListing.buyNowPrice <= 0) return Infinity;
        return Math.ceil(liveListing.buyNowPrice * (1 + TRANSACTION_FEE_RATE));
    }, [liveListing.buyNowPrice]);

    const canBid = useMemo(() => {
        if (isOwner) return false;
        if (!currentUserId) return false;
        if (isProcessing) return false;
        if (pendingBidAmount != null) return false;

        if (!Number.isFinite(parsedBidAmount)) return false;
        if (parsedBidAmount <= liveListing.currentBid) return false;
        if (parsedBidAmount <= 0) return false;

        return userAP >= requiredBidAp;
    }, [isOwner, currentUserId, isProcessing, pendingBidAmount, parsedBidAmount, liveListing.currentBid, userAP, requiredBidAp]);

    useEffect(() => {
        if (pendingBidAmount == null) return;

        const isConfirmed =
            liveListing.currentBid >= pendingBidAmount &&
            liveListing.currentBidderId === currentUserId;

        if (!isConfirmed) return;

        setPendingBidAmount(null);
        setIsProcessing(false);
        setError(null);
        setNotice('입찰이 반영되었습니다.');
        setBidAmount(String(liveListing.currentBid + 50));
    }, [pendingBidAmount, liveListing.currentBid, liveListing.currentBidderId, currentUserId]);

    useEffect(() => {
        if (pendingBidAmount == null) return;

        const timeout = window.setTimeout(() => {
            setPendingBidAmount(null);
            setIsProcessing(false);
            setError('입찰이 아직 반영되지 않았습니다. (AP 부족/종료/동시 입찰 등)');
        }, 7000);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [pendingBidAmount]);

    const handleBuyNow = async () => {
        if (!currentUserId) return;
        if (typeof liveListing.buyNowPrice !== 'number' || liveListing.buyNowPrice <= 0) return;

        setIsProcessing(true);
        setError(null);
        setNotice(null);
        try {
            const result: any = await buyNowListing(liveListing.id);
            onBuySuccess(result?.koiData as Koi | undefined);
            onClose();
        } catch (e) {
            console.error(e);
            setError("구매 처리에 실패했습니다. (이미 판매되었거나 오류 발생)");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBid = async () => {
        if (!currentUserId) return;

        const amount = parseInt(bidAmount);
        if (isNaN(amount) || amount <= liveListing.currentBid) {
            setError("입찰가는 현재가보다 높아야 합니다.");
            return;
        }

        if (userAP < requiredBidAp) {
            setError(`AP가 부족합니다. (수수료 포함 ${requiredBidAp.toLocaleString()} AP 필요)`);
            return;
        }

        setIsProcessing(true);
        setError(null);
        setNotice('입찰 처리 중...');
        try {
            await placeBid(liveListing.id, currentUserId, userNickname || 'User', amount);
            setPendingBidAmount(amount);
        } catch (e) {
            console.error(e);
            setError("입찰에 실패했습니다. (AP 부족/이미 종료/오류)");
            setNotice(null);
            setIsProcessing(false);
            setPendingBidAmount(null);
        } finally {
            // 입찰은 Cloud Function 트리거(onBidCreate)로 최종 반영되므로,
            // 여기서는 즉시 종료하지 않고 listing 갱신으로 확정합니다.
        }
    };

    const handleCancel = async () => {
        if (!isOwner) return;
        setIsProcessing(true);
        setNotice(null);
        try {
            await cancelListing(liveListing.id);
            onCancelSuccess();
            onClose();
        } catch (e) {
            setError("취소 실패");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6 relative shadow-2xl">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white"
                >
                    <X />
                </button>

                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="text-cyan-400">장터 매물 상세</span>
                </h2>

                <div className="flex flex-col items-center mb-6 w-full">
                    {/* 돋보기 메뉴(상세보기)와 동일한 미리보기 스타일 */}
                    <div className="bg-blue-900/30 p-4 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden w-full mb-4" style={{ height: '200px' }}>
                        <SingleKoiCanvas koi={liveListing.koiData} width={400} height={180} />
                    </div>

                    <h3 className="text-2xl font-bold text-white">{liveListing.koiData.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">판매자: {liveListing.sellerNickname}</p>
                </div>

                <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                        <span className="text-gray-400">현재가</span>
                        <span className="text-xl font-bold text-yellow-400">{liveListing.currentBid.toLocaleString()} AP</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">시작가</span>
                        <span className="text-white">{liveListing.startPrice.toLocaleString()} AP</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">즉시 구매가</span>
                        <span className="text-white">
                            {typeof liveListing.buyNowPrice === 'number' && liveListing.buyNowPrice > 0
                                ? `${liveListing.buyNowPrice.toLocaleString()} AP`
                                : '없음'}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">성별/세대</span>
                        <span className="text-white">Gen.{liveListing.koiData.genetics.generationalData?.generation || 1}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">크기</span>
                        <span className="text-white">{liveListing.koiData.size.toFixed(1)}cm</span>
                    </div>
                </div>

                {notice && (
                    <div className="bg-cyan-900/40 border border-cyan-500/30 text-cyan-200 text-sm p-3 rounded-lg mb-4 text-center">
                        {notice}
                    </div>
                )}

                {error && (
                    <div className="bg-red-900/50 border border-red-500/50 text-red-200 text-sm p-3 rounded-lg mb-4 text-center">
                        {error}
                    </div>
                )}

                {!isOwner && (
                    <div className="flex gap-2 mb-3">
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                            min={liveListing.currentBid + 1}
                            placeholder="입찰가"
                            disabled={isProcessing || pendingBidAmount != null}
                        />
                        <button
                            onClick={handleBid}
                            disabled={!canBid}
                            className="bg-cyan-700 hover:bg-cyan-600 text-white font-bold px-4 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Gavel size={16} /> 입찰
                        </button>
                    </div>
                )}

                <div className="flex gap-3">
                    {isOwner ? (
                        <button
                            onClick={handleCancel}
                            disabled={isProcessing}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isProcessing ? '처리 중...' : '판매 취소'}
                        </button>
                    ) : (
                        <button
                            onClick={handleBuyNow}
                            disabled={
                                isProcessing ||
                                typeof liveListing.buyNowPrice !== 'number' ||
                                liveListing.buyNowPrice <= 0 ||
                                userAP < requiredBuyNowAp
                            }
                            className="w-full bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? '처리 중...' : (
                                <>
                                    <DollarSign size={20} />
                                    즉시 구매 ({liveListing.buyNowPrice?.toLocaleString() ?? '-'} AP)
                                </>
                            )}
                        </button>
                    )}
                </div>
                {!isOwner && typeof liveListing.buyNowPrice === 'number' && liveListing.buyNowPrice > 0 && userAP < requiredBuyNowAp && (
                    <p className="text-xs text-red-400 text-center mt-2">AP가 부족합니다. (수수료 포함 {requiredBuyNowAp.toLocaleString()} AP 필요)</p>
                )}
            </div>
        </div>
    );
};
