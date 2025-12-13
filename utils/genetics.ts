
import { KoiGenetics, GeneType, Spot, Koi, GrowthStage, SpotShape } from '../types';

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

    // User Request: All shapes max 80
    let maxSize = 80;

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

    // 3. Breed spots (Dominant Inheritance)
    // If spots are dominant, the offspring should tend to have spots if either parent has them.
    const parent1Spots = genetics1.spots;
    const parent2Spots = genetics2.spots;
    const combinedSpots = [...parent1Spots, ...parent2Spots];

    // Dominant logic: Bias towards the parent with more spots
    const maxSpots = Math.max(parent1Spots.length, parent2Spots.length);
    const minSpots = Math.min(parent1Spots.length, parent2Spots.length);

    let targetSpotsCount = 0;

    if (maxSpots === 0) {
        // Both parents have no spots.
        // 0 -> 1 spot: 20% chance (Tier 1: < 5)
        if (Math.random() < 0.20) {
            targetSpotsCount = 1;
        }
    } else {
        // Inheritance Logic
        // 75% chance to inherit close to max spots (Dominant), 25% chance to blend
        let baseCount = maxSpots;
        if (Math.random() < 0.25) {
            baseCount = Math.floor((maxSpots + minSpots) / 2);
        }

        targetSpotsCount = baseCount;

        // Growth Mutation: Chance to add 1 spot based on current count
        let growthChance = 0;
        if (baseCount < 5) {
            growthChance = 0.20; // 1~5 (and 0): 20%
        } else if (baseCount < 8) {
            growthChance = 0.10; // 5~8: 10%
        } else if (baseCount < 10) {
            growthChance = 0.05; // 8~10: 5%
        } else {
            growthChance = 0.01; // 10+: 1%
        }

        if (Math.random() < growthChance) {
            targetSpotsCount += 1;
        }

        // Small chance to decrease (Regression) - optional but keeps balance
        // Let's rely on the average blend (25% chance) to reduce counts naturally.
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
                size: Math.max(20, Math.min(80, spot.size + (Math.random() - 0.5) * SIZE_MUTATION_AMOUNT * 2)),
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

    return {
        genetics: {
            baseColorGenes: childGenes,
            spots: childSpots,
            lightness: childLightness,
            isTransparent: childIsTransparent,
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
