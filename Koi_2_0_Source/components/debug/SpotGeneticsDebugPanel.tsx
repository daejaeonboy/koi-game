import React, { useState, useEffect } from 'react';
import { Koi, SpotPhenotypeGenes, GeneAlleles, DominanceType, GeneType, GrowthStage, KoiGenetics, Spot, SpotShape } from '../../types';
import { expressGene, calculateSpotPhenotype, GENE_COLOR_MAP } from '../../utils/genetics';
import { getDebugConfig } from '../../config';

interface SpotGeneticsDebugPanelProps {
    koi: Koi | null;
    zenPoints?: number;
    onSetZenPoints?: (points: number) => void;
    onSpawnKoi?: (genetics: Partial<KoiGenetics>, growthStage?: GrowthStage) => void;
    onUpdateKoi?: (koiId: string, updates: { genetics?: Partial<KoiGenetics>; growthStage?: GrowthStage }) => void;
}

// Gene IDs for the 10-gene system
const GENE_IDS: (keyof SpotPhenotypeGenes)[] = ['OP', 'OV', 'CH', 'CS', 'SB', 'SV', 'EB', 'DN', 'PX', 'PY'];

// Available color genes
const COLOR_GENES: GeneType[] = [GeneType.BLACK, GeneType.RED, GeneType.YELLOW, GeneType.WHITE, GeneType.ORANGE, GeneType.CREAM];

// Growth stages
const GROWTH_STAGES: GrowthStage[] = [GrowthStage.FRY, GrowthStage.JUVENILE, GrowthStage.ADULT];

/**
 * Debug Panel for Full Koi Genetics Editing
 */
