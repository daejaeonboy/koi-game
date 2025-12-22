import { KoiGenetics, GeneType, Spot, Koi, GrowthStage, SpotShape, DominanceType, Allele, GeneAlleles, SpotPhenotypeGenes, SpotPhenotype, GenerationalData } from '../types';

const ALL_SPOT_COLORS = [GeneType.RED, GeneType.ORANGE, GeneType.YELLOW, GeneType.WHITE, GeneType.BLACK];

const RECESSIVE_COLORS = [
    GeneType.ORANGE, GeneType.YELLOW, GeneType.WHITE, GeneType.CREAM, GeneType.BLACK, GeneType.RED
];

const SPECIAL_COLORS: GeneType[] = [
    // Disabled per request
];

export const GENE_COLOR_MAP: Record<GeneType, string> = {
    [GeneType.BLACK]: '#252525', // Charcoal Black (Lighter per request)
    [GeneType.RED]: '#E53E3E',
    [GeneType.YELLOW]: '#F6E05E',
    [GeneType.WHITE]: '#ffffff', // Pure White (Desaturated)
    [GeneType.ORANGE]: '#ED8936',
    [GeneType.CREAM]: '#FEFDE7',
};

export const GENE_RARITY: Record<GeneType, number> = {
    [GeneType.BLACK]: 3, // Now a mutation (was 2)
    [GeneType.WHITE]: 3,
    [GeneType.YELLOW]: 3,
    [GeneType.ORANGE]: 3,
    [GeneType.RED]: 3,
    [GeneType.CREAM]: 1, // Basic Type (Most Common, was 6)
};

// Determines the expressed phenotype
const getRandomTraitWithRarity = <T extends string | number | symbol>(allTraits: T[], rarityMap: Record<T, number>): T => {
    // Filter out traits with rarity 0 (disabled)
    const validTraits = allTraits.filter(trait => rarityMap[trait] > 0);
    const weights = validTraits.map(trait => 1 / rarityMap[trait]);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < validTraits.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return validTraits[i];
        }
    }
    return validTraits[0];
};

const DOMINANCE_ORDER = [
    // Dark/Deep colors Dominant
    GeneType.BLACK,
    GeneType.RED,
    GeneType.ORANGE,

    // Medium/Metallic
    // All Recessive now

    // Light Recessive
    GeneType.YELLOW,
    GeneType.CREAM,
    GeneType.WHITE,
];

// Determines the expressed phenotype from an arbitrary number of genes
export const getPhenotype = (genes: GeneType[]): GeneType => {
    if (!genes || genes.length === 0) return GeneType.CREAM;

    // Filter out undefined/null
    const validGenes = genes.filter(g => g);
    if (validGenes.length === 0) return GeneType.CREAM;

    // Strict Recessive Logic:
    // 1. A gene must be expressed at least TWICE to show up.
    // 2. If no gene appears >= 2 times, the fish is Cream.

    const geneCounts: Record<string, number> = {};
    validGenes.forEach(g => {
        geneCounts[g] = (geneCounts[g] || 0) + 1;
    });

    // Find all genes with count >= 2
    const expressedGenes: GeneType[] = [];
    for (const [gene, count] of Object.entries(geneCounts)) {
        if (count >= 2) {
            expressedGenes.push(gene as GeneType);
        }
    }

    if (expressedGenes.length === 0) {
        return GeneType.CREAM;
    }

    let bestGene = expressedGenes[0];
    let bestRank = 999;

    expressedGenes.forEach(gene => {
        const rank = DOMINANCE_ORDER.indexOf(gene);
        const effectiveRank = rank === -1 ? 999 : rank;

        if (effectiveRank < bestRank) {
            bestRank = effectiveRank;
            bestGene = gene;
        }
    });

    return bestGene;
}

