
import { breedKoi, getPhenotype, createRandomGenetics, GENE_RARITY } from './utils/genetics';
import { GeneType, KoiGenetics } from './types';

// Mock dependencies if needed, or just import generic logic.
// Since genetics.ts has imports from '../types', I assume I can run this via ts-node if I setup paths correctly.

// Helper to print gene counts
function testBreeding() {
    console.log("Starting Breeding Simulation...");

    // Scenario 1: Pure Cream Parents (Basic)
    // Assuming createRandomGenetics gives White/White... let's manually make Cream/Cream
    const parentA: KoiGenetics = {
        baseColorGenes: [GeneType.CREAM, GeneType.CREAM],
        spots: [],
        lightness: 50,
        saturation: 50
    };
    const parentB: KoiGenetics = {
        baseColorGenes: [GeneType.CREAM, GeneType.CREAM],
        spots: [],
        lightness: 50,
        saturation: 50
    };

    let blackCount = 0;
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
        const result = breedKoi(parentA, parentB);
        const phenotype = getPhenotype(result.genetics.baseColorGenes);
        if (phenotype === GeneType.BLACK) {
            blackCount++;
        }
    }
    console.log(`Scenario 1 (Pure Cream): Produced ${blackCount} Black fish out of ${trials}`);

    // Scenario 2: Carrier Parents (Cream with hidden Black)
    // [Cream, Cream, Black] - Phenotype should be Cream (since Cream count 2, Black 1)
    // Wait, getPhenotype checks count >= 2.
    // If [Cream, Cream, Black], Cream has 2, Black has 1. Candidates: Cream. Phenotype: Cream.
    const carrierA: KoiGenetics = {
        baseColorGenes: [GeneType.CREAM, GeneType.CREAM, GeneType.BLACK],
        spots: [],
        lightness: 50,
        saturation: 50
    };
    const carrierB: KoiGenetics = {
        baseColorGenes: [GeneType.CREAM, GeneType.CREAM, GeneType.BLACK], // Homozygous-ish for Cream, heterozygous for Black?
        spots: [],
        lightness: 50,
        saturation: 50
    };

    let blackCarrierCount = 0;
    for (let i = 0; i < trials; i++) {
        const result = breedKoi(carrierA, carrierB);
        const phenotype = getPhenotype(result.genetics.baseColorGenes);
        // Debug first accumulation
        if (i === 0) {
            console.log("Sample Child Genes:", result.genetics.baseColorGenes);
            console.log("Sample Child Phenotype:", phenotype);
        }
        if (phenotype === GeneType.BLACK) {
            blackCarrierCount++;
        }
    }
    console.log(`Scenario 2 (Carriers): Produced ${blackCarrierCount} Black fish out of ${trials}`);

}

testBreeding();
