
// Mocking the environment to avoid import errors in ts-node
enum GeneType {
    BROWN = '갈색',
    BLACK = '검정',
    RED = '빨강',
    BLUE = '파랑',
    YELLOW = '노랑',
    WHITE = '하양',
    ORANGE = '주황',
    CREAM = '크림',
    ALBINO = '알비노',
    PLATINUM = '플래티넘',
    GOLD = '황금',
}

// Manually verify logic since imports failed
console.log('--- Verifying Logic ---');
console.log('Target: Strict Dominance');

const DOMINANCE_ORDER = [
    GeneType.BLACK,
    GeneType.RED,
    GeneType.BLUE,
    GeneType.ORANGE,
    GeneType.GOLD,
    GeneType.PLATINUM,
    GeneType.YELLOW,
    GeneType.CREAM,
    GeneType.WHITE,
    GeneType.ALBINO,
    GeneType.BROWN
];

function getPhenotype(genes: GeneType[]): GeneType {
    if (!genes || genes.length === 0) return GeneType.CREAM;
    const validGenes = genes.filter(g => g);
    if (validGenes.length === 0) return GeneType.CREAM;

    let bestGene = validGenes[0];
    let bestRank = 999;

    validGenes.forEach(gene => {
        const rank = DOMINANCE_ORDER.indexOf(gene);
        const effectiveRank = rank === -1 ? 999 : rank;
        if (effectiveRank < bestRank) {
            bestRank = effectiveRank;
            bestGene = gene;
        }
    });
    return bestGene;
}

// Test Cases
const test1 = [GeneType.CREAM, GeneType.BLACK];
const result1 = getPhenotype(test1);
console.log(`[Cream, Black] -> Expected: Black, Got: ${result1}`);

const test2 = [GeneType.CREAM, GeneType.CREAM];
const result2 = getPhenotype(test2);
console.log(`[Cream, Cream] -> Expected: Cream, Got: ${result2}`);

const test3 = [GeneType.WHITE, GeneType.RED, GeneType.CREAM];
const result3 = getPhenotype(test3);
console.log(`[White, Red, Cream] -> Expected: Red, Got: ${result3}`);

const test4 = [undefined as any, GeneType.CREAM];
const result4 = getPhenotype(test4);
console.log(`[undefined, Cream] -> Expected: Cream, Got: ${result4}`);

if (result1 !== GeneType.BLACK) console.error('FAIL: Black should dominate Cream');
if (result2 !== GeneType.CREAM) console.error('FAIL: Cream x Cream should be Cream');
if (result3 !== GeneType.RED) console.error('FAIL: Red should dominate White/Cream');
if (result4 !== GeneType.CREAM) console.error('FAIL: Should handle undefined');

console.log('Verification Complete.');