export const calculateKoiValue = (koi: Koi): number => {
    let value = 0;
    const { genetics, growthStage } = koi;

    const phenotype = getPhenotype(genetics.baseColorGenes);

    // Base value
    value += 100;

    // Value from Phenotype Rarity
    value += (GENE_RARITY[phenotype] || 1) * 50; // High value for expressed recessive colors

    // Value from Hidden Genes (Carriers)
    genetics.baseColorGenes.forEach(gene => {
        if (gene !== GeneType.CREAM) {
            value += (GENE_RARITY[gene] || 1) * 5;
        }
    });

    // Value from lightness
    const lightnessDifference = Math.abs(genetics.lightness - 50);
    value += Math.pow(lightnessDifference, 2) * 0.5;

    // Value from spots
    const spotValue = genetics.spots.length * 5;
    const spotBonus = Math.pow(genetics.spots.length, 1.5) * 2;
    value += spotValue + spotBonus;

    const spotColorValue = genetics.spots.reduce((sum, spot) => sum + (GENE_RARITY[spot.color] || 1), 0);
    value += spotColorValue * 3;

    // Multiplier for growth stage
    if (growthStage === GrowthStage.ADULT) {
        value *= 2;
    } else if (growthStage === GrowthStage.JUVENILE) {
        value *= 1.5;
    } else {
        value *= 1;
    }

    // Stamina/Health Penalties
    if ((koi.stamina ?? 0) <= 10 || koi.sickTimestamp) {
        return 0;
    }
    else if ((koi.stamina ?? 0) <= 40) {
        value *= 0.25;
    }
    else if ((koi.stamina ?? 0) <= 60) {
        value *= 0.5;
    }

    return Math.floor(value);
};

const SPOT_COLOR_MUTATION_CHANCE = 0.05;
const SIZE_MUTATION_AMOUNT = 4;
const LIGHTNESS_MUTATION_CHANCE = 0.2;
const LIGHTNESS_MUTATION_AMOUNT = 5;
const BASE_COLOR_MUTATION_CHANCE = 0;
const SPECIAL_MUTATION_CHANCE = 0;

const createNewRandomSpot = (preferredColor?: GeneType): Spot => {
    const shapeValues = Object.values(SpotShape);
    const shape = shapeValues[Math.floor(Math.random() * shapeValues.length)] as SpotShape;

    let color = preferredColor;
    if (!color) {
        color = getRandomTraitWithRarity(ALL_SPOT_COLORS, GENE_RARITY);
    }

    return {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 50 + 40, // 40-90% of body width
        color: color,
        shape: shape,
    };
};

const GENE_EXPANSION_CHANCE = 0;
const GENE_DELETION_CHANCE = 0.02;

const getGamete = (genes: GeneType[]): GeneType[] => {
    const gameteSize = Math.max(1, Math.floor(genes.length / 2));
    const shuffled = [...genes].sort(() => 0.5 - Math.random());
    const gamete = shuffled.slice(0, gameteSize);

    if (Math.random() < GENE_EXPANSION_CHANCE) {
        gamete.push(genes[Math.floor(Math.random() * genes.length)]);
    }

    return gamete;
};

