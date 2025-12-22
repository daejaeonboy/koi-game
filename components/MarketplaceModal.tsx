import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Filter, Plus } from 'lucide-react';
import { MarketplaceListing } from '../types';
import { fetchActiveListings } from '../services/marketplace';
import { ListingCard } from './ListingCard';
import './MarketplaceModal.css';

interface MarketplaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId?: string; // To identify own listings
    refreshKey?: number; // 판매 등록 직후 강제 갱신 트리거
    onSelectListing: (listing: MarketplaceListing) => void;
    onCreateListingClick: () => void;
    userAP: number;
}

export const MarketplaceModal: React.FC<MarketplaceModalProps> = ({
    isOpen,
    onClose,
    currentUserId,
    refreshKey = 0,
    onSelectListing,
    onCreateListingClick,
    userAP
}) => {
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [filter, setFilter] = useState<'all' | 'my'>('all');
    const [sort, setSort] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');
    const listContainerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = fetchActiveListings((data) => {
            setListings(data);
        });
        return () => unsubscribe();
    }, [isOpen, refreshKey]);

    useEffect(() => {
        if (!isOpen) return;
        if (refreshKey === 0) return;

        // 판매 등록 직후: 방금 등록한 매물이 보이도록 최신순 + 상단으로 이동
        setSort('newest');

        // 렌더 반영 후 스크롤 이동
        requestAnimationFrame(() => {
            listContainerRef.current?.scrollTo({ top: 0 });
        });
    }, [isOpen, refreshKey]);

    if (!isOpen) return null;

    const filteredListings = listings
        .filter(l => {
            if (filter === 'my') return l.sellerId === currentUserId;
            return true;
        })
        .sort((a, b) => {
            const priceA = (typeof a.buyNowPrice === 'number' && a.buyNowPrice > 0) ? a.buyNowPrice : a.currentBid;
            const priceB = (typeof b.buyNowPrice === 'number' && b.buyNowPrice > 0) ? b.buyNowPrice : b.currentBid;
            if (sort === 'price_asc') return priceA - priceB;
            if (sort === 'price_desc') return priceB - priceA;
            return b.createdAt - a.createdAt; // newest
        });

    return (
        <div className="marketplace-modal-overlay">
            <div className="marketplace-modal-content">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                            잉어 장터
                        </h2>
                        <span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-400">Beta</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-gray-800 px-3 py-1.5 rounded-lg border border-gray-700 flex items-center gap-2">
                            <span className="text-xs text-gray-400">내 자산</span>
                            <span className="text-yellow-400 font-bold">{userAP.toLocaleString()} AP</span>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                        <button
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'all' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setFilter('all')}
                        >
                            전체
                        </button>
                        <button
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filter === 'my' ? 'bg-cyan-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                            onClick={() => setFilter('my')}
                        >
                            내 판매
                        </button>
                    </div>

                    <select
                        className="bg-gray-800 text-white text-sm border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500"
                        value={sort}
                        onChange={(e) => setSort(e.target.value as any)}
                    >
                        <option value="newest">최신순</option>
                        <option value="price_asc">가격 낮은순</option>
                        <option value="price_desc">가격 높은순</option>
                    </select>

                    <div className="flex-grow"></div>

                    <button
                        onClick={onCreateListingClick}
                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg hover:shadow-purple-500/30 transition-all hover:scale-105 flex items-center gap-2"
                    >
                        <Plus size={16} /> 판매 등록
                    </button>
                </div>

                {/* Grid */}
                <div ref={listContainerRef} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 overflow-y-auto max-h-[60vh] custom-scrollbar p-1">
                    {filteredListings.length > 0 ? (
                        filteredListings.map(listing => (
                            <ListingCard
                                key={listing.id}
                                listing={listing}
                                onClick={() => onSelectListing(listing)}
                                isOwner={listing.sellerId === currentUserId}
                            />
                        ))
                    ) : (
                        <div className="col-span-full py-12 text-center text-gray-500">
                            <Search size={48} className="mx-auto mb-3 opacity-20" />
                            <p>등록된 잉어가 없습니다.</p>
                            {filter === 'my' && <p className="text-xs mt-1">새로운 판매를 등록해보세요!</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
