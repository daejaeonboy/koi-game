
import React from 'react';
import { Koi as KoiType, GrowthStage, KoiGenetics, GeneType } from '../types';
import { GENE_COLOR_MAP, getPhenotype } from '../utils/genetics';

interface KoiProps {
  koi: KoiType;
  // FIX: Updated MouseEvent to MouseEvent<HTMLElement> to match prop type from Pond component.
  onClick: (event: React.MouseEvent<HTMLElement>, koi: KoiType) => void;
  isSelected?: boolean;
}

const getBodyStyle = (): React.CSSProperties => {
    return { 
        width: '80px', 
        height: '40px',
        borderRadius: '50%',
    };
};

const getBodyColor = (genetics: KoiGenetics): string => {
    const phenotype = getPhenotype(genetics.baseColorGenes);
    // If it's a special recessive morph, use its mapped color
    if (phenotype === GeneType.ALBINO || phenotype === GeneType.PLATINUM) {
        return GENE_COLOR_MAP[phenotype];
    }
    // Otherwise, calculate HSL color from lightness for the standard red-based color
    return `hsl(0, 80%, ${genetics.lightness}%)`;
};

export const Koi: React.FC<KoiProps> = ({ koi, onClick, isSelected }) => {
  const angle = Math.atan2(koi.velocity.vy, koi.velocity.vx) * (180 / Math.PI);
  const bodyStyle = getBodyStyle();
  const bodyColor = getBodyColor(koi.genetics);

  const growthClass = koi.growthStage === GrowthStage.JUVENILE ? 'juvenile' : 'adult';

  return (
    <div
      className={`absolute cursor-pointer group koi-in-pond ${isSelected ? 'selected' : ''} ${growthClass}`}
      style={{
        left: `${koi.position.x}%`,
        top: `${koi.position.y}%`,
        transform: `translate(-50%, -50%) rotate(${angle}deg) scale(${koi.size / 12})`,
        width: bodyStyle.width,
        height: bodyStyle.height,
        transition: 'transform 0.2s ease-out'
      }}
      onClick={(e) => {
          e.stopPropagation();
          onClick(e, koi);
      }}
    >
      <div className="koi-tail" style={{ backgroundColor: bodyColor }}></div>
      <div className="koi-fin koi-fin-pectoral-left" style={{ backgroundColor: bodyColor }}></div>
      <div className="koi-fin koi-fin-pectoral-right" style={{ backgroundColor: bodyColor }}></div>
      
      <div 
        className="relative w-full h-full transition-all duration-200 overflow-hidden"
        style={{ 
          ...bodyStyle,
          backgroundColor: bodyColor,
          boxShadow: `0 0 5px rgba(0,0,0,0.3)`
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