export const breedKoi = (genetics1: KoiGenetics, genetics2: KoiGenetics): { genetics: KoiGenetics, mutations: GeneType[] } => {
    const mutations: GeneType[] = [];

    // 0. Breed spot phenotype genes (10-gene system)
    let childSpotPhenotypeGenes: SpotPhenotypeGenes | undefined;
    if (genetics1.spotPhenotypeGenes && genetics2.spotPhenotypeGenes) {
        childSpotPhenotypeGenes = breedSpotPhenotypeGenes(genetics1.spotPhenotypeGenes, genetics2.spotPhenotypeGenes);
    } else if (genetics1.spotPhenotypeGenes) {
        childSpotPhenotypeGenes = genetics1.spotPhenotypeGenes;
    } else if (genetics2.spotPhenotypeGenes) {
        childSpotPhenotypeGenes = genetics2.spotPhenotypeGenes;
    } else {
        childSpotPhenotypeGenes = createRandomSpotPhenotypeGenes();
    }

    // 1. Breed base color genes
    let gamete1 = getGamete(genetics1.baseColorGenes);
    let gamete2 = getGamete(genetics2.baseColorGenes);

    gamete1 = gamete1.map(g => {
        if (Math.random() < BASE_COLOR_MUTATION_CHANCE) {
            const m = getRandomTraitWithRarity(RECESSIVE_COLORS, GENE_RARITY);
            mutations.push(m);
            return m;
        }
        return g;
    });
    gamete2 = gamete2.map(g => {
        if (Math.random() < BASE_COLOR_MUTATION_CHANCE) {
            const m = getRandomTraitWithRarity(RECESSIVE_COLORS, GENE_RARITY);
            mutations.push(m);
            return m;
        }
        return g;
    });

    if (Math.random() < SPECIAL_MUTATION_CHANCE) {
        const m = getRandomTraitWithRarity(SPECIAL_COLORS, GENE_RARITY);
        gamete1[0] = m;
        mutations.push(m);
        if (Math.random() < 0.1) {
            gamete2[0] = m;
        }
    }

    const childGenes = [...gamete1, ...gamete2].filter(g => g);

    if (childGenes.length > 6 && Math.random() < GENE_DELETION_CHANCE) {
        childGenes.pop();
    }

    if (childGenes.length === 0) {
        childGenes.push(GeneType.CREAM);
    }

    // 2. Breed lightness
    const avgLightness = (genetics1.lightness + genetics2.lightness) / 2;
    let childLightness = avgLightness;
    if (Math.random() < LIGHTNESS_MUTATION_CHANCE) {
        const mutation = (Math.random() - 0.5) * 2 * LIGHTNESS_MUTATION_AMOUNT;
        childLightness += mutation;
    }
    childLightness = Math.max(0, Math.min(100, Math.round(childLightness)));

    // 2.5 Breed saturation (Similar to lightness)
    const avgSaturation = (genetics1.saturation + genetics2.saturation) / 2;
    let childSaturation = avgSaturation;
    if (Math.random() < LIGHTNESS_MUTATION_CHANCE) { // Use same chance for now
        const mutation = (Math.random() - 0.5) * 2 * LIGHTNESS_MUTATION_AMOUNT;
        childSaturation += mutation;
    }
    childSaturation = Math.max(0, Math.min(100, Math.round(childSaturation)));

    // 3. Breed spots
    const parent1Spots = genetics1.spots;
    const parent2Spots = genetics2.spots;
    const combinedSpots = [...parent1Spots, ...parent2Spots];

    const maxSpots = Math.max(parent1Spots.length, parent2Spots.length);
    const minSpots = Math.min(parent1Spots.length, parent2Spots.length);

    const blendedCount = Math.floor((maxSpots + minSpots) / 2);
    const baseCount = Math.random() < 0.5 ? maxSpots : blendedCount;

    const n = baseCount;
    const addWeight = Math.exp(-n / 10);
    const deleteWeight = 1 - Math.exp(-n / 10);
    const keepWeight = Math.exp(-n / 20);
    const totalWeight = addWeight + deleteWeight + keepWeight;

    const roll = Math.random() * totalWeight;
    let targetSpotsCount = baseCount;
    if (roll < addWeight) {
        targetSpotsCount = baseCount + 1;
    } else if (roll < addWeight + deleteWeight) {
        targetSpotsCount = Math.max(0, baseCount - 1);
    }

    const childSpots: Spot[] = [];
    if (combinedSpots.length > 0) {
        const shuffled = combinedSpots.sort(() => 0.5 - Math.random());
        const maxParentSpots = Math.max(parent1Spots.length, parent2Spots.length);
        const inheritanceCount = Math.min(targetSpotsCount, maxParentSpots);
        const inheritedSpots = shuffled.slice(0, inheritanceCount);

        for (const spot of inheritedSpots) {
            let newColor = spot.color;
            if (Math.random() < SPOT_COLOR_MUTATION_CHANCE) {
                newColor = getRandomTraitWithRarity(ALL_SPOT_COLORS, GENE_RARITY);
            }
            childSpots.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.max(40, Math.min(90, spot.size + (Math.random() - 0.5) * SIZE_MUTATION_AMOUNT * 2)),
                color: newColor,
                shape: spot.shape || Object.values(SpotShape)[Math.floor(Math.random() * 3)],
            });
        }
    }

    const parentColors = Array.from(new Set(combinedSpots.map(s => s.color)));

    while (childSpots.length < targetSpotsCount) {
        let nextColor: GeneType | undefined = undefined;
        if (parentColors.length > 0 && Math.random() > SPOT_COLOR_MUTATION_CHANCE) {
            nextColor = parentColors[Math.floor(Math.random() * parentColors.length)];
        }
        childSpots.push(createNewRandomSpot(nextColor));
    }



    // 5. Create generational data
    let childGenerationalData: GenerationalData | undefined;
    if (genetics1.spotPhenotypeGenes || genetics2.spotPhenotypeGenes) {
        const parent1Phenotype = genetics1.spotPhenotypeGenes
            ? calculateSpotPhenotype(genetics1.spotPhenotypeGenes)
            : undefined;
        const parent2Phenotype = genetics2.spotPhenotypeGenes
            ? calculateSpotPhenotype(genetics2.spotPhenotypeGenes)
            : undefined;

        const parentGen1 = genetics1.generationalData?.generation ?? 0;
        const parentGen2 = genetics2.generationalData?.generation ?? 0;
        const newGeneration = Math.max(parentGen1, parentGen2) + 1;

        childGenerationalData = {
            generation: newGeneration,
            ancestorTraits: {
                grandparent1: parent1Phenotype ? {
                    colorSaturation: parent1Phenotype.colorSaturation,
                    edgeBlur: parent1Phenotype.edgeBlur,
                } : undefined,
                grandparent2: parent2Phenotype ? {
                    colorSaturation: parent2Phenotype.colorSaturation,
                    edgeBlur: parent2Phenotype.edgeBlur,
                } : undefined,
            }
        };
    }

    // 6. Breed albino alleles (Recessive inheritance)
    let childAlbinoAlleles: [boolean, boolean] | undefined;
    const parent1Alleles = genetics1.albinoAlleles || [false, false];
    const parent2Alleles = genetics2.albinoAlleles || [false, false];
    // Each parent passes one random allele
    const fromParent1 = parent1Alleles[Math.random() < 0.5 ? 0 : 1];
    const fromParent2 = parent2Alleles[Math.random() < 0.5 ? 0 : 1];
    childAlbinoAlleles = [fromParent1, fromParent2];

    return {
        genetics: {
            baseColorGenes: childGenes,
            spots: childSpots,
            lightness: childLightness,
            saturation: childSaturation,
            albinoAlleles: childAlbinoAlleles,
            spotPhenotypeGenes: childSpotPhenotypeGenes,
            generationalData: childGenerationalData,
        },
        mutations
    };
};

