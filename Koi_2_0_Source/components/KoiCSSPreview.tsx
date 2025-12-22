import React from 'react';
import { Koi, SpotPhenotypeGenes } from '../types';
import { getPhenotype, getDisplayColor, GENE_COLOR_MAP, calculateSpotPhenotype } from '../utils/genetics';

interface KoiCSSPreviewProps {
    koi: Koi;
    className?: string;
}

export const KoiCSSPreview: React.FC<KoiCSSPreviewProps> = ({ koi, className = "" }) => {
    const phenotype = getPhenotype(koi.genetics.baseColorGenes);
    const bodyColor = getDisplayColor(phenotype, koi.genetics.lightness, koi.genetics.isTransparent);

    // Calculate Spot Phenotype if available
    const spotPhenotype = koi.genetics.spotPhenotypeGenes
        ? calculateSpotPhenotype(koi.genetics.spotPhenotypeGenes, koi)
        : undefined;

    const phenotypeOpacity = spotPhenotype?.opacityBase ?? 1.0;
    const phenotypeSizeMultiplier = spotPhenotype ? (0.5 + spotPhenotype.sizeBase * 1.5) : 1.0;
    const phenotypeBlur = spotPhenotype?.edgeBlur ?? 0;

    return (
        <div className={`relative flex items-center justify-center overflow-hidden bg-gray-900 rounded-full ${className}`}>
            {/* Body */}
            <div
                className="w-full h-full rounded-full relative"
                style={{ backgroundColor: bodyColor }}
            >
                {/* Spots */}
                {koi.genetics.spots.map((spot, i) => {
                    // Apply visual adjustments from phenotype
                    const size = spot.size * phenotypeSizeMultiplier;
                    const blur = phenotypeBlur * 2; // Reduced from 20 to 2 for better visibility in small icons

                    return (
                        <div
                            key={i}
                            className="absolute rounded-full"
                            style={{
                                left: `${spot.x}%`,
                                top: `${spot.y}%`,
                                width: `${size}%`,
                                height: `${size}%`,
                                transform: 'translate(-50%, -50%)',
                                backgroundColor: GENE_COLOR_MAP[spot.color],
                                opacity: phenotypeOpacity * 0.9, // Base opacity 0.9 + genetic opacity
                                filter: phenotypeBlur > 0.1 ? `blur(${blur}px)` : 'none'
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};
