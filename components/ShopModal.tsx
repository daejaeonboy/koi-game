
import React from 'react';
import { X, ShoppingCart, PlusSquare, Droplet, Wheat } from 'lucide-react';
import { GeneType } from '../types';
import { GENE_COLOR_MAP } from '../utils/genetics';

interface ShopModalProps {
  onClose: () => void;
  zenPoints: number;
  onBuyPondExpansion: () => void;
  onBuyFood: () => void;
  onBuyAlbinoKoi: () => void;
  onBuyPlatinumKoi: () => void;
}

const POND_EXPANSION_PRICE = 20000;
const FOOD_PACK_PRICE = 200;
const ALBINO_KOI_PRICE = 100000;
const PLATINUM_KOI_PRICE = 500000;

const ShopItem: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    price: number;
    onBuy: () => void;
    canAfford: boolean;
}> = ({ icon, title, description, price, onBuy, canAfford }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex flex-col">
        <div className="flex items-center gap-3">
            <div className="text-cyan-300">{icon}</div>
            <div className="flex-grow">
                <h3 className="text-base font-semibold text-white">{title}</h3>
                <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
        </div>
        <div className="text-base font-bold text-yellow-400 mt-2 text-right">{price.toLocaleString()} ZP</div>
        <button
            onClick={onBuy}
            disabled={!canAfford}
            className="mt-2 w-full bg-yellow-600 text-white font-bold py-2 rounded-lg flex items-center justify-center transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed enabled:hover:bg-yellow-500"
        >
            구매하기
        </button>
    </div>
);


export const ShopModal: React.FC<ShopModalProps> = ({ onClose, zenPoints, onBuyPondExpansion, onBuyFood, onBuyAlbinoKoi, onBuyPlatinumKoi }) => {

    return (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-full max-w-sm animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-yellow-400 flex items-center">
                        <ShoppingCart className="mr-3" />
                        상점
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="text-right text-lg text-yellow-300 mb-4">
                    보유 포인트: <span className="font-bold">{zenPoints.toLocaleString()} ZP</span>
                </div>

                <div className="space-y-3">
                    <ShopItem
                        icon={<Wheat size={40} />}
                        title="코이 먹이 (50개)"
                        description="치어 코이를 성체로 성장시키는 데 필요합니다."
                        price={FOOD_PACK_PRICE}
                        onBuy={onBuyFood}
                        canAfford={zenPoints >= FOOD_PACK_PRICE}
                    />
                    <ShopItem
                        icon={<PlusSquare size={40} />}
                        title="연못 확장"
                        description="코이들이 더 넓은 공간에서 헤엄칠 수 있게 됩니다."
                        price={POND_EXPANSION_PRICE}
                        onBuy={onBuyPondExpansion}
                        canAfford={zenPoints >= POND_EXPANSION_PRICE}
                    />
                    <ShopItem
                        icon={<Droplet size={40} style={{color: GENE_COLOR_MAP[GeneType.ALBINO]}} />}
                        title="알비노 코이"
                        description="신비로운 알비노 유전자를 가진 순종 치어 코이입니다."
                        price={ALBINO_KOI_PRICE}
                        onBuy={onBuyAlbinoKoi}
                        canAfford={zenPoints >= ALBINO_KOI_PRICE}
                    />
                    <ShopItem
                        icon={<Droplet size={40} style={{color: GENE_COLOR_MAP[GeneType.PLATINUM]}} />}
                        title="플래티넘 코이"
                        description="백금처럼 빛나는 플래티넘 유전자를 가진 순종 치어 코이입니다."
                        price={PLATINUM_KOI_PRICE}
                        onBuy={onBuyPlatinumKoi}
                        canAfford={zenPoints >= PLATINUM_KOI_PRICE}
                    />
                </div>
            </div>
        </div>
    );
};