export const createRandomGenetics = (): KoiGenetics => {
    return {
        baseColorGenes: [GeneType.WHITE, GeneType.WHITE],
        spots: [],
        lightness: 50,
        saturation: 50,
        spotPhenotypeGenes: createRandomSpotPhenotypeGenes(),
    };
}



export const calculateRarityScore = (koi: Koi): number => {
    let score = 0;
    koi.genetics.baseColorGenes.forEach(g => {
        score += (GENE_RARITY[g] || 1);
    });
    score += koi.genetics.spots.reduce((sum, spot) => sum + (GENE_RARITY[spot.color] || 1), 0);

    return score;
};

export const hexToHSL = (hex: string): { h: number, s: number, l: number } => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
        r = parseInt("0x" + hex[1] + hex[1]);
        g = parseInt("0x" + hex[2] + hex[2]);
        b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
        r = parseInt("0x" + hex[1] + hex[2]);
        g = parseInt("0x" + hex[3] + hex[4]);
        b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255; g /= 255; b /= 255;
    const cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin;
    let h = 0, s = 0, l = (cmax + cmin) / 2;
    if (delta !== 0) {
        if (cmax === r) h = ((g - b) / delta) % 6;
        else if (cmax === g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        s = delta / (1 - Math.abs(2 * l - 1));
    }
    return { h, s: +(s * 100).toFixed(1), l: +(l * 100).toFixed(1) };
}

