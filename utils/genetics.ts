
import { KoiGenetics, GeneType, Spot, Koi, GrowthStage } from '../types';

const ALL_SPOT_COLORS = Object.values(GeneType).filter(c => c !== GeneType.RED && c !== GeneType.ALBINO && c !== GeneType.PLATINUM);

export const GENE_COLOR_MAP: Record<GeneType, string> = {
  [GeneType.BROWN]: '#A56A2A',
  [GeneType.BLACK]: '#111827',
  [GeneType.RED]: '#E53E3E',
  [GeneType.BLUE]: '#4299E1',
  [GeneType.YELLOW]: '#F6E05E',
  [GeneType.WHITE]: '#F7FAFC',
  [GeneType.ORANGE]: '#ED8936',
  [GeneType.CREAM]: '#FEFDE7',
  [GeneType.ALBINO]: '#FFFAFA',
  [GeneType.PLATINUM]: '#E5E7EB',
};

export const GENE_RARITY: Record<GeneType, number> = {
  [GeneType.BROWN]: 1,
  [GeneType.BLACK]: 1,
  [GeneType.WHITE]: 2,
  [GeneType.YELLOW]: 3,
  [GeneType.ORANGE]: 3,
  [GeneType.RED]: 4,
  [GeneType.CREAM]: 6,
  [GeneType.BLUE]: 8,
  [GeneType.ALBINO]: 20,
  [GeneType.PLATINUM]: 40,
};

// Determines the expressed phenotype for recessive genes
export const getPhenotype = (genes: [GeneType, GeneType]): GeneType => {
    const [g1, g2] = genes;
    // Any gene that is not a special recessive morph is considered 'standard' and dominant.
    const isStandard = (g: GeneType) => g !== GeneType.ALBINO && g !== GeneType.PLATINUM;

    if (isStandard(g1)) return g1;
    if (isStandard(g2)) return g2;
    // If we reach here, both genes are recessive. Platinum is dominant over Albino.
    if (g1 === GeneType.PLATINUM || g2 === GeneType.PLATINUM) return GeneType.PLATINUM;
    return GeneType.ALBINO; // Both are Albino
}

export const calculateKoiValue = (koi: Koi): number => {
    let value = 0;
    const { genetics, growthStage } = koi;
    
    // 1. Value from recessive genes (phenotype and carrier)
    const phenotype = getPhenotype(genetics.baseColorGenes);
    value += (GENE_RARITY[phenotype] || 1) * 20;
    value += (GENE_RARITY[genetics.baseColorGenes[0]] || 1);
    value += (GENE_RARITY[genetics.baseColorGenes[1]] || 1);
    
    // 2. Value from lightness (the further from standard 50, the better)
    const lightnessDifference = Math.abs(genetics.lightness - 50);
    value += Math.pow(lightnessDifference, 2) * 0.5; // Exponential bonus for rare lightness

    // 3. Value from spots
    const spotValue = genetics.spots.length * 5;
    const spotBonus = Math.pow(genetics.spots.length, 1.5) * 2;
    value += spotValue + spotBonus;

    const spotColorValue = genetics.spots.reduce((sum, spot) => sum + (GENE_RARITY[spot.color] || 1), 0);
    value += spotColorValue * 3;
    
    // 4. Multiplier for growth stage
    if (growthStage === GrowthStage.ADULT) {
        value *= 2;
    }
    
    if (growthStage === GrowthStage.PERFECT) {
        value *= 4;
    }

    return Math.round(value);
};

const getRandomTraitWithRarity = <T extends string | number | symbol>(allTraits: T[], rarityMap: Record<T, number>): T => {
    const weights = allTraits.map(trait => 1 / rarityMap[trait]);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    for (let i = 0; i < allTraits.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return allTraits[i];
        }
    }
    return allTraits[0]; 
};


const SPOT_COLOR_MUTATION_CHANCE = 0.01;
const SIZE_MUTATION_AMOUNT = 4; 
const LIGHTNESS_MUTATION_CHANCE = 0.2; // 20% chance for lightness to mutate
const LIGHTNESS_MUTATION_AMOUNT = 5; // Mutates by up to +/- 5 lightness points

const createNewRandomSpot = (): Spot => ({
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 20 + 10, 
    color: getRandomTraitWithRarity(ALL_SPOT_COLORS, GENE_RARITY),
});

export const breedKoi = (genetics1: KoiGenetics, genetics2: KoiGenetics): KoiGenetics => {
  
  // 1. Breed base color genes (for recessive morphs)
  const childGene1 = genetics1.baseColorGenes[Math.floor(Math.random() * 2)];
  const childGene2 = genetics2.baseColorGenes[Math.floor(Math.random() * 2)];

  // 2. Breed lightness for standard color
  const avgLightness = (genetics1.lightness + genetics2.lightness) / 2;
  let childLightness = avgLightness;
  if (Math.random() < LIGHTNESS_MUTATION_CHANCE) {
      const mutation = (Math.random() - 0.5) * 2 * LIGHTNESS_MUTATION_AMOUNT; // from -5 to +5
      childLightness += mutation;
  }
  // Clamp lightness to be within a visible range (e.g., 5% to 95%)
  childLightness = Math.max(5, Math.min(95, childLightness));

  // 3. Breed spots
  const parent1Spots = genetics1.spots;
  const parent2Spots = genetics2.spots;
  const combinedSpots = [...parent1Spots, ...parent2Spots];
  const avgSpots = (parent1Spots.length + parent2Spots.length) / 2;
  let targetSpotsCount = Math.max(0, Math.round(avgSpots + (Math.random() - 0.5) * 2));
  
  const childSpots: Spot[] = [];
  if (combinedSpots.length > 0) {
      const shuffled = combinedSpots.sort(() => 0.5 - Math.random());
      const inheritedSpots = shuffled.slice(0, targetSpotsCount);

      for (const spot of inheritedSpots) {
          let newColor = spot.color;
          if (Math.random() < SPOT_COLOR_MUTATION_CHANCE) {
              newColor = getRandomTraitWithRarity(ALL_SPOT_COLORS, GENE_RARITY);
          }
          childSpots.push({
              x: Math.random() * 100,
              y: Math.random() * 100,
              size: Math.max(10, Math.min(30, spot.size + (Math.random() - 0.5) * SIZE_MUTATION_AMOUNT * 2)),
              color: newColor,
          });
      }
  }

  while (childSpots.length < targetSpotsCount) {
      childSpots.push(createNewRandomSpot());
  }

  return {
    baseColorGenes: [childGene1, childGene2],
    spots: childSpots,
    lightness: childLightness,
  };
};

export const createRandomGenetics = (): KoiGenetics => {
    return {
        baseColorGenes: [GeneType.RED, GeneType.RED],
        spots: [],
        lightness: 50,
    };
}