export const SpotGeneticsDebugPanel: React.FC<SpotGeneticsDebugPanelProps> = ({
    koi,
    zenPoints = 0,
    onSetZenPoints,
    onSpawnKoi,
    onUpdateKoi
}) => {
    const debugConfig = getDebugConfig();
    const [isMinimized, setIsMinimized] = useState(false);
    const [editZenPoints, setEditZenPoints] = useState(zenPoints.toString());

    // Color genetics state
    const [baseColorGenes, setBaseColorGenes] = useState<GeneType[]>([GeneType.CREAM, GeneType.CREAM]);
    const [lightness, setLightness] = useState(50);
    const [isTransparent, setIsTransparent] = useState(false);
    const [growthStage, setGrowthStage] = useState<GrowthStage>(GrowthStage.ADULT);

    // Spots state (actual spots on the koi)
    const [spots, setSpots] = useState<Spot[]>([]);

    // Spot phenotype genes state
    const [customGenes, setCustomGenes] = useState<Record<string, number>>(() => {
        const initial: Record<string, number> = {};
        GENE_IDS.forEach(id => { initial[id] = 0.5; });
        return initial;
    });

    // Sync editZenPoints with prop
    useEffect(() => {
        setEditZenPoints(zenPoints.toString());
    }, [zenPoints]);

    // Don't render if debug is disabled
    if (!debugConfig.SHOW_SPOT_GENETICS_DEBUG) return null;

    const genes = koi?.genetics.spotPhenotypeGenes;
    const phenotype = genes ? calculateSpotPhenotype(genes, koi) : null;

    // Create SpotPhenotypeGenes from custom values
    const createGenesFromCustom = (): SpotPhenotypeGenes => {
        const makeGene = (value: number): GeneAlleles => ({
            allele1: { value, origin: 'maternal' },
            allele2: { value, origin: 'paternal' },
            dominanceType: DominanceType.INCOMPLETE,
        });

        return {
            OP: makeGene(customGenes.OP),
            OV: makeGene(customGenes.OV),
            CH: makeGene(customGenes.CH),
            CS: makeGene(customGenes.CS),
            SB: makeGene(customGenes.SB),
            SV: makeGene(customGenes.SV),
            EB: makeGene(customGenes.EB),
            DN: makeGene(customGenes.DN),
            PX: makeGene(customGenes.PX),
            PY: makeGene(customGenes.PY),
        };
    };

    // ========== COPY ALL FROM SELECTED KOI ==========
    const handleCopyAll = () => {
        if (!koi) return;

        // Copy color genes
        setBaseColorGenes([...koi.genetics.baseColorGenes]);
        setLightness(koi.genetics.lightness);
        setIsTransparent(koi.genetics.isTransparent);
        setGrowthStage(koi.growthStage as GrowthStage);

        // Copy spots
        setSpots([...koi.genetics.spots]);

        // Copy spot phenotype genes
        if (koi.genetics.spotPhenotypeGenes) {
            const copied: Record<string, number> = {};
            GENE_IDS.forEach(id => {
                copied[id] = expressGene(koi.genetics.spotPhenotypeGenes![id]);
            });
            setCustomGenes(copied);
        }
    };

    const handleRandomizeGenes = () => {
        const newGenes: Record<string, number> = {};
        GENE_IDS.forEach(id => { newGenes[id] = Math.random(); });
        setCustomGenes(newGenes);
    };

    const handleRandomizeColors = () => {
        const randomGene = () => COLOR_GENES[Math.floor(Math.random() * COLOR_GENES.length)];
        const count = Math.floor(Math.random() * 4) + 2;
        const genes: GeneType[] = [];
        for (let i = 0; i < count; i++) {
            genes.push(randomGene());
        }
        setBaseColorGenes(genes);
        setLightness(Math.floor(Math.random() * 100));
        setIsTransparent(Math.random() > 0.8);
    };

    // Add a random spot
    const handleAddSpot = () => {
        const newSpot: Spot = {
            x: Math.floor(Math.random() * 80) + 10,
            y: Math.floor(Math.random() * 80) + 10,
            size: Math.floor(Math.random() * 20) + 10,
            color: COLOR_GENES[Math.floor(Math.random() * COLOR_GENES.length)],
            shape: SpotShape.CIRCLE,
        };
        setSpots(prev => [...prev, newSpot]);
    };

    const handleRemoveSpot = (index: number) => {
        setSpots(prev => prev.filter((_, i) => i !== index));
    };

    const handleClearSpots = () => {
        setSpots([]);
    };

    const handleSpawnKoi = () => {
        if (onSpawnKoi) {
            onSpawnKoi({
                baseColorGenes,
                lightness,
                isTransparent,
                spots,
                spotPhenotypeGenes: createGenesFromCustom(),
            }, growthStage);
        }
    };

    const handleApplyToSelected = () => {
        if (onUpdateKoi && koi) {
            onUpdateKoi(koi.id, {
                genetics: {
                    baseColorGenes,
                    lightness,
                    isTransparent,
                    spots,
                    spotPhenotypeGenes: createGenesFromCustom(),
                },
                growthStage,
            });
        }
    };

    const handleSetZenPoints = () => {
        const points = parseInt(editZenPoints.replace(/,/g, ''), 10);
        if (!isNaN(points) && points >= 0 && onSetZenPoints) {
            onSetZenPoints(points);
        }
    };

    const addColorGene = (gene: GeneType) => {
        setBaseColorGenes(prev => [...prev, gene]);
    };

    const removeColorGene = (index: number) => {
        if (baseColorGenes.length > 2) {
            setBaseColorGenes(prev => prev.filter((_, i) => i !== index));
        }
    };

    return (
        <div
            className="fixed top-2 right-2 z-[9999] pointer-events-auto"
            style={{
                background: 'rgba(0,0,0,0.95)',
                color: '#00ff00',
                padding: isMinimized ? '8px' : '12px',
                fontSize: '11px',
                fontFamily: 'monospace',
                borderRadius: '8px',
                border: '1px solid #00ff00',
                maxHeight: isMinimized ? 'auto' : '85vh',
                overflow: 'auto',
                minWidth: isMinimized ? 'auto' : '360px',
            }}
        >
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold flex items-center gap-2">
                    🧬 Debug Panel
                    {koi && <span className="text-xs text-gray-500">#{koi.name}</span>}
                </h4>
                <div className="flex items-center gap-1">
                    {koi && (
                        <button
                            onClick={handleCopyAll}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded text-xs font-bold"
                        >
                            📋 Copy All
                        </button>
                    )}
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="text-yellow-400 hover:text-yellow-200 px-2"
                    >
                        {isMinimized ? '▼' : '▲'}
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    {/* Zen Points Editor */}
                    <div className="border-t border-gray-700 pt-2 mb-3">
                        <h5 className="text-xs text-yellow-400 mb-1">💰 Zen Points</h5>
                        <div className="flex gap-1">
                            <input
                                type="number"
                                value={editZenPoints}
                                onChange={e => setEditZenPoints(e.target.value)}
                                className="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-xs border border-gray-600"
                            />
                            <button
                                onClick={handleSetZenPoints}
                                className="bg-yellow-600 hover:bg-yellow-500 text-black px-2 py-1 rounded text-xs font-bold"
                            >
                                SET
                            </button>
                            <button
                                onClick={() => onSetZenPoints?.(zenPoints + 10000)}
                                className="bg-green-600 hover:bg-green-500 text-white px-2 py-1 rounded text-xs"
                            >
                                +10K
                            </button>
                        </div>
                        <div className="text-gray-500 text-xs mt-1">현재: {zenPoints.toLocaleString()} ZP</div>
                    </div>

                    {/* GROWTH STAGE */}
                    <div className="border-t border-gray-700 pt-2 mb-3">
                        <h5 className="text-xs text-green-400 mb-1">🌱 Growth Stage (성장 상태)</h5>
                        <div className="flex gap-1">
                            {GROWTH_STAGES.map(stage => (
                                <button
                                    key={stage}
                                    onClick={() => setGrowthStage(stage)}
                                    className={`px-3 py-1 rounded text-xs font-bold ${growthStage === stage
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                >
                                    {stage === GrowthStage.FRY ? '치어' : stage === GrowthStage.JUVENILE ? '준성체' : '성체'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* COLOR GENES EDITOR */}
                    <div className="border-t border-gray-700 pt-2 mb-3">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs text-pink-400">🎨 Base Color Genes (기본 색상)</h5>
                            <button
                                onClick={handleRandomizeColors}
                                className="bg-pink-600 hover:bg-pink-500 text-white px-2 py-0.5 rounded text-xs"
                            >
                                Random
                            </button>
                        </div>

                        {/* Current Color Genes Display */}
                        <div className="flex flex-wrap gap-1 mb-2">
                            {baseColorGenes.map((gene, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                    style={{
                                        backgroundColor: GENE_COLOR_MAP[gene],
                                        color: gene === GeneType.BLACK || gene === GeneType.RED ? '#fff' : '#000'
                                    }}
                                >
                                    {gene}
                                    {baseColorGenes.length > 2 && (
                                        <button
                                            onClick={() => removeColorGene(idx)}
                                            className="ml-1 hover:opacity-70"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Add Color Gene Buttons */}
                        <div className="flex flex-wrap gap-1 mb-2">
                            {COLOR_GENES.map(gene => (
                                <button
                                    key={gene}
                                    onClick={() => addColorGene(gene)}
                                    className="px-2 py-0.5 rounded text-xs border border-gray-600 hover:border-white"
                                    style={{
                                        backgroundColor: GENE_COLOR_MAP[gene],
                                        color: gene === GeneType.BLACK || gene === GeneType.RED ? '#fff' : '#000'
                                    }}
                                >
                                    +{gene}
                                </button>
                            ))}
                        </div>

                        {/* Lightness & Transparency */}
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-gray-400 w-12">명도:</span>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={lightness}
                                onChange={e => setLightness(parseInt(e.target.value))}
                                className="flex-1 h-3"
                                style={{ accentColor: '#ff69b4' }}
                            />
                            <span className="text-pink-300 w-8 text-right">{lightness}</span>
                            <button
                                onClick={() => setIsTransparent(!isTransparent)}
                                className={`ml-2 px-2 py-0.5 rounded text-xs ${isTransparent ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                            >
                                {isTransparent ? '투명 ON' : '투명 OFF'}
                            </button>
                        </div>
                    </div>

                    {/* SPOTS EDITOR (무늬) */}
                    <div className="border-t border-gray-700 pt-2 mb-3">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs text-orange-400">🔴 Spots (무늬) - {spots.length}개</h5>
                            <div className="flex gap-1">
                                <button
                                    onClick={handleAddSpot}
                                    className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-0.5 rounded text-xs"
                                >
                                    +추가
                                </button>
                                <button
                                    onClick={handleClearSpots}
                                    className="bg-red-600 hover:bg-red-500 text-white px-2 py-0.5 rounded text-xs"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>

                        {/* Spots Detail Editor */}
                        {spots.length > 0 ? (
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {spots.map((spot, idx) => (
                                    <div key={idx} className="bg-gray-800 p-2 rounded border border-gray-700">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs text-gray-400">Spot #{idx + 1}</span>
                                            <button
                                                onClick={() => handleRemoveSpot(idx)}
                                                className="text-red-400 hover:text-red-200 text-xs px-1"
                                            >
                                                삭제
                                            </button>
                                        </div>

                                        {/* Color & Shape Row */}
                                        <div className="flex gap-2 mb-1">
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-500 text-xs">색:</span>
                                                <select
                                                    value={spot.color}
                                                    onChange={e => {
                                                        const newSpots = [...spots];
                                                        newSpots[idx] = { ...spot, color: e.target.value as GeneType };
                                                        setSpots(newSpots);
                                                    }}
                                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 border border-gray-600"
                                                    style={{ backgroundColor: GENE_COLOR_MAP[spot.color] }}
                                                >
                                                    {COLOR_GENES.map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-500 text-xs">형:</span>
                                                <select
                                                    value={spot.shape}
                                                    onChange={e => {
                                                        const newSpots = [...spots];
                                                        newSpots[idx] = { ...spot, shape: e.target.value as SpotShape };
                                                        setSpots(newSpots);
                                                    }}
                                                    className="bg-gray-700 text-white text-xs rounded px-1 py-0.5 border border-gray-600"
                                                >
                                                    <option value={SpotShape.CIRCLE}>원</option>
                                                    <option value={SpotShape.HEXAGON}>육각</option>
                                                    <option value={SpotShape.POLYGON}>다각</option>
                                                    <option value={SpotShape.OVAL_H}>가로타원</option>
                                                    <option value={SpotShape.OVAL_V}>세로타원</option>
                                                </select>
                                            </div>
                                        </div>

                                        {/* X Position */}
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-gray-500 text-xs w-6">X:</span>
                                            <input
                                                type="range" min="0" max="100" value={spot.x}
                                                onChange={e => {
                                                    const newSpots = [...spots];
                                                    newSpots[idx] = { ...spot, x: parseInt(e.target.value) };
                                                    setSpots(newSpots);
                                                }}
                                                className="flex-1 h-2"
                                                style={{ accentColor: '#f97316' }}
                                            />
                                            <span className="text-orange-300 text-xs w-8 text-right">{spot.x}%</span>
                                        </div>

                                        {/* Y Position */}
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="text-gray-500 text-xs w-6">Y:</span>
                                            <input
                                                type="range" min="0" max="100" value={spot.y}
                                                onChange={e => {
                                                    const newSpots = [...spots];
                                                    newSpots[idx] = { ...spot, y: parseInt(e.target.value) };
                                                    setSpots(newSpots);
                                                }}
                                                className="flex-1 h-2"
                                                style={{ accentColor: '#f97316' }}
                                            />
                                            <span className="text-orange-300 text-xs w-8 text-right">{spot.y}%</span>
                                        </div>

                                        {/* Size */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-gray-500 text-xs w-6">크기:</span>
                                            <input
                                                type="range" min="5" max="50" value={spot.size}
                                                onChange={e => {
                                                    const newSpots = [...spots];
                                                    newSpots[idx] = { ...spot, size: parseInt(e.target.value) };
                                                    setSpots(newSpots);
                                                }}
                                                className="flex-1 h-2"
                                                style={{ accentColor: '#f97316' }}
                                            />
                                            <span className="text-orange-300 text-xs w-8 text-right">{spot.size}%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-gray-500 text-xs">무늬 없음 - +추가 버튼을 클릭하세요</div>
                        )}
                    </div>

                    {/* Spot Phenotype Gene Editor */}
                    <div className="border-t border-gray-700 pt-2 mb-3">
                        <div className="flex justify-between items-center mb-2">
                            <h5 className="text-xs text-cyan-400">🧬 Spot Phenotype Genes</h5>
                            <button
                                onClick={handleRandomizeGenes}
                                className="bg-purple-600 hover:bg-purple-500 text-white px-2 py-0.5 rounded text-xs"
                            >
                                Random
                            </button>
                        </div>

                        {/* Gene Sliders */}
                        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                            {GENE_IDS.map(id => (
                                <div key={id} className="flex items-center gap-1">
                                    <span className="text-gray-400 w-6">{id}</span>
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.01"
                                        value={customGenes[id]}
                                        onChange={e => setCustomGenes(prev => ({ ...prev, [id]: parseFloat(e.target.value) }))}
                                        className="flex-1 h-3"
                                        style={{ accentColor: '#00ff00' }}
                                    />
                                    <span className="text-cyan-300 w-8 text-right">{customGenes[id].toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-3">
                        <button
                            onClick={handleSpawnKoi}
                            className="flex-1 bg-green-600 hover:bg-green-500 text-white py-1.5 rounded text-xs font-bold"
                        >
                            🐟 새 코이 생성
                        </button>
                        {koi && (
                            <button
                                onClick={handleApplyToSelected}
                                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-1.5 rounded text-xs font-bold"
                            >
                                ✏️ 선택 코이 수정
                            </button>
                        )}
                    </div>

                    {/* Current Koi Info (Read-only) */}
                    {koi && (
                        <div className="border-t border-gray-700 pt-2">
                            <h5 className="text-xs text-gray-400 mb-1">📊 선택된 코이 정보</h5>
                            <div className="text-xs space-y-1">
                                <div><span className="text-gray-500">Stage:</span> <span className="text-green-300">{koi.growthStage === GrowthStage.FRY ? '치어' : koi.growthStage === GrowthStage.JUVENILE ? '준성체' : '성체'}</span></div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">Color:</span>
                                    <div className="flex gap-1">
                                        {koi.genetics.baseColorGenes.map((g, i) => (
                                            <span key={i} className="px-1 rounded text-xs" style={{ backgroundColor: GENE_COLOR_MAP[g] }}>{g}</span>
                                        ))}
                                    </div>
                                </div>
                                <div><span className="text-gray-500">명도:</span> <span className="text-pink-300">{koi.genetics.lightness}</span> | <span className="text-gray-500">투명:</span> <span className={koi.genetics.isTransparent ? 'text-cyan-300' : 'text-gray-500'}>{koi.genetics.isTransparent ? 'Yes' : 'No'}</span></div>
                                <div><span className="text-gray-500">Spots:</span> <span className="text-orange-300">{koi.genetics.spots.length}개</span></div>
                            </div>
                        </div>
                    )}

                    {/* Phenotype Preview */}
                    {phenotype && debugConfig.SHOW_PHENOTYPE_PREVIEW && (
                        <div className="border-t border-gray-700 pt-2 mt-2">
                            <h5 className="text-xs text-gray-400 mb-1">🎨 Spot 표현형</h5>
                            <div className="grid grid-cols-2 gap-1 text-xs">
                                <span>Opacity: <span className="text-cyan-300">{(phenotype.opacityBase * 100).toFixed(0)}%</span></span>
                                <span>Size: <span className="text-cyan-300">{(0.5 + phenotype.sizeBase * 1.5).toFixed(2)}x</span></span>
                                <span>Blur: <span className="text-cyan-300">{(phenotype.edgeBlur * 100).toFixed(0)}%</span></span>
                                <span>Density: <span className="text-cyan-300">{(phenotype.density * 100).toFixed(0)}%</span></span>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