export const getDisplayColor = (phenotype: GeneType, lightness: number, saturation: number = 50, isAlbino: boolean = false): string => {
    // White also goes through normal logic now to support saturation/lightness changes
    const hex = GENE_COLOR_MAP[phenotype] || '#000000';
    const hsl = hexToHSL(hex);

    // Apply safe Lightness (Expanded range per user request: 0.4 -> 0.8 multiplier, Min 20 -> 10)
    // Center is 50. Input 0 -> -40, Input 100 -> +40.
    // Max extended but clamped to 90 to prevent pure white, Min 10 to prevent pure black
    let safeLightnessShift = (lightness - 50) * 0.8;
    let finalL = Math.max(10, Math.min(90, hsl.l + safeLightnessShift));

    // ALBINO: Force max lightness (pastel/pale version of base color)
    if (isAlbino) {
        finalL = 90; // Maximum safe lightness
    }

    // Apply safe Saturation
    const saturationMultiplier = 0.5 + (saturation / 100);
    const finalS = Math.max(10, Math.min(95, hsl.s * saturationMultiplier));

    return `hsla(${hsl.h}, ${finalS}%, ${finalL}%, 1)`;
};

export const getSpineColor = (phenotype: GeneType, lightness: number, saturation: number = 50, isAlbino: boolean = false): string => {
    const hex = GENE_COLOR_MAP[phenotype] || '#000000';
    const hsl = hexToHSL(hex);

    // Apply saturation (same logic as getDisplayColor)
    const saturationMultiplier = 0.5 + (saturation / 100);
    const finalS = Math.max(10, Math.min(95, hsl.s * saturationMultiplier));

    // Apply safe Lightness (Match getDisplayColor logic)
    const safeLightnessShift = (lightness - 50) * 0.8;
    let finalL = Math.max(10, Math.min(90, hsl.l + safeLightnessShift));

    // ALBINO: Force max lightness
    if (isAlbino) {
        finalL = 85; // Slightly less than body for spine visibility
    }

    return `hsla(${hsl.h}, ${finalS}%, ${Math.max(0, finalL - 10)}%, 0.3)`;
};

// ============================================
// SPOT PHENOTYPE GENETICS SYSTEM (4-Gene)
// ============================================

const GENE_DOMINANCE_CONFIG: Record<keyof SpotPhenotypeGenes, DominanceType> = {
    CS: DominanceType.COMPLETE,
    EB: DominanceType.COMPLETE,
};

type SpotGeneId = keyof SpotPhenotypeGenes;
interface LinkageGroup {
    genes: [SpotGeneId, SpotGeneId];
    linkageStrength: number;
}

const LINKAGE_GROUPS: LinkageGroup[] = [
    { genes: ['CS', 'EB'], linkageStrength: 0.3 },
];

interface MutationConfig {
    type: 'point' | 'deletion' | 'duplication' | 'inversion';
    rate: number;
    magnitude: number;
}

const MUTATION_CONFIGS: Record<keyof SpotPhenotypeGenes, MutationConfig> = {
    CS: { type: 'point', rate: 0.03, magnitude: 0.15 },
    EB: { type: 'point', rate: 0.02, magnitude: 0.15 },
};

const CROSSOVER_RATE = 0.15;
const DRIFT_RATE = 0.005;

const IMPRINTING_CONFIG: Record<keyof SpotPhenotypeGenes, { maternalBias: number; paternalBias: number }> = {
    CS: { maternalBias: 1.0, paternalBias: 1.0 },
    EB: { maternalBias: 0.8, paternalBias: 1.2 },
};

interface ThresholdTrait {
    id: string;
    name: string;
    requirements: Partial<Record<keyof SpotPhenotypeGenes, number>>;
    description: string;
}

const THRESHOLD_TRAITS: ThresholdTrait[] = [
    { id: 'golden_sheen', name: '황금빛 채도', requirements: { CS: 0.8 }, description: '황금빛으로 빛나는 강렬한 채도' },
    { id: 'ghost_pattern', name: '흐린 무늬', requirements: { EB: 0.8 }, description: '경계가 매우 부드러운 유령 같은 무늬' },
];

interface GeneInteraction {
    partner: keyof SpotPhenotypeGenes;
    type: 'synergy' | 'antagonism' | 'neutral';
    strength: number;
}

