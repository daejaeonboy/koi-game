
import { KoiGenetics, GeneType, Spot, Koi, GrowthStage, SpotShape, DominanceType, Allele, GeneAlleles, SpotPhenotypeGenes, SpotPhenotype, GenerationalData, ThresholdTrait, GeneInteraction, GeneInteractionType } from '../types';

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
// Rules (Strict Dominance):
// 1. The most dominant gene present expresses itself.
// 2. No pairs required. (Simplifies inheritance: Carrier = Expressed for Dominant traits)
// 3. Fallback to Cream if empty.
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

    // If multiple genes are expressed (e.g. [Red, Red, Black, Black]), 
    // we use Dominance Order to decide which wins.
    // (Though with standard 2-gene slots, this only happens if user expands slots)

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
    // Sum value of all genes
    genetics.baseColorGenes.forEach(gene => {
        if (gene !== GeneType.CREAM) { // Don't count basic/legacy types too much
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
        // Fry
        value *= 1;
    }

    // Stamina/Health Penalties (User Request)
    // 10% or less OR Sick -> 0 ZP
    if ((koi.stamina ?? 0) <= 10 || koi.sickTimestamp) {
        return 0;
    }
    // 40% or less -> 1/4 Price
    else if ((koi.stamina ?? 0) <= 40) {
        value *= 0.25;
    }
    // 60% or less -> 1/2 Price
    else if ((koi.stamina ?? 0) <= 60) {
        value *= 0.5;
    }

    return Math.floor(value);
};



const SPOT_COLOR_MUTATION_CHANCE = 0.05; // Adjusted to 5% per user request
const SIZE_MUTATION_AMOUNT = 4;
const LIGHTNESS_MUTATION_CHANCE = 0.2;
const LIGHTNESS_MUTATION_AMOUNT = 5;
const BASE_COLOR_MUTATION_CHANCE = 0; // Disabled in favor of Shop System (User Request)
const SPECIAL_MUTATION_CHANCE = 0; // Disabled until special colors are defined (Safety Fix)

const createNewRandomSpot = (preferredColor?: GeneType): Spot => {
    // Randomize between all shapes EXCEPT OVAL_V (User request: Remove OVAL_V, keep OVAL_H)
    // We only use OVAL_H for "Oval" shapes now.
    const shapeValues = Object.values(SpotShape).filter(s => s !== SpotShape.OVAL_V);
    const shape = shapeValues[Math.floor(Math.random() * shapeValues.length)] as SpotShape;

    // User Request: All shapes max 240 (3x increase from 80)
    let maxSize = 240;

    // Previous circle special case removed per request.

    const sizeRange = maxSize - 20; // Min size 20

    // Color Logic: Use preferred if provided, otherwise random
    let color = preferredColor;
    if (!color) {
        color = getRandomTraitWithRarity(ALL_SPOT_COLORS, GENE_RARITY);
    }

    return {
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * sizeRange + 20,
        color: color,
        shape: shape,
    };
};

const GENE_EXPANSION_CHANCE = 0; // Disabled to ensure strict recessive inheritance (User Request)
const GENE_DELETION_CHANCE = 0.02; // 2% chance to lose a gene (prevent infinite bloat)

const getGamete = (genes: GeneType[]): GeneType[] => {
    // Meiosis-ish: Pass roughly half the genes
    // Minimum 1 gene passed
    const gameteSize = Math.max(1, Math.floor(genes.length / 2));

    // Shuffle and slice
    const shuffled = [...genes].sort(() => 0.5 - Math.random());
    const gamete = shuffled.slice(0, gameteSize);

    // Gene Expansion Mutation:
    // Sometimes a gene gets duplicated or stuck, adding to the genome size
    if (Math.random() < GENE_EXPANSION_CHANCE) {
        // Add one more random gene from original pool
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

    // 1. Breed base color genes (Polygenic)
    // Combine gametes from both parents
    let gamete1 = getGamete(genetics1.baseColorGenes);
    let gamete2 = getGamete(genetics2.baseColorGenes);

    // Mutation Logic (Substitution)
    // Apply mutation to random genes in the gametes
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

    // Special Mutation (Albino/etc)
    if (Math.random() < SPECIAL_MUTATION_CHANCE) {
        const m = getRandomTraitWithRarity(SPECIAL_COLORS, GENE_RARITY);
        // Force insert or replace
        gamete1[0] = m;
        mutations.push(m);
        // Strong special mutation might affect both or add new
        if (Math.random() < 0.1) {
            gamete2[0] = m;
        }
    }

    const childGenes = [...gamete1, ...gamete2].filter(g => g); // Filter undefined

    // Gene Deletion (Pruning)
    // If genome gets too large (>6), small chance to prune to keep it reasonable
    if (childGenes.length > 6 && Math.random() < GENE_DELETION_CHANCE) {
        childGenes.pop();
    }

    // Safety Force: Ensure at least one gene
    if (childGenes.length === 0) {
        childGenes.push(GeneType.CREAM);
    }

    // Ensure at least 2 genes total for stability? 
    // Usually getGamete returns min 1, so 1+1=2. Safe.

    // 2. Breed lightness
    const avgLightness = (genetics1.lightness + genetics2.lightness) / 2;
    let childLightness = avgLightness;
    if (Math.random() < LIGHTNESS_MUTATION_CHANCE) {
        const mutation = (Math.random() - 0.5) * 2 * LIGHTNESS_MUTATION_AMOUNT;
        childLightness += mutation;
    }
    childLightness = Math.max(0, Math.min(100, childLightness));

    // 3. 점(Spot) 교배
    const parent1Spots = genetics1.spots;
    const parent2Spots = genetics2.spots;
    const combinedSpots = [...parent1Spots, ...parent2Spots];

    const maxSpots = Math.max(parent1Spots.length, parent2Spots.length);
    const minSpots = Math.min(parent1Spots.length, parent2Spots.length);

    // 3-1) 기본 점 개수: 블렌딩 50% / 유지(최대값) 50%
    const blendedCount = Math.floor((maxSpots + minSpots) / 2);
    const baseCount = Math.random() < 0.5 ? maxSpots : blendedCount;

    // 3-2) 점 개수 추가/삭제/유지 확률(총합 100% 정규화)
    // 추가: e^(-n/10), 삭제: 1 - e^(-n/10), 유지: e^(-n/20)
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

        // Key Logic Update:
        // "Inherited" spots should not exceed the max count of a single parent.
        // Any spots BEYOND what parents had are considered "New Growth" and should be random.
        const maxParentSpots = Math.max(parent1Spots.length, parent2Spots.length);
        const inheritanceCount = Math.min(targetSpotsCount, maxParentSpots);

        // Inherit only up to the inheritance limit
        const inheritedSpots = shuffled.slice(0, inheritanceCount);

        for (const spot of inheritedSpots) {
            let newColor = spot.color;
            if (Math.random() < SPOT_COLOR_MUTATION_CHANCE) {
                newColor = getRandomTraitWithRarity(ALL_SPOT_COLORS, GENE_RARITY);
            }
            childSpots.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                size: Math.max(20, Math.min(120, spot.size + (Math.random() - 0.5) * SIZE_MUTATION_AMOUNT * 2)),
                color: newColor,
                shape: spot.shape || Object.values(SpotShape)[Math.floor(Math.random() * 3)],
            });
        }
    }

    // Collect all parent spot colors for inheritance
    const parentColors = Array.from(new Set(combinedSpots.map(s => s.color)));

    // If we need more spots than inherited (e.g. mutation or just filling up), add new ones
    while (childSpots.length < targetSpotsCount) {
        let nextColor: GeneType | undefined = undefined;

        // 95% Chance to inherit a color from parents (if available)
        // 5% Chance (or if parents have no spots) to be purely random
        if (parentColors.length > 0 && Math.random() > SPOT_COLOR_MUTATION_CHANCE) {
            // Pick a random color from the parents' pool
            nextColor = parentColors[Math.floor(Math.random() * parentColors.length)];
        }

        childSpots.push(createNewRandomSpot(nextColor));

    }

    // 4. Breed Transparency - REMOVED
    const childIsTransparent = false;

    // 5. Create generational data for atavism (격세유전)
    // Store current parents' phenotypes as ancestor traits for future generations
    let childGenerationalData: GenerationalData | undefined;
    if (genetics1.spotPhenotypeGenes || genetics2.spotPhenotypeGenes) {
        // Calculate parent phenotypes to store as ancestor traits
        const parent1Phenotype = genetics1.spotPhenotypeGenes
            ? calculateSpotPhenotype(genetics1.spotPhenotypeGenes)
            : undefined;
        const parent2Phenotype = genetics2.spotPhenotypeGenes
            ? calculateSpotPhenotype(genetics2.spotPhenotypeGenes)
            : undefined;

        // Get existing generational data from parents (for cascading atavism)
        const parentGen1 = genetics1.generationalData?.generation ?? 0;
        const parentGen2 = genetics2.generationalData?.generation ?? 0;
        const newGeneration = Math.max(parentGen1, parentGen2) + 1;

        childGenerationalData = {
            generation: newGeneration,
            ancestorTraits: {
                // Grandparent traits = current parent's traits
                grandparent1: parent1Phenotype ? {
                    opacityBase: parent1Phenotype.opacityBase,
                    colorHue: parent1Phenotype.colorHue,
                    colorSaturation: parent1Phenotype.colorSaturation,
                    sizeBase: parent1Phenotype.sizeBase,
                    edgeBlur: parent1Phenotype.edgeBlur,
                    density: parent1Phenotype.density,
                } : undefined,
                grandparent2: parent2Phenotype ? {
                    opacityBase: parent2Phenotype.opacityBase,
                    colorHue: parent2Phenotype.colorHue,
                    colorSaturation: parent2Phenotype.colorSaturation,
                    sizeBase: parent2Phenotype.sizeBase,
                    edgeBlur: parent2Phenotype.edgeBlur,
                    density: parent2Phenotype.density,
                } : undefined,
            }
        };
    }

    return {
        genetics: {
            baseColorGenes: childGenes,
            spots: childSpots,
            lightness: childLightness,
            isTransparent: childIsTransparent,
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
        isTransparent: false,
        spotPhenotypeGenes: createRandomSpotPhenotypeGenes(),
    };
}

