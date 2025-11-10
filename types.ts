
export enum GeneType {
  BROWN = '갈색',
  BLACK = '검정',
  RED = '빨강', // Represents the 'standard' color gene
  BLUE = '파랑',
  YELLOW = '노랑',
  WHITE = '하양',
  ORANGE = '주황',
  CREAM = '크림',
  ALBINO = '알비노', // Recessive gene
  PLATINUM = '플래티넘', // Recessive gene
}

export enum GrowthStage {
  JUVENILE = '치어',
  ADULT = '성체',
  PERFECT = '완성체',
}

export interface Spot {
  x: number; // 0-100%
  y: number; // 0-100%
  size: number; // percentage of body width
  color: GeneType; // Each spot has its own color
}

export interface KoiGenetics {
  baseColorGenes: [GeneType, GeneType]; // For special morphs like Albino, Platinum
  spots: Spot[];
  lightness: number; // For standard color variation (0-100), represents HSL lightness. 50 is standard red.
}

export interface Koi {
  id: string;
  name: string;
  description: string;
  genetics: KoiGenetics;
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  size: number;
  growthStage: GrowthStage;
  timesFed: number;
  foodTargetId: number | null;
  feedCooldownUntil: number | null;
}

export interface PondData {
  id: string;
  name: string;
  kois: Koi[];
}

export type Ponds = Record<string, PondData>;
