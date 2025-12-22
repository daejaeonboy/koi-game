import React from 'react';
import { MarketplaceListing } from '../types';
import { getPhenotype, getDisplayColor, GENE_COLOR_MAP } from '../utils/genetics';
import { Clock } from 'lucide-react';

interface ListingCardProps {
    listing: MarketplaceListing;
    onClick: () => void;
    isOwner: boolean;
}

export const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick, isOwner }) => {
    const { koiData, expiresAt, currentBid, buyNowPrice } = listing;
    const phenotype = getPhenotype(koiData.genetics.baseColorGenes);
    const bgColor = getDisplayColor(phenotype, koiData.genetics.lightness);
    const spots = koiData.genetics.spots || [];

    // Calculate time left
    const now = Date.now();
    const timeLeft = Math.max(0, expiresAt - now);
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);

    let timeString = '';
    if (daysLeft > 0) timeString = `${daysLeft}일 남음`;
    else if (hoursLeft > 0) timeString = `${hoursLeft}시간 남음`;
    else timeString = '곧 종료';

    return (
        <div
            onClick={onClick}
            className="bg-gray-800 rounded-xl p-3 border border-gray-700 hover:border-cyan-400 transition-all cursor-pointer relative group overflow-hidden"
        >
            {/* Owner badge */}
            {isOwner && (
                <div className="absolute top-2 right-2 bg-blue-600 text-[10px] px-2 py-0.5 rounded-full text-white font-bold z-10">
                    내 코이
                </div>
            )}

            {/* Visual Preview with Spots */}
            <div className="flex justify-center mb-3 pt-2">
                <div
                    className="w-16 h-16 rounded-full shadow-lg border-2 border-white/20 relative overflow-hidden"
                    style={{ backgroundColor: bgColor }}
                >
                    {/* Render spots/patterns */}
                    {spots.slice(0, 5).map((spot, i) => {
                        const spotColor = GENE_COLOR_MAP[spot.color] || '#fff';
                        const size = Math.min(12, spot.size * 8);
                        const left = spot.x;
                        const top = spot.y;
                        return (
                            <div
                                key={i}
                                className="absolute rounded-full opacity-80"
                                style={{
                                    backgroundColor: spotColor,
                                    width: `${size}px`,
                                    height: `${size}px`,
                                    left: `${left}%`,
                                    top: `${top}%`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            {/* Info */}
            <div className="space-y-1">
                <div className="flex justify-between items-start">
                    <h3 className="text-white text-sm font-bold truncate max-w-[70%]">{koiData.name}</h3>
                    <span className="text-xs text-cyan-400 font-medium">Gen.{koiData.genetics.generationalData?.generation || 1}</span>
                </div>

                <div className="text-xs text-gray-400 truncate">
                    {listing.sellerNickname}
                </div>

                <div className="flex justify-between items-end mt-2">
                    <div className="flex flex-col">
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock size={10} /> {timeString}
                        </span>
                    </div>
                    <div className="flex flex-col items-end leading-none">
                        <div className="text-yellow-400 font-bold text-lg">
                            {currentBid.toLocaleString()} <span className="text-xs">AP</span>
                        </div>
                        {typeof buyNowPrice === 'number' && buyNowPrice > 0 && (
                            <div className="text-[10px] text-gray-400 mt-1">
                                즉구 {buyNowPrice.toLocaleString()} AP
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hover Effects */}
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        </div>
    );
};
