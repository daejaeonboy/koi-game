import React, { useState, useMemo } from 'react';
import { X, Palette, Sun, Sparkles, Fish, Dna, DollarSign, Zap } from 'lucide-react';
import { Koi, Ponds, PondData, GeneType, GrowthStage } from '../types';
import { calculateKoiValue, calculateRarityScore, GENE_COLOR_MAP, getPhenotype, GENE_RARITY, getDisplayColor } from '../utils/genetics';

// Helper component for list items
const KoiListItem: React.FC<{
  koi: Koi;
  index: number;
  onViewDetail: () => void;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
}> = ({ koi, index, onViewDetail, isSelected, onToggleSelect }) => {
  const phenotype = getPhenotype(koi.genetics.baseColorGenes);

  // Logic matching Koi.tsx
  const bodyColor = getDisplayColor(phenotype, koi.genetics.lightness, koi.genetics.isTransparent);

  const rarityScore = calculateRarityScore(koi);
  const value = calculateKoiValue(koi);

  return (
    <div
      onClick={() => onToggleSelect(koi.id)}
      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${isSelected
        ? 'bg-cyan-900/40 border-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
        : 'bg-gray-700/40 border-gray-600 hover:bg-gray-700/60 hover:border-gray-500'
        }`}
    >
      <div className="relative mr-4">
        <div
          className="w-12 h-12 rounded-full border-2 border-gray-500 shadow-sm overflow-hidden relative"
          style={{ background: bodyColor }}
        >
          {/* Mini spots visualization */}
          {koi.genetics.spots.map((spot, i) => (
            <div
              key={i}
              className="absolute rounded-full"
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
        <div
          className={`absolute -top-1 -left-1 w-5 h-5 rounded border flex items-center justify-center transition-colors z-10 ${isSelected ? 'bg-cyan-500 border-cyan-400 text-white' : 'bg-gray-800 border-gray-500 text-transparent hover:border-gray-300'
            }`}
        >
          {isSelected && <div className="w-2 h-2 bg-white rounded-sm" />}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-200 truncate">코이 #{index}</span>
            <span className="text-xs bg-gray-800 px-1.5 py-0.5 rounded border border-gray-600 text-gray-400">
              {koi.growthStage === 'adult' ? '성체' : koi.growthStage === 'juvenile' ? '준성체' : '치어'}
            </span>
            {(koi.stamina ?? 0) <= 5 && (
              <span className="text-xs bg-red-900/50 px-1.5 py-0.5 rounded border border-red-500/50 text-red-400 font-bold animate-pulse">
                병듦
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/30">
            {value} ZP
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-yellow-400 whitespace-nowrap">
          <span>명도: {Math.round(koi.genetics.lightness)}</span>
          <span>체력: {Math.round(koi.stamina ?? 0)}</span>
        </div>
        <div className="mt-1 text-xs text-gray-500 flex gap-2">
          <span className="text-gray-400">점: <span className="text-cyan-300 font-bold">{koi.genetics.spots.length}개</span></span>
          <span className="text-gray-700">|</span>
          <span className="text-gray-400">유전자:</span>
          <span className="text-cyan-300">{koi.genetics.baseColorGenes.join(' / ')}</span>
        </div>
      </div>

    </div>
  );
};

interface PondInfoModalProps {
  onClose: () => void;
  ponds: Ponds;
  activePondId: string;
  onPondChange: (pondId: string) => void;
  koiList: Koi[];
  zenPoints: number;
  onKoiSelect: (koi: Koi) => void;

  onSell: (kois: Koi[]) => void;
  onBreed: (kois: Koi[]) => void;
  onMove: (kois: Koi[], targetPondId: string) => void;
}

type SortOption = 'default' | 'spots_desc' | 'lightness_desc' | 'lightness_asc';

export const PondInfoModal: React.FC<PondInfoModalProps> = ({
  onClose,
  ponds,
  activePondId,
  onPondChange,
  koiList,
  zenPoints,
  onKoiSelect,
  onSell,
  onBreed,
  onMove
}) => {
  const [sortOption, setSortOption] = useState<SortOption>('default');
  const [selectedKoiIds, setSelectedKoiIds] = useState<Set<string>>(new Set());

  const handleSort = (option: SortOption) => {
    setSortOption(option);
  };

  const sortedKoiList = useMemo(() => {
    const sorted = [...koiList];
    switch (sortOption) {
      case 'spots_desc':
        return sorted.sort((a, b) => b.genetics.spots.length - a.genetics.spots.length);
      case 'lightness_desc':
        return sorted.sort((a, b) => b.genetics.lightness - a.genetics.lightness);
      case 'lightness_asc':
        return sorted.sort((a, b) => a.genetics.lightness - b.genetics.lightness);
      default:
        return sorted;
    }
  }, [koiList, sortOption]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedKoiIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedKoiIds(newSelected);
  };

  const handleSellSelected = () => {
    const selectedKois = koiList.filter(k => selectedKoiIds.has(k.id));

    // Restriction: Must leave at least 2 koi
    if (koiList.length - selectedKois.length < 2) {
      alert("연못에는 최소 두 마리의 코이가 있어야 합니다!");
      return;
    }

    onSell(selectedKois);
    setSelectedKoiIds(new Set());
  };

  const handleBreedSelected = () => {
    const selectedKois = koiList.filter(k => selectedKoiIds.has(k.id));
    if (selectedKois.length === 2) {
      onBreed(selectedKois);
      setSelectedKoiIds(new Set());
    }
  };

  return (
    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg w-full max-w-4xl h-[80vh] flex flex-col border border-gray-700 shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50 rounded-t-lg">
          {/* Pond Tabs - Replaces Title */}
          <div className="flex gap-2 mr-auto overflow-x-auto no-scrollbar">
            {Object.values(ponds).map(pond => (
              <button
                key={pond.id}
                onClick={() => onPondChange(pond.id)}
                className={`px-4 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activePondId === pond.id
                  ? 'bg-gray-800 text-cyan-400 border border-cyan-500/50 shadow-lg shadow-cyan-900/20'
                  : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800 hover:text-gray-300 border border-transparent'
                  }`}
              >
                {/* Optional Icon for active tab */}
                {activePondId === pond.id && <Fish size={16} />}
                {pond.name}
              </button>
            ))}
          </div>

          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors ml-4">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col p-4">

          {/* Stats Bar */}
          <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 mb-4 flex-shrink-0 flex justify-between items-center text-lg">
            <span className="font-mono text-cyan-300">{koiList.length} / 30 마리</span>
            <div className="text-yellow-400 font-bold">
              <span>{zenPoints.toLocaleString()} ZP</span>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 flex-shrink-0 no-scrollbar">
            <button
              onClick={() => {
                if (selectedKoiIds.size === koiList.length) {
                  setSelectedKoiIds(new Set());
                } else {
                  setSelectedKoiIds(new Set(koiList.map(k => k.id)));
                }
              }}
              className="px-3 py-1 rounded text-sm font-bold transition-colors bg-cyan-600 hover:bg-cyan-500 text-white whitespace-nowrap"
            >
              {selectedKoiIds.size === koiList.length ? '전체 해제' : '전체 선택'}
            </button>
            <button onClick={() => handleSort('spots_desc')} className={`px-3 py-1 rounded text-sm font-bold transition-colors whitespace-nowrap ${sortOption === 'spots_desc' ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              점 개수
            </button>
            <button onClick={() => handleSort('lightness_desc')} className={`px-3 py-1 rounded text-sm font-bold transition-colors whitespace-nowrap ${sortOption === 'lightness_desc' ? 'bg-gray-200 text-black' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              밝은 순
            </button>
            <button onClick={() => handleSort('lightness_asc')} className={`px-3 py-1 rounded text-sm font-bold transition-colors whitespace-nowrap ${sortOption === 'lightness_asc' ? 'bg-gray-900 text-white border border-gray-600' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              어두운 순
            </button>
          </div>

          {/* Koi List */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {sortedKoiList.map((koi, idx) => (
              <KoiListItem
                key={koi.id}
                koi={koi}
                index={idx + 1}
                onViewDetail={() => onKoiSelect(koi)}
                isSelected={selectedKoiIds.has(koi.id)}
                onToggleSelect={toggleSelect}
              />
            ))}
            {sortedKoiList.length === 0 && (
              <div className="text-center text-gray-500 py-10">
                연못에 물고기가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {selectedKoiIds.size > 0 && (
          <div className="p-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur-sm flex justify-end gap-3 rounded-b-lg flex-wrap">
            {/* Move Buttons - Show direct options if multiple ponds exist */}
            {Object.values(ponds).length > 1 && (
              <div className="flex items-center gap-2 mr-auto bg-black/30 p-1 rounded-lg">
                <span className="text-xs text-gray-400 px-2">이동:</span>
                {Object.values(ponds).filter(p => p.id !== activePondId).map(targetPond => (
                  <button
                    key={targetPond.id}
                    onClick={() => onMove(koiList.filter(k => selectedKoiIds.has(k.id)), targetPond.id)}
                    className="bg-cyan-900 hover:bg-cyan-800 text-cyan-200 text-xs px-2 py-1.5 rounded transition-colors whitespace-nowrap"
                  >
                    To {targetPond.name}
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={handleBreedSelected}
              disabled={selectedKoiIds.size !== 2 || Array.from(selectedKoiIds).some(id => koiList.find(k => k.id === id)?.growthStage !== GrowthStage.ADULT)}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 text-sm whitespace-nowrap rounded-lg transition-all shadow-lg"
            >
              <Dna size={16} />
              {selectedKoiIds.size}마리 교배
            </button>
            <button
              onClick={handleSellSelected}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 text-sm whitespace-nowrap rounded-lg transition-all shadow-lg"
            >
              <DollarSign size={16} />
              {selectedKoiIds.size}마리 판매
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

