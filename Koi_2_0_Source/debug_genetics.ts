
import { GeneType } from './types';
import { breedKoi, getPhenotype } from './utils/genetics';

console.log('--- GeneType Checks ---');
console.log('Black:', GeneType.BLACK);
console.log('Cream:', GeneType.CREAM);

console.log('\n--- Breeding Simulation ---');
// Simulate Cream (Hidden Black) x Cream (Hidden Black)
// Parent 1: [Cream, Black] -> Phenotype Cream (Current logic)
// Parent 2: [Cream, Black] -> Phenotype Cream

const parentGenes = [GeneType.CREAM, GeneType.BLACK];
const phenotype = getPhenotype(parentGenes);
console.log('Parent Phenotype (Cream, Black):', phenotype);

// Simulate Breeding multiple times to find Black offspring
let blackCount = 0;
let undefinedCount = 0;

for (let i = 0; i < 20; i++) {
    const parent1 = { baseColorGenes: [...parentGenes], spots: [], lightness: 50, isTransparent: false };
    const parent2 = { baseColorGenes: [...parentGenes], spots: [], lightness: 50, isTransparent: false };

    const result = breedKoi(parent1 as any, parent2 as any);
    const genes = result.genetics.baseColorGenes;
    const childPhenotype = getPhenotype(genes);

    if (childPhenotype === GeneType.BLACK) {
        blackCount++;
        console.log(`Breed ${i}: Black Offspring! Genes:`, genes);
        if (!genes[0] || !genes[1]) {
            console.error('ERROR: Undefined gene detected!');
            undefinedCount++;
        }
    }
}

console.log(`\nResults: ${blackCount} Black fish found.`);
if (undefinedCount > 0) console.error(`Found ${undefinedCount} fish with undefined genes.`);
