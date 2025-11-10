
import React from 'react';
import { Koi, KoiGenetics, GeneType } from '../types';
import { X, DollarSign } from 'lucide-react';
import { calculateKoiValue, getPhenotype, GENE_COLOR_MAP } from '../utils/genetics';

interface KoiDetailModalProps {
  koi: Koi;
  onClose: () => void;
  onSell: (koi: Koi) => void;
}

// Helper function to determine body style
const getBodyStyle = (): React.CSSProperties => {
    return { 
        width: '80px', 
        height: '40px',
        borderRadius: '50%',
    };
};

const getBodyColor = (genetics: KoiGenetics): string => {
    const phenotype = getPhenotype(genetics.baseColorGenes);
    if (phenotype === GeneType.ALBINO || phenotype === GeneType.PLATINUM) {
        return GENE_COLOR_MAP[phenotype];
    }
    return `hsl(0, 80%, ${genetics.lightness}%)`;
};

// A new component to display a static, non-animated Koi
const StaticKoiDisplay: React.FC<{ koi: Koi }> = ({ koi }) => {
  const bodyStyle = getBodyStyle();
  const bodyColor = getBodyColor(koi.genetics);

  return (
    <div
      className="relative mx-auto static-koi"
      style={{
        transform: `scale(${koi.size / 10})`, // Adjust scale for better viewing
        width: bodyStyle.width,
        height: bodyStyle.height,
      }}
    >
      <div className="koi-tail" style={{ backgroundColor: bodyColor }}></div>
      <div className="koi-fin koi-fin-pectoral-left" style={{ backgroundColor: bodyColor }}></div>
      <div className="koi-fin koi-fin-pectoral-right" style={{ backgroundColor: bodyColor }}></div>

      <div 
        className="relative w-full h-full overflow-hidden"
        style={{ 
          ...bodyStyle,
          backgroundColor: bodyColor,
          boxShadow: `0 0 8px rgba(0,0,0,0.5)`
        }}
      >
        {koi.genetics.spots.map((spot, index) => (
            <div 
                key={index}
                className="absolute rounded-full"
                style={{
                    left: `${spot.x}%`,
                    top: `${spot.y}%`,
                    width: `${spot.size}%`,
                    height: `${spot.size}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: GENE_COLOR_MAP[spot.color],
                }}
            ></div>
        ))}
        
        {/* Eyes */}
        <div className="koi-eye left"></div>
        <div className="koi-eye right"></div>
        
      </div>
      
    </div>
  );
};


export const KoiDetailModal: React.FC<KoiDetailModalProps> = ({ koi, onClose, onSell }) => {
    const sellValue = calculateKoiValue(koi);

    const handleSell = () => {
        onSell(koi);
        onClose();
    };

    return (
        <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center z-40 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-sm animate-fade-in-up relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
                
                <div className="space-y-4">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-white">{koi.name}</h2>
                        <span className="text-sm font-semibold bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{koi.growthStage}</span>
                        <p className="text-sm text-gray-400 mt-2 italic">"{koi.description}"</p>
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex items-center justify-center h-40">
                        <StaticKoiDisplay koi={koi} />
                    </div>

                    <div className="flex flex-col space-y-2">
                        <button
                            onClick={handleSell}
                            className="flex items-center justify-center w-full bg-red-600/80 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors text-base"
                        >
                            <DollarSign className="mr-2 h-5 w-5" />
                            판매 ({sellValue} ZP)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