const GENE_INTERACTIONS: Record<keyof SpotPhenotypeGenes, GeneInteraction[]> = {
    CS: [{ partner: 'EB', type: 'antagonism', strength: 0.25 }],
    EB: [],
};

const HIDDEN_ACTIVATION_THRESHOLD = 3;

const applyImprinting = (allele: Allele, geneId: keyof SpotPhenotypeGenes): number => {
    const config = IMPRINTING_CONFIG[geneId];
    const bias = allele.origin === 'maternal' ? config.maternalBias : config.paternalBias;
    return allele.value * bias;
};

const applyGeneInteractions = (expressed: Record<keyof SpotPhenotypeGenes, number>): Record<keyof SpotPhenotypeGenes, number> => {
    const result = { ...expressed };
    for (const [geneId, interactions] of Object.entries(GENE_INTERACTIONS)) {
        const key = geneId as keyof SpotPhenotypeGenes;
        for (const interaction of interactions) {
            const partnerValue = expressed[interaction.partner];
            const ownValue = expressed[key];
            if (interaction.type === 'synergy' && partnerValue > 0.6 && ownValue > 0.6) {
                result[key] = Math.min(1, result[key] * (1 + interaction.strength));
            } else if (interaction.type === 'antagonism' && partnerValue > 0.7) {
                result[key] = Math.max(0, result[key] * (1 - interaction.strength));
            }
        }
    }
    return result;
};

const checkThresholdTraits = (expressed: Record<keyof SpotPhenotypeGenes, number>): string[] => {
    const activeTraits: string[] = [];
    for (const trait of THRESHOLD_TRAITS) {
        let allMet = true;
        for (const [geneId, threshold] of Object.entries(trait.requirements)) {
            if (expressed[geneId as keyof SpotPhenotypeGenes] < threshold) { allMet = false; break; }
        }
        if (allMet) activeTraits.push(trait.id);
    }
    return activeTraits;
};

const applyThresholdEffects = (phenotype: SpotPhenotype, activeTraits: string[]): SpotPhenotype => {
    const result = { ...phenotype };
    for (const traitId of activeTraits) {
        switch (traitId) {
            case 'golden_sheen': result.colorSaturation = Math.min(1, result.colorSaturation * 1.3); break;
            case 'ghost_pattern': result.edgeBlur = Math.min(1, result.edgeBlur * 1.25); break;
        }
    }
    return result;
};

const checkHiddenRecessiveActivation = (genes: SpotPhenotypeGenes): boolean => {
    let recessiveCount = 0;
    for (const geneId of Object.keys(genes) as (keyof SpotPhenotypeGenes)[]) {
        if (genes[geneId].allele1.value < 0.35 && genes[geneId].allele2.value < 0.35) recessiveCount++;
    }
    return recessiveCount >= HIDDEN_ACTIVATION_THRESHOLD;
};

export const expressGene = (geneAlleles: GeneAlleles, geneId?: keyof SpotPhenotypeGenes): number => {
    const { allele1, allele2, dominanceType } = geneAlleles;
    let val1 = geneId ? applyImprinting(allele1, geneId) : allele1.value;
    let val2 = geneId ? applyImprinting(allele2, geneId) : allele2.value;

    let expressed = 0.5;
    switch (dominanceType) {
        case DominanceType.COMPLETE:
            expressed = val1; // Assume allele1 is dominant if complete
            break;
        case DominanceType.INCOMPLETE:
            expressed = (val1 + val2) / 2;
            break;
        case DominanceType.RECESSIVE:
            expressed = Math.min(val1, val2);
            break;
        case DominanceType.CODOMINANCE:
            expressed = (val1 + val2) / 2;
            break;
    }
    return Math.round(expressed); // Return as integer 0-100
};

