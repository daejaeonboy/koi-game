
import React from 'react';
import { Koi, KoiGenetics, GeneType } from '../types';
import { X, DollarSign } from 'lucide-react';
import { calculateKoiValue, getPhenotype, GENE_COLOR_MAP, getDisplayColor } from '../utils/genetics';

interface KoiDetailModalProps {
    koi: Koi;
    onClose: () => void;
    onSell: (koi: Koi) => void;
    totalKoiCount: number;
}

// Simplified static display for modal
const StaticKoiDisplay: React.FC<{ koi: Koi }> = ({ koi }) => {
    const phenotype = getPhenotype(koi.genetics.baseColorGenes);
    const bodyColor = getDisplayColor(phenotype, koi.genetics.lightness, koi.genetics.isTransparent);

    return (
        <div className="relative w-32 h-32 flex items-center justify-center">
            {/* Simple CSS representation */}
            <div
                className="w-24 h-12 rounded-full shadow-lg relative overflow-hidden"
                style={{ backgroundColor: bodyColor }}
            >
                {/* Spots */}
                {koi.genetics.spots.map((spot, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full opacity-90"
                        style={{
                            left: `${spot.x}%`,
                            top: `${spot.y}%`,
                            width: `${spot.size}%`,
                            height: `${spot.size}%`,
                            transform: 'translate(-50%, -50%)',
                            backgroundColor: GENE_COLOR_MAP[spot.color],
                        }}
                    />
                ))}
            </div>
            {/* Fins */}
            <div className="absolute w-8 h-4 bg-white/30 rounded-full -top-1 left-12" style={{ transform: 'rotate(-45deg)' }}></div>
            <div className="absolute w-8 h-4 bg-white/30 rounded-full -bottom-1 left-12" style={{ transform: 'rotate(45deg)' }}></div>
        </div>
    );
};

export const KoiDetailModal: React.FC<KoiDetailModalProps> = ({ koi, onClose, onSell, totalKoiCount }) => {
    const sellValue = calculateKoiValue(koi);
    const canSell = totalKoiCount > 2;

    const handleSell = () => {
        if (!canSell) return;
        onSell(koi);
        onClose();
    };

    return (
        // ... (Modal structure omitted - assuming it matches existing)
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up relative max-h-[85vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>

                <div className="space-y-4">
                    {/* ... (Header and Gene/Visual display omitted) */}
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
                            {koi.name}
                            {(koi.stamina ?? 100) <= 10 && (
                                <span className="text-xs bg-red-900/50 text-red-400 border border-red-500/50 px-2 py-0.5 rounded-full animate-pulse">
                                    병듦
                                </span>
                            )}
                        </h2>
                        <span className="text-sm font-semibold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{koi.growthStage}</span>
                        <p className="text-sm text-gray-400 mt-2 italic">"{koi.description}"</p>
                    </div>

                    {/* Gene List Display */}
                    <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                        <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">Genetics (Carried Genes)</h3>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {koi.genetics.baseColorGenes.map((gene, idx) => (
                                <span key={idx}
                                    className="text-xs px-2 py-1 rounded-full border border-gray-600 bg-gray-800 text-gray-200 flex items-center gap-1"
                                    title={gene}
                                >
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: GENE_COLOR_MAP[gene] }}></span>
                                    {gene}
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-center h-40">
                        <StaticKoiDisplay koi={koi} />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={handleSell}
                            disabled={!canSell}
                            className={`flex items-center justify-center w-full font-bold py-3 px-4 rounded-lg transition-colors text-base ${canSell
                                ? 'bg-red-600/80 hover:bg-red-600 text-white'
                                : 'bg-gray-700 text-gray-500 cursor-not-allowed'}`}
                        >
                            <DollarSign className="mr-2 h-5 w-5" />
                            판매 ({sellValue} ZP)
                        </button>
                        {!canSell && (
                            <p className="text-red-400 text-xs text-center">연못에는 최소 두 마리의 코이가 있어야 합니다.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
