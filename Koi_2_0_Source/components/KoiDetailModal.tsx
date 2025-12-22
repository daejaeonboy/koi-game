import React from 'react';
import { Koi, SpotPhenotypeGenes } from '../types';
import { X, DollarSign, Dna } from 'lucide-react';
import { calculateKoiValue, getPhenotype, GENE_COLOR_MAP, getDisplayColor, expressGene, calculateSpotPhenotype } from '../utils/genetics';

interface KoiDetailModalProps {
    koi: Koi;
    onClose: () => void;
    onSell: (koi: Koi) => void;
    totalKoiCount: number;
    hideActions?: boolean;
}

import { SingleKoiCanvas } from './SingleKoiCanvas';


export const KoiDetailModal: React.FC<KoiDetailModalProps> = ({ koi, onClose, onSell, totalKoiCount, hideActions }) => {
    const sellValue = calculateKoiValue(koi);
    const canSell = totalKoiCount > 2;

    const handleSell = () => {
        if (!canSell) return;
        onSell(koi);
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[1300] p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up relative max-h-[85vh] overflow-y-auto custom-scrollbar">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>

                <div className="space-y-4">
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

                    {/* Spot Phenotype Genes Display (10-Gene System) */}
                    {koi.genetics.spotPhenotypeGenes && (
                        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                            <h3 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-2">
                                <Dna size={14} className="text-purple-400" />
                                점 표현형 유전자 (Spot Phenotype Genes)
                            </h3>
                            <div className="grid grid-cols-5 gap-1 text-xs">
                                {(Object.entries(koi.genetics.spotPhenotypeGenes) as [keyof SpotPhenotypeGenes, typeof koi.genetics.spotPhenotypeGenes.OP][]).map(([id, gene]) => {
                                    const expressed = expressGene(gene);
                                    return (
                                        <div key={id} className="text-center p-1.5 bg-gray-800 rounded">
                                            <span className="text-gray-500 block text-[10px]">{id}</span>
                                            <span className="text-cyan-300 font-mono">{expressed.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            {/* Phenotype Summary */}
                            {(() => {
                                const phenotype = calculateSpotPhenotype(koi.genetics.spotPhenotypeGenes, koi);
                                return (
                                    <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400 grid grid-cols-2 gap-1">
                                        <span>투명도: <span className="text-cyan-300">{(phenotype.opacityBase * 100).toFixed(0)}%</span></span>
                                        <span>크기: <span className="text-cyan-300">{(0.5 + phenotype.sizeBase * 1.5).toFixed(1)}x</span></span>
                                        <span>흐림: <span className="text-cyan-300">{(phenotype.edgeBlur * 100).toFixed(0)}%</span></span>
                                        <span>밀도: <span className="text-cyan-300">{(phenotype.density * 100).toFixed(0)}%</span></span>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div className="bg-blue-900/30 p-4 rounded-lg border border-gray-700 flex items-center justify-center overflow-hidden" style={{ height: '200px' }}>
                        <SingleKoiCanvas koi={koi} width={400} height={180} />
                    </div>

                    {!hideActions && (
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
                    )}
                </div>
            </div>
        </div>
    );
};