// Calculate final phenotype for rendering (converts internal 0-100 to 0-1)
export const calculateSpotPhenotype = (genes: SpotPhenotypeGenes, koi?: Koi): SpotPhenotype => {
    const geneIds = Object.keys(genes) as (keyof SpotPhenotypeGenes)[];
    const expressed: Record<keyof SpotPhenotypeGenes, number> = {} as any;

    geneIds.forEach(id => {
        expressed[id] = expressGene(genes[id], id);
    });

    const afterInteractions = applyGeneInteractions(expressed);
    let CS = afterInteractions.CS;
    let EB = afterInteractions.EB;

    if (checkHiddenRecessiveActivation(genes)) {
        CS = Math.min(100, CS * 1.2);
    }

    const effectiveCS = CS;

    let envModifier = 1.0;
    if (koi) {
        // Age factor: adult=1.0, juvenile=0.85, fry=0.7
        const ageFactor = koi.growthStage === GrowthStage.ADULT ? 1.0 : koi.growthStage === GrowthStage.JUVENILE ? 0.85 : 0.7;
        envModifier = ageFactor;
    }

    // Convert to 0-1 for renderer
    let phenotype: SpotPhenotype = {
        colorSaturation: Math.max(0, Math.min(1, (effectiveCS / 100) * envModifier)),
        edgeBlur: Math.max(0, Math.min(1, EB / 100)),
    };

    const activeTraits = checkThresholdTraits(afterInteractions);
    if (activeTraits.length > 0) {
        phenotype = applyThresholdEffects(phenotype, activeTraits);
        phenotype.activeTraits = activeTraits;
    }

    return phenotype;
};

export const createRandomSpotPhenotypeGenes = (): SpotPhenotypeGenes => {
    // Use defaults with small variance (CS=70±15, EB=30±15) for line breeding
    const defaultCS = 70;
    const defaultEB = 30;
    const variance = 15;
    const randomVariance = () => Math.round((Math.random() - 0.5) * 2 * variance);

    return {
        CS: {
            allele1: { value: Math.max(0, Math.min(100, defaultCS + randomVariance())), origin: 'maternal' },
            allele2: { value: Math.max(0, Math.min(100, defaultCS + randomVariance())), origin: 'paternal' },
            dominanceType: GENE_DOMINANCE_CONFIG.CS,
        },
        EB: {
            allele1: { value: Math.max(0, Math.min(100, defaultEB + randomVariance())), origin: 'maternal' },
            allele2: { value: Math.max(0, Math.min(100, defaultEB + randomVariance())), origin: 'paternal' },
            dominanceType: GENE_DOMINANCE_CONFIG.EB,
        },
    };
};

export const breedSpotPhenotypeGenes = (parent1Genes: SpotPhenotypeGenes, parent2Genes: SpotPhenotypeGenes): SpotPhenotypeGenes => {
    const offspringGenes = {} as SpotPhenotypeGenes;
    const geneIds = Object.keys(parent1Genes) as (keyof SpotPhenotypeGenes)[];

    for (const geneId of geneIds) {
        const allele1 = Math.random() < 0.5 ? parent1Genes[geneId].allele1 : parent1Genes[geneId].allele2;
        const allele2 = Math.random() < 0.5 ? parent2Genes[geneId].allele1 : parent2Genes[geneId].allele2;

        // Mutation logic: 20% chance, +/- 5 range, more likely to decrease if high
        const mutate = (val: number) => {
            if (Math.random() > 0.2) return val;

            // "Improvement is hard": If value is high (>60), mutation is biased downwards
            const bias = val > 60 ? -1.5 : 0;
            const change = (Math.random() - 0.5) * 10 + bias; // range -5 to +5 (biased if high)
            return Math.max(0, Math.min(100, Math.round(val + change)));
        };

        offspringGenes[geneId] = {
            allele1: { value: mutate(allele1.value), origin: 'maternal' },
            allele2: { value: mutate(allele2.value), origin: 'paternal' },
            dominanceType: GENE_DOMINANCE_CONFIG[geneId],
        };
    }
    return offspringGenes;
};

export const createDefaultSpotPhenotypeGenes = (): SpotPhenotypeGenes => ({
    CS: { allele1: { value: 70, origin: 'maternal' }, allele2: { value: 70, origin: 'paternal' }, dominanceType: DominanceType.COMPLETE },
    EB: { allele1: { value: 30, origin: 'maternal' }, allele2: { value: 30, origin: 'paternal' }, dominanceType: DominanceType.COMPLETE },
});
