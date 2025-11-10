
import React from 'react';
import { X, Droplets } from 'lucide-react';
import { Koi, Ponds, PondData, GrowthStage, GeneType } from '../types';
import { GENE_COLOR_MAP, getPhenotype } from '../utils/genetics';

// Re-using KoiListItem from old Sidebar
const KoiListItem: React.FC<{ koi: Koi; onSelect: (koi: Koi) => void }> = ({ koi, onSelect }) => {
    const phenotype = getPhenotype(koi.genetics.baseColorGenes);
    const isSpecial = phenotype === GeneType.ALBINO || phenotype === GeneType.PLATINUM;
    const bgColor = isSpecial ? GENE_COLOR_MAP[phenotype] : `hsl(0, 80%, ${koi.genetics.lightness}%)`;

    return (
        <button 
            onClick={() => onSelect(koi)}
            className="w-full text-left p-2 rounded-md flex items-center gap-3 transition-colors hover:bg-gray-700/50"
        >
            <div className="w-5 h-5 rounded-full border border-gray-600 flex-shrink-0" style={{ backgroundColor: bgColor }} />
            <span className="flex-grow truncate text-white font-medium">{koi.name}</span>
            {koi.growthStage === GrowthStage.JUVENILE && (
                <div className="w-2.5 h-2.5 bg-sky-400 rounded-full flex-shrink-0" title="치어"></div>
            )}
            {koi.growthStage === GrowthStage.PERFECT && (
                <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full flex-shrink-0" title="완성체"></div>
            )}
        </button>
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
}

export const PondInfoModal: React.FC<PondInfoModalProps> = ({
  onClose,
  ponds,
  activePondId,
  onPondChange,
  koiList,
  zenPoints,
  onKoiSelect
}) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-lg animate-fade-in-up flex flex-col" style={{maxHeight: '90vh'}}>
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-cyan-400 flex items-center">
            <Droplets className="mr-3" />
            연못 정보
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <div className="flex-shrink-0 border-b border-gray-700/50 flex items-center mb-4">
          {Object.values(ponds).map((pond: PondData) => (
            <button
              key={pond.id}
              onClick={() => onPondChange(pond.id)}
              className={`px-3 py-2 text-sm font-semibold transition-colors rounded-t-md ${
                activePondId === pond.id
                  ? 'text-cyan-300 bg-gray-800/60'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/30'
              }`}
            >
              {pond.name}
            </button>
          ))}
        </div>

        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 mb-4 flex-shrink-0 flex justify-between items-center text-lg">
            <span className="font-mono text-cyan-300">{koiList.length} 마리</span>
            <div className="text-yellow-400 font-bold">
                <span>{zenPoints.toLocaleString()} ZP</span>
            </div>
        </div>

        <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700 flex flex-col flex-grow overflow-hidden">
          <h3 className="text-lg font-semibold mb-2 text-white">코이 목록</h3>
          <div className="overflow-y-auto space-y-1 pr-1">
            {koiList.length > 0 ? (
                koiList.map(koi => <KoiListItem key={koi.id} koi={koi} onSelect={onKoiSelect} />)
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 py-8">
                    <Droplets className="w-12 h-12"/>
                    <p className="mt-4 text-sm">이 연못은 비어있습니다.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
