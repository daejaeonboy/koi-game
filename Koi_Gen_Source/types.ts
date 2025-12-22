
export enum GeneType {
  BLACK = '검정',
  RED = '빨강', // Represents the 'standard' color gene
  YELLOW = '노랑',
  WHITE = '하양',
  ORANGE = '주황',
  CREAM = '크림',
}

export enum GrowthStage {
  FRY = 'fry',
  JUVENILE = 'juvenile',
  ADULT = 'adult',
}

export enum SpotShape {
  CIRCLE = 'circle',
  HEXAGON = 'hexagon',
  POLYGON = 'polygon', // Renamed from BLOTCH
  OVAL_H = 'oval_h', // Horizontal Oval
  OVAL_V = 'oval_v', // Vertical Oval
}

export interface Spot {
  x: number; // 0-100%
  y: number; // 0-100%
  size: number; // percentage of body width
  color: GeneType; // Each spot has its own color
  shape: SpotShape;
}

export interface KoiGenetics {
  baseColorGenes: GeneType[]; // Changed to array for unlimited polygenic system
  spots: Spot[];
  lightness: number; // For standard color variation (0-100), represents HSL lightness. 50 is standard red.
  isTransparent: boolean; // New trait: Transparency modifier
}

export interface Koi {
  id: string;
  name: string;
  description: string;
  genetics: KoiGenetics;
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  age: number; // 0 to 100+
  size: number;
  growthStage: 'fry' | 'juvenile' | 'adult';
  timesFed: number;
  foodTargetId: number | null;
  feedCooldownUntil: number | null;
  stamina?: number; // 0-100
  sickTimestamp?: number | null; // Timestamp when sickness started
}

export enum DecorationType {
  LILY_PAD = '연꽃잎',
  ROCK = '바위',
  LANTERN = '등불',
  DUCKWEED = '개구리밥',
}

export interface Decoration {
  id: string;
  type: DecorationType;
  position: { x: number; y: number };
  scale: number;
  rotation: number;
  velocity?: { x: number; y: number }; // For moving decorations
  leafCount?: number; // For plant clusters
}

export enum PondTheme {
  DEFAULT = '기본 (맑은 물)',
  MUD = '진흙 바닥',
  MOSS = '이끼 낀 연못',
}

export interface PondData {
  id: string;
  name: string;
  kois: Koi[];
  decorations: Decoration[];
  theme: PondTheme;
  waterQuality: number; // 0-100
}

export interface SavedGameState {
  ponds: Ponds;
  activePondId: string;
  zenPoints: number;
  foodCount: number;
  cornCount?: number; // Premium food
  medicineCount?: number; // New item
  koiNameCounter: number;
  timestamp?: number; // Added for display
}

export type Ponds = Record<string, PondData>;