export const calculateRarityScore = (koi: Koi): number => {
    let score = 0;
    koi.genetics.baseColorGenes.forEach(g => {
        score += (GENE_RARITY[g] || 1);
    });

    // Bonus for spots
    score += koi.genetics.spots.reduce((sum, spot) => sum + (GENE_RARITY[spot.color] || 1), 0);

    // Bonus for Transparency
    if (koi.genetics.isTransparent) {
        score += 50;
    }

    return score;
};

// Helper to convert Hex to HSL
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
    r /= 255;
    g /= 255;
    b /= 255;
    const cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin;
    let h = 0, s = 0, l = 0;

    if (delta === 0) h = 0;
    else if (cmax === r) h = ((g - b) / delta) % 6;
    else if (cmax === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
}

export const getDisplayColor = (phenotype: GeneType, lightness: number, isTransparent: boolean = false): string => {


    // Special handling for White: Keep their specific look (ignore lightness gene)
    if (phenotype === GeneType.WHITE) {
        const hex = GENE_COLOR_MAP[phenotype];
        const hsl = hexToHSL(hex);
        return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, 1)`;
    }

    const hex = GENE_COLOR_MAP[phenotype] || '#000000';
    const hsl = hexToHSL(hex);

    // Lightness Logic Update:
    // Respect the intrinsic lightness of the base color (hsl.l)
    // Apply genetics.lightness (default 50) as an offset.
    // hsl.l is 0-100 range from hexToHSL.

    const baseL = hsl.l;
    const lightnessOffset = lightness - 50; // -50 to +50
    const finalL = Math.max(5, Math.min(95, baseL + lightnessOffset)); // Clamp 5-95% (Lowered min for Deep Black)

    return `hsla(${hsl.h}, ${hsl.s}%, ${finalL}%, 1)`;
};

export const getSpineColor = (phenotype: GeneType, lightness: number): string => {
    const hex = GENE_COLOR_MAP[phenotype] || '#000000';
    const hsl = hexToHSL(hex);

    let l = lightness;

    // For fixed colors, use their intrinsic lightness
    if (phenotype === GeneType.WHITE) {
        l = hsl.l;
    }

    return `hsla(${hsl.h}, ${hsl.s}%, ${Math.max(0, l - 20)}%, 0.3)`;
};

// ============================================
// SPOT PHENOTYPE GENETICS SYSTEM (10-Gene)
// ============================================

// Dominance type configuration for each gene
const GENE_DOMINANCE_CONFIG: Record<keyof SpotPhenotypeGenes, DominanceType> = {
    OP: DominanceType.INCOMPLETE,   // 불완전 우성 - 평균값
    OV: DominanceType.RECESSIVE,    // 열성 - 둘 다 높아야 발현
    CH: DominanceType.CODOMINANCE,  // 공우성 - 복합 효과
    CS: DominanceType.COMPLETE,     // 완전 우성 - 높은 값
    SB: DominanceType.INCOMPLETE,   // 불완전 우성 - 평균값
    SV: DominanceType.RECESSIVE,    // 열성 - 둘 다 높아야 발현
    EB: DominanceType.COMPLETE,     // 완전 우성 - 높은 값
    DN: DominanceType.INCOMPLETE,   // 불완전 우성 - 평균값
    PX: DominanceType.CODOMINANCE,  // 공우성 - 복합 효과
    PY: DominanceType.CODOMINANCE,  // 공우성 - 복합 효과
};

// Linkage groups - genes that tend to be inherited together
type SpotGeneId = keyof SpotPhenotypeGenes;
interface LinkageGroup {
    genes: [SpotGeneId, SpotGeneId];
    linkageStrength: number;
}

const LINKAGE_GROUPS: LinkageGroup[] = [
    { genes: ['OP', 'OV'], linkageStrength: 0.7 },  // 70% 함께 유전
    { genes: ['CH', 'CS'], linkageStrength: 0.8 },  // 80% 함께 유전
    { genes: ['SB', 'SV'], linkageStrength: 0.6 },  // 60% 함께 유전
    { genes: ['PX', 'PY'], linkageStrength: 0.9 },  // 90% 함께 유전
];

// Mutation configuration for each gene
interface MutationConfig {
    type: 'point' | 'deletion' | 'duplication' | 'inversion';
    rate: number;
    magnitude: number;
}

const MUTATION_CONFIGS: Record<keyof SpotPhenotypeGenes, MutationConfig> = {
    OP: { type: 'point', rate: 0.02, magnitude: 0.15 },
    OV: { type: 'point', rate: 0.03, magnitude: 0.20 },
    CH: { type: 'point', rate: 0.05, magnitude: 0.25 }, // 색상은 변이 잦음
    CS: { type: 'point', rate: 0.03, magnitude: 0.15 },
    SB: { type: 'point', rate: 0.02, magnitude: 0.10 },
    SV: { type: 'point', rate: 0.04, magnitude: 0.20 },
    EB: { type: 'point', rate: 0.02, magnitude: 0.15 },
    DN: { type: 'deletion', rate: 0.01, magnitude: 0.30 }, // 밀도는 큰 변화
    PX: { type: 'point', rate: 0.03, magnitude: 0.15 },
    PY: { type: 'point', rate: 0.03, magnitude: 0.15 },
};

const CROSSOVER_RATE = 0.15; // 15% 교차 확률
const DRIFT_RATE = 0.005;    // 0.5% 드리프트

// ============================================
// COMPLEX BREEDING SYSTEM - NEW MECHANISMS
// ============================================

// 1. Genomic Imprinting (게놈 각인) - 부모 특이적 발현
const IMPRINTING_CONFIG: Record<keyof SpotPhenotypeGenes, { maternalBias: number; paternalBias: number }> = {
    OP: { maternalBias: 1.0, paternalBias: 1.0 },   // 중립
    OV: { maternalBias: 1.2, paternalBias: 0.8 },   // 모계 우세
    CH: { maternalBias: 0.9, paternalBias: 1.1 },   // 부계 우세
    CS: { maternalBias: 1.0, paternalBias: 1.0 },   // 중립
    SB: { maternalBias: 1.1, paternalBias: 0.9 },   // 모계 우세
    SV: { maternalBias: 1.0, paternalBias: 1.0 },   // 중립
    EB: { maternalBias: 0.8, paternalBias: 1.2 },   // 부계 우세
    DN: { maternalBias: 1.0, paternalBias: 1.0 },   // 중립
    PX: { maternalBias: 1.05, paternalBias: 0.95 }, // 약간 모계 우세
    PY: { maternalBias: 0.95, paternalBias: 1.05 }, // 약간 부계 우세
};

// 2. Threshold Traits (역치 형질) - 특정 조건 충족 시 특수 효과
const THRESHOLD_TRAITS: ThresholdTrait[] = [
    {
        id: 'golden_sheen',
        name: '황금빛 광채',
        requirements: { CH: 0.75, CS: 0.7, OP: 0.6 },
        description: '황금빛으로 빛나는 점 패턴'
    },
    {
        id: 'ghost_pattern',
        name: '유령 패턴',
        requirements: { OP: 0.3, EB: 0.75, DN: 0.4 },  // 낮은 투명도 + 높은 흐림 + 낮은 밀도
        description: '거의 보이지 않는 은은한 패턴'
    },
    {
        id: 'mega_spot',
        name: '거대 점',
        requirements: { SB: 0.85, SV: 0.25, DN: 0.75 },
        description: '크고 균일한 점 패턴'
    },
    {
        id: 'scattered_dots',
        name: '흩어진 점',
        requirements: { SB: 0.25, SV: 0.8, DN: 0.9 },
        description: '작고 다양한 크기의 많은 점'
    },
    {
        id: 'symmetry_master',
        name: '대칭의 달인',
        requirements: { PX: 0.5, PY: 0.5, SV: 0.2 },  // 중앙 집중 + 균일
        description: '완벽하게 대칭적인 점 배치'
    }
];

// 3. Allele Interaction Network (대립유전자 상호작용 네트워크)
const GENE_INTERACTIONS: Record<keyof SpotPhenotypeGenes, GeneInteraction[]> = {
    OP: [
        { partner: 'CS', type: 'synergy', strength: 0.2 },
        { partner: 'SB', type: 'synergy', strength: 0.15 }
    ],
    OV: [
        { partner: 'SV', type: 'synergy', strength: 0.25 }
    ],
    CH: [
        { partner: 'CS', type: 'synergy', strength: 0.3 }
    ],
    CS: [
        { partner: 'EB', type: 'antagonism', strength: 0.25 }
    ],
    SB: [
        { partner: 'DN', type: 'antagonism', strength: 0.2 }
    ],
    SV: [
        { partner: 'OV', type: 'synergy', strength: 0.2 }
    ],
    EB: [
        { partner: 'DN', type: 'synergy', strength: 0.15 },
        { partner: 'OP', type: 'antagonism', strength: 0.1 }
    ],
    DN: [
        { partner: 'SB', type: 'antagonism', strength: 0.25 }
    ],
    PX: [
        { partner: 'PY', type: 'synergy', strength: 0.3 }
    ],
    PY: [
        { partner: 'PX', type: 'synergy', strength: 0.3 }
    ]
};

// 4. QTL Noise Configuration (양적 형질 노이즈)
const QTL_NOISE_CONFIG = {
    baseNoise: 0.08,          // 기본 노이즈 ±8%
    interactionNoise: 0.12,   // 유전자 상호작용 노이즈 ±12%
    environmentalNoise: 0.05, // 환경 노이즈 ±5%
};

// 5. Generational Memory (세대 기억) - 격세유전
const ATAVISM_CHANCE = 0.08;       // 8% 확률로 조부모 형질 발현
const HIDDEN_ACTIVATION_THRESHOLD = 3; // 3개 이상 열성 호모접합 시 숨은 형질 활성화

// 6. Stochastic Expression (확률적 발현)
const STOCHASTIC_VARIANCE = 0.05;  // ±5% 확률적 변동

// Helper: Gaussian Random (DISABLED - deterministic phenotype required)
// const gaussianRandom = (): number => { ... };

// Helper: Apply Imprinting to an allele
const applyImprinting = (allele: Allele, geneId: keyof SpotPhenotypeGenes): number => {
    const config = IMPRINTING_CONFIG[geneId];
    const bias = allele.origin === 'maternal' ? config.maternalBias : config.paternalBias;
    return allele.value * bias;
};

// Helper: Apply QTL Noise (DISABLED - same genotype must produce same phenotype)
const applyQTLNoise = (value: number): number => {
    // Noise disabled for deterministic phenotype calculation
    return Math.max(0, Math.min(1, value));
};

// Helper: Apply Gene Interactions
const applyGeneInteractions = (
    expressed: Record<keyof SpotPhenotypeGenes, number>
): Record<keyof SpotPhenotypeGenes, number> => {
    const result = { ...expressed };

    for (const [geneId, interactions] of Object.entries(GENE_INTERACTIONS)) {
        const key = geneId as keyof SpotPhenotypeGenes;
        for (const interaction of interactions) {
            const partnerValue = expressed[interaction.partner];
            const ownValue = expressed[key];

            if (interaction.type === 'synergy') {
                // 두 값이 모두 높으면 시너지
                if (partnerValue > 0.6 && ownValue > 0.6) {
                    result[key] = Math.min(1, result[key] * (1 + interaction.strength));
                }
            } else if (interaction.type === 'antagonism') {
                // 상대가 높으면 억제
                if (partnerValue > 0.7) {
                    result[key] = Math.max(0, result[key] * (1 - interaction.strength));
                }
            }
        }
    }

    return result;
};

// Helper: Check and activate threshold traits (DETERMINISTIC - no random)
const checkThresholdTraits = (
    expressed: Record<keyof SpotPhenotypeGenes, number>
): string[] => {
    const activeTraits: string[] = [];

    for (const trait of THRESHOLD_TRAITS) {
        let allMet = true;
        for (const [geneId, threshold] of Object.entries(trait.requirements)) {
            const key = geneId as keyof SpotPhenotypeGenes;
            const value = expressed[key];
            // Deterministic check: must meet or exceed threshold
            if (value < threshold) {
                allMet = false;
                break;
            }
        }
        if (allMet) {
            activeTraits.push(trait.id);
        }
    }

    return activeTraits;
};

// Helper: Apply threshold trait effects
const applyThresholdEffects = (
    phenotype: SpotPhenotype,
    activeTraits: string[]
): SpotPhenotype => {
    const result = { ...phenotype };

    for (const traitId of activeTraits) {
        switch (traitId) {
            case 'golden_sheen':
                result.colorSaturation = Math.min(1, result.colorSaturation * 1.4);
                result.colorHue = 0.12; // 금색 계열
                break;
            case 'ghost_pattern':
                result.opacityBase = Math.max(0.1, result.opacityBase * 0.5);
                result.edgeBlur = Math.min(1, result.edgeBlur * 1.5);
                break;
            case 'mega_spot':
                result.sizeBase = Math.min(1, result.sizeBase * 1.3);
                result.sizeVariance = Math.max(0, result.sizeVariance * 0.3);
                break;
            case 'scattered_dots':
                result.sizeBase = Math.max(0.1, result.sizeBase * 0.6);
                result.density = Math.min(1, result.density * 1.3);
                break;
            case 'symmetry_master':
                result.positionBiasX = 0.5;
                result.positionBiasY = 0.5;
                result.sizeVariance = Math.max(0, result.sizeVariance * 0.5);
                break;
        }
    }

    return result;
};

// Helper: Apply stochastic expression (DISABLED - causes flickering)
const applyStochasticExpression = (phenotype: SpotPhenotype): SpotPhenotype => {
    // Stochastic expression disabled to prevent spot flickering
    return phenotype;
};

// Helper: Check for hidden recessive activation
const checkHiddenRecessiveActivation = (genes: SpotPhenotypeGenes): boolean => {
    // 여러 유전자가 동시에 열성 호모접합일 때 활성화
    let recessiveCount = 0;
    const geneIds = Object.keys(genes) as (keyof SpotPhenotypeGenes)[];

    for (const geneId of geneIds) {
        const gene = genes[geneId];
        // 두 대립유전자 모두 낮은 값 (열성 호모접합 상태)
        if (gene.allele1.value < 0.35 && gene.allele2.value < 0.35) {
            recessiveCount++;
        }
    }

    return recessiveCount >= HIDDEN_ACTIVATION_THRESHOLD;
};

// Helper: Apply atavism (격세유전) - DISABLED for deterministic phenotype
const applyAtavism = (
    phenotype: SpotPhenotype,
    ancestorTraits?: Partial<SpotPhenotype>
): SpotPhenotype => {
    // Atavism disabled to ensure same genotype produces same phenotype
    return phenotype;
};

/**
 * Express a single gene based on its dominance type
 * 우성 유형에 따라 두 대립유전자에서 표현형 값 계산
 * NEW: Applies genomic imprinting (게놈 각인) for parent-specific expression
 */
export const expressGene = (geneAlleles: GeneAlleles, geneId?: keyof SpotPhenotypeGenes): number => {
    const { allele1, allele2, dominanceType } = geneAlleles;

    // Apply imprinting if geneId is provided (게놈 각인 적용)
    let val1 = allele1.value;
    let val2 = allele2.value;
    if (geneId) {
        val1 = applyImprinting(allele1, geneId);
        val2 = applyImprinting(allele2, geneId);
    }

    let baseValue: number;
    switch (dominanceType) {
        case DominanceType.COMPLETE:      // 완전 우성: 높은 값이 발현
            baseValue = Math.max(val1, val2);
            break;
        case DominanceType.INCOMPLETE:    // 불완전 우성: 평균값
            baseValue = (val1 + val2) / 2;
            break;
        case DominanceType.RECESSIVE:     // 열성: 둘 다 높아야 발현 (min)
            baseValue = Math.min(val1, val2);
            break;
        case DominanceType.CODOMINANCE:   // 공우성: 복합 효과
            baseValue = val1 * 0.5 + val2 * 0.5 + Math.abs(val1 - val2) * 0.2;
            break;
        default:
            baseValue = (val1 + val2) / 2;
    }

    // Apply QTL noise for unpredictability (양적 형질 노이즈)
    return applyQTLNoise(baseValue);
};

/**
 * Calculate the final spot phenotype from genes
 * ENHANCED: Now applies all 7 complexity mechanisms:
 * 1. Genomic Imprinting (게놈 각인)
 * 2. QTL Noise (양적 형질 노이즈)
 * 3. Gene Interactions (상호작용 네트워크)
 * 4. Epistasis (상위성) - existing
 * 5. Threshold Traits (역치 형질)
 * 6. Stochastic Expression (확률적 발현)
 * 7. Hidden Recessive Activation (숨은 열성)
 * 8. Atavism (격세유전) - if generational data available
 */
export const calculateSpotPhenotype = (genes: SpotPhenotypeGenes, koi?: Koi): SpotPhenotype => {
    // Step 1: Express all genes with imprinting and QTL noise
    const expressedRaw: Record<keyof SpotPhenotypeGenes, number> = {
        OP: expressGene(genes.OP, 'OP'),
        OV: expressGene(genes.OV, 'OV'),
        CH: expressGene(genes.CH, 'CH'),
        CS: expressGene(genes.CS, 'CS'),
        SB: expressGene(genes.SB, 'SB'),
        SV: expressGene(genes.SV, 'SV'),
        EB: expressGene(genes.EB, 'EB'),
        DN: expressGene(genes.DN, 'DN'),
        PX: expressGene(genes.PX, 'PX'),
        PY: expressGene(genes.PY, 'PY'),
    };

    // Step 2: Apply Gene Interaction Network (상호작용 네트워크)
    const afterInteractions = applyGeneInteractions(expressedRaw);

    // Unpack for later use
    let expressedOP = afterInteractions.OP;
    let expressedOV = afterInteractions.OV;
    let expressedCH = afterInteractions.CH;
    let expressedCS = afterInteractions.CS;
    let expressedSB = afterInteractions.SB;
    let expressedSV = afterInteractions.SV;
    let expressedEB = afterInteractions.EB;
    let expressedDN = afterInteractions.DN;
    let expressedPX = afterInteractions.PX;
    let expressedPY = afterInteractions.PY;

    // Step 3: Check hidden recessive activation (숨은 열성 활성화) - DETERMINISTIC
    const hiddenActive = checkHiddenRecessiveActivation(genes);
    if (hiddenActive) {
        // 숨은 열성 활성화: 결정론적 극단 변화 (고정 값 사용)
        const boostFactor = 1.5;    // Fixed boost
        const suppressFactor = 0.5; // Fixed suppress

        // 결정론적 적용: OP/CS는 증폭, SB는 억제
        expressedOP *= boostFactor;
        expressedCS *= boostFactor;
        expressedSB *= suppressFactor;
    }

    // Step 4: Apply Epistasis (상위성) - existing logic
    // EB >= 0.8 → CS 억제
    const isEBEpistatic = expressedEB > 0.8;
    let effectiveCS = isEBEpistatic ? expressedCS * 0.3 : expressedCS;

    // DN < 0.6 → SV 무시
    const isDNDominant = expressedDN < 0.6;
    const effectiveSV = isDNDominant ? 0 : expressedSV;

    // OP < 0.3 → CH 증폭 (투명할수록 색조 변화 큼)
    const isOPLow = expressedOP < 0.3;
    const effectiveCH = isOPLow ? expressedCH * 1.5 : expressedCH;

    // SB >= 0.9 → OV 제한
    const isSBHigh = expressedSB >= 0.9;
    const effectiveOV = isSBHigh ? expressedOV * 0.5 : expressedOV;

    // Step 5: Apply Modifier Genes (조절 유전자)
    // DN이 CS 발현 강도를 조절 (50% ~ 100%)
    const csModifier = 0.5 + expressedDN * 0.5;
    effectiveCS = effectiveCS * csModifier;

    // SB가 EB 효과를 증폭 (0.7x ~ 1.3x)
    const ebAmplifier = 1.0 + (expressedSB - 0.5) * 0.6;
    const amplifiedEB = expressedEB * ebAmplifier;

    // Step 6: Apply Pleiotropy (다면발현)
    const opEffects = {
        opacity: expressedOP,
        colorBrightness: expressedOP * 0.3,
        edgeSoftness: (1 - expressedOP) * 0.2,
    };

    const sbEffects = {
        spotSize: expressedSB,
        densityPenalty: expressedSB > 0.8 ? -0.1 : 0,
        blurBonus: expressedSB * 0.15,
    };

    // Step 7: Apply Polygenic Inheritance (다인성 유전)
    const finalOpacity = expressedOP * 0.70 + effectiveCS * 0.20 + expressedDN * 0.10;
    const finalSize = expressedSB * 0.60 + expressedOP * 0.20 + amplifiedEB * 0.20;
    const colorVibrancy = effectiveCS * 0.5 * amplifiedEB * 0.3 * expressedOP * 0.2;

    // Step 8: Apply Environmental Modifier (환경적 발현 변이)
    let envModifier = 1.0;
    if (koi) {
        const ageFactor = koi.growthStage === 'adult' ? 1.0 :
            koi.growthStage === 'juvenile' ? 0.85 : 0.7;
        const healthFactor = (koi.stamina ?? 100) / 100;
        envModifier = ageFactor * healthFactor;
    }

    // Step 9: Build base phenotype
    let phenotype: SpotPhenotype = {
        opacityBase: Math.max(0, Math.min(1, finalOpacity * envModifier)),
        opacityVariance: Math.max(0, Math.min(1, effectiveOV)),
        colorHue: Math.max(0, Math.min(1, effectiveCH)) % 1,
        colorSaturation: Math.max(0, Math.min(1, effectiveCS + colorVibrancy)),
        sizeBase: Math.max(0, Math.min(1, finalSize)),
        sizeVariance: Math.max(0, Math.min(1, effectiveSV)),
        edgeBlur: Math.max(0, Math.min(1, amplifiedEB + opEffects.edgeSoftness + sbEffects.blurBonus)),
        density: Math.max(0, Math.min(1, expressedDN + sbEffects.densityPenalty)),
        positionBiasX: Math.max(0, Math.min(1, expressedPX)),
        positionBiasY: Math.max(0, Math.min(1, expressedPY)),
    };

    // Step 10: Check and apply Threshold Traits (역치 형질)
    const activeTraits = checkThresholdTraits(afterInteractions);
    if (activeTraits.length > 0) {
        phenotype = applyThresholdEffects(phenotype, activeTraits);
        phenotype.activeTraits = activeTraits;
    }

    // Step 11: Apply Atavism (격세유전) - DISABLED for deterministic phenotype
    // Random ancestor selection would cause inconsistent results
    // if (koi?.genetics.generationalData?.ancestorTraits) { ... }

    // Step 12: Apply Stochastic Expression (확률적 발현) - final touch
    phenotype = applyStochasticExpression(phenotype);

    return phenotype;
};

/**
 * Create default spot phenotype genes (for migration of old data)
 * 기존 데이터 마이그레이션용 기본 유전자
 */
export const createDefaultSpotPhenotypeGenes = (): SpotPhenotypeGenes => ({
    OP: { allele1: { value: 0.8, origin: 'maternal' }, allele2: { value: 0.8, origin: 'paternal' }, dominanceType: DominanceType.INCOMPLETE },
    OV: { allele1: { value: 0.2, origin: 'maternal' }, allele2: { value: 0.2, origin: 'paternal' }, dominanceType: DominanceType.RECESSIVE },
    CH: { allele1: { value: 0.5, origin: 'maternal' }, allele2: { value: 0.5, origin: 'paternal' }, dominanceType: DominanceType.CODOMINANCE },
    CS: { allele1: { value: 0.7, origin: 'maternal' }, allele2: { value: 0.7, origin: 'paternal' }, dominanceType: DominanceType.COMPLETE },
    SB: { allele1: { value: 0.5, origin: 'maternal' }, allele2: { value: 0.5, origin: 'paternal' }, dominanceType: DominanceType.INCOMPLETE },
    SV: { allele1: { value: 0.3, origin: 'maternal' }, allele2: { value: 0.3, origin: 'paternal' }, dominanceType: DominanceType.RECESSIVE },
    EB: { allele1: { value: 0.3, origin: 'maternal' }, allele2: { value: 0.3, origin: 'paternal' }, dominanceType: DominanceType.COMPLETE },
    DN: { allele1: { value: 0.8, origin: 'maternal' }, allele2: { value: 0.8, origin: 'paternal' }, dominanceType: DominanceType.INCOMPLETE },
    PX: { allele1: { value: 0.5, origin: 'maternal' }, allele2: { value: 0.5, origin: 'paternal' }, dominanceType: DominanceType.CODOMINANCE },
    PY: { allele1: { value: 0.5, origin: 'maternal' }, allele2: { value: 0.5, origin: 'paternal' }, dominanceType: DominanceType.CODOMINANCE },
});

/**
 * Create random spot phenotype genes for new koi
 * 새 코이를 위한 랜덤 유전자 생성
 */
export const createRandomSpotPhenotypeGenes = (): SpotPhenotypeGenes => {
    const createRandomAllele = (origin: 'maternal' | 'paternal'): Allele => ({
        value: Math.random(),
        origin,
    });

    const createGeneAlleles = (geneId: keyof SpotPhenotypeGenes): GeneAlleles => ({
        allele1: createRandomAllele('maternal'),
        allele2: createRandomAllele('paternal'),
        dominanceType: GENE_DOMINANCE_CONFIG[geneId],
    });

    return {
        OP: createGeneAlleles('OP'),
        OV: createGeneAlleles('OV'),
        CH: createGeneAlleles('CH'),
        CS: createGeneAlleles('CS'),
        SB: createGeneAlleles('SB'),
        SV: createGeneAlleles('SV'),
        EB: createGeneAlleles('EB'),
        DN: createGeneAlleles('DN'),
        PX: createGeneAlleles('PX'),
        PY: createGeneAlleles('PY'),
    };
};

// Helper: Get linkage partner gene
const getLinkagePartner = (geneId: string): string | null => {
    for (const group of LINKAGE_GROUPS) {
        if (group.genes.includes(geneId as keyof SpotPhenotypeGenes)) {
            return group.genes.find(g => g !== geneId) || null;
        }
    }
    return null;
};

// Helper: Get linkage strength between two genes
const getLinkageStrength = (gene1: string, gene2: string): number => {
    for (const group of LINKAGE_GROUPS) {
        if (group.genes.includes(gene1 as keyof SpotPhenotypeGenes) &&
            group.genes.includes(gene2 as keyof SpotPhenotypeGenes)) {
            return group.linkageStrength;
        }
    }
    return 0;
};

// Helper: Apply mutation to an allele
const applyMutation = (allele: Allele, config: MutationConfig): Allele => {
    if (Math.random() > config.rate) return allele;

    let newValue = allele.value;

    switch (config.type) {
        case 'point':
            // 작은 변화
            newValue += (Math.random() - 0.5) * 2 * config.magnitude;
            break;
        case 'deletion':
            // 값 감소
            newValue *= (1 - config.magnitude);
            break;
        case 'duplication':
            // 값 증가
            newValue *= (1 + config.magnitude);
            break;
        case 'inversion':
            // 값 반전
            newValue = 1 - newValue;
            break;
    }

    return { value: Math.max(0, Math.min(1, newValue)), origin: allele.origin };
};

// Helper: Apply genetic drift
const applyDrift = (allele: Allele): Allele => {
    const drift = (Math.random() - 0.5) * 2 * DRIFT_RATE;
    return {
        value: Math.max(0, Math.min(1, allele.value + drift)),
        origin: allele.origin
    };
};

/**
 * Perform meiosis simulation to create a gamete
 * 감수분열 시뮬레이션 - 한 부모에서 배우자(gamete) 생성
 */
const performMeiosis = (parentGenes: SpotPhenotypeGenes): Record<keyof SpotPhenotypeGenes, Allele> => {
    const gamete = {} as Record<keyof SpotPhenotypeGenes, Allele>;
    const geneIds = Object.keys(parentGenes) as (keyof SpotPhenotypeGenes)[];

    for (const geneId of geneIds) {
        const alleles = parentGenes[geneId];

        // 연관 유전 확인
        const linkedGene = getLinkagePartner(geneId);

        if (linkedGene && gamete[linkedGene as keyof SpotPhenotypeGenes]) {
            // 연관된 유전자가 이미 선택됨 → 연관 확률 적용
            const linkageStrength = getLinkageStrength(geneId, linkedGene);
            if (Math.random() < linkageStrength) {
                // 같은 origin의 allele 선택
                const linkedOrigin = gamete[linkedGene as keyof SpotPhenotypeGenes].origin;
                gamete[geneId] = linkedOrigin === 'maternal' ? { ...alleles.allele1 } : { ...alleles.allele2 };
                continue;
            }
        }

        // 독립적 분리: 50% 확률로 allele1 또는 allele2 선택
        gamete[geneId] = Math.random() < 0.5 ? { ...alleles.allele1 } : { ...alleles.allele2 };
    }

    return gamete;
};

/**
 * Apply crossing over to a gamete
 * 교차 적용 - 연관 그룹 내 유전자들의 origin 교환
 */
const applyCrossover = (gamete: Record<keyof SpotPhenotypeGenes, Allele>): Record<keyof SpotPhenotypeGenes, Allele> => {
    const result = { ...gamete };

    for (const linkageGroup of LINKAGE_GROUPS) {
        if (Math.random() < CROSSOVER_RATE) {
            // 교차 발생: 연관 그룹 내 유전자들의 origin 교환
            const [gene1, gene2] = linkageGroup.genes;
            if (result[gene1] && result[gene2]) {
                // Swap origins
                const temp = result[gene1].origin;
                result[gene1] = { ...result[gene1], origin: result[gene2].origin };
                result[gene2] = { ...result[gene2], origin: temp };
            }
        }
    }

    return result;
};

/**
 * Calculate inbreeding coefficient between two parents
 * 근친 계수 계산
 */
export const calculateInbreedingCoefficient = (genes1: SpotPhenotypeGenes, genes2: SpotPhenotypeGenes): number => {
    let similarity = 0;
    const geneIds = Object.keys(genes1) as (keyof SpotPhenotypeGenes)[];

    for (const geneId of geneIds) {
        const expr1 = expressGene(genes1[geneId]);
        const expr2 = expressGene(genes2[geneId]);
        const diff = Math.abs(expr1 - expr2);
        similarity += (1 - diff);
    }

    return similarity / geneIds.length; // 0.0 ~ 1.0
};

/**
 * Apply inbreeding penalty to offspring genes
 * 근친 교배 페널티 적용
 */
const applyInbreedingPenalty = (geneAlleles: GeneAlleles, coefficient: number): GeneAlleles => {
    // 높은 근친 계수일수록 변이 폭 증가, 극단값으로 이동
    if (coefficient > 0.7) {
        const penalty = (coefficient - 0.7) * 2; // 0 ~ 0.6
        // 유해 돌연변이 확률 증가
        if (Math.random() < penalty) {
            return {
                ...geneAlleles,
                allele1: { ...geneAlleles.allele1, value: geneAlleles.allele1.value * (1 - penalty * 0.3) },
            };
        }
    }
    return geneAlleles;
};

/**
 * Breed spot phenotype genes from two parents
 * 두 부모로부터 점 표현형 유전자 번식
 */
export const breedSpotPhenotypeGenes = (
    parent1Genes: SpotPhenotypeGenes,
    parent2Genes: SpotPhenotypeGenes
): SpotPhenotypeGenes => {
    // Step 1: Create gametes from each parent (Meiosis)
    let gamete1 = performMeiosis(parent1Genes);
    let gamete2 = performMeiosis(parent2Genes);

    // Step 2: Apply crossing over
    gamete1 = applyCrossover(gamete1);
    gamete2 = applyCrossover(gamete2);

    // Step 3: Calculate inbreeding coefficient
    const inbreedingCoeff = calculateInbreedingCoefficient(parent1Genes, parent2Genes);

    // Step 4: Combine gametes to form offspring genes
    const geneIds = Object.keys(parent1Genes) as (keyof SpotPhenotypeGenes)[];
    const offspringGenes = {} as SpotPhenotypeGenes;

    for (const geneId of geneIds) {
        // Get alleles from gametes
        let allele1 = gamete1[geneId];
        let allele2 = gamete2[geneId];

        // Step 5: Apply mutations
        allele1 = applyMutation(allele1, MUTATION_CONFIGS[geneId]);
        allele2 = applyMutation(allele2, MUTATION_CONFIGS[geneId]);

        // Step 6: Apply genetic drift
        allele1 = applyDrift(allele1);
        allele2 = applyDrift(allele2);

        // Ensure correct origin labels for offspring
        allele1 = { ...allele1, origin: 'maternal' };
        allele2 = { ...allele2, origin: 'paternal' };

        let geneAlleles: GeneAlleles = {
            allele1,
            allele2,
            dominanceType: GENE_DOMINANCE_CONFIG[geneId],
        };

        // Step 7: Apply inbreeding penalty
        geneAlleles = applyInbreedingPenalty(geneAlleles, inbreedingCoeff);

        offspringGenes[geneId] = geneAlleles;
    }

    return offspringGenes;
};
