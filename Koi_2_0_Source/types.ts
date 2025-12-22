
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

// ============================================
// Spot Phenotype Genetics System (10-Gene)
// ============================================

// 우성 유형
export enum DominanceType {
  COMPLETE = 'complete',           // 완전 우성
  INCOMPLETE = 'incomplete',       // 불완전 우성
  RECESSIVE = 'recessive',         // 열성
  CODOMINANCE = 'codominance',     // 공우성
}

// 대립유전자
export interface Allele {
  value: number;                   // 0.0 ~ 1.0
  origin: 'maternal' | 'paternal';
}

// 유전자 쌍
export interface GeneAlleles {
  allele1: Allele;
  allele2: Allele;
  dominanceType: DominanceType;
}

// 10개 유전자 시스템
export interface SpotPhenotypeGenes {
  OP: GeneAlleles;  // Opacity Base - 투명도 기본
  OV: GeneAlleles;  // Opacity Variance - 투명도 변이
  CH: GeneAlleles;  // Color Hue - 색상 색조
  CS: GeneAlleles;  // Color Saturation - 색상 채도
  SB: GeneAlleles;  // Size Base - 크기 기본
  SV: GeneAlleles;  // Size Variance - 크기 변이
  EB: GeneAlleles;  // Edge Blur - 가장자리 흐림
  DN: GeneAlleles;  // Density - 밀도 조절
  PX: GeneAlleles;  // Position Bias X - 위치 편향 X
  PY: GeneAlleles;  // Position Bias Y - 위치 편향 Y
}

// 표현형 (발현된 값)
export interface SpotPhenotype {
  opacityBase: number;      // 0.0 ~ 1.0
  opacityVariance: number;  // 0.0 ~ 1.0
  colorHue: number;         // 0.0 ~ 1.0 (→ 0° ~ 360° offset)
  colorSaturation: number;  // 0.0 ~ 1.0
  sizeBase: number;         // 0.0 ~ 1.0 (→ 0.5x ~ 2.0x)
  sizeVariance: number;     // 0.0 ~ 1.0
  edgeBlur: number;         // 0.0 ~ 1.0
  density: number;          // 0.0 ~ 1.0 (→ 50% ~ 100%)
  positionBiasX: number;    // 0.0 ~ 1.0 (→ -0.5 ~ 0.5)
  positionBiasY: number;    // 0.0 ~ 1.0 (→ -0.5 ~ 0.5)
  // NEW: Active threshold traits (역치 형질)
  activeTraits?: string[];  // e.g., ['golden_sheen', 'ghost_pattern']
}

// ============================================
// Complex Breeding System Types (추가 복잡성)
// ============================================

// 숨은 조절 인자 (Hidden Modifier)
export interface HiddenModifier {
  activationThreshold: number;  // 활성화 역치 (0.0 ~ 1.0)
  targetGenes: (keyof SpotPhenotypeGenes)[];  // 영향받는 유전자들
  effect: number;  // 배율 효과
}

// 확장된 대립유전자 (세대 추적 + 숨은 조절자)
export interface AlleleExtended extends Allele {
  hiddenModifier?: HiddenModifier;  // 잠재 조절 인자
  generation?: number;              // 세대 추적 (0 = 현재, 1 = 부모, 2 = 조부모...)
}

// 세대 기억 데이터 (격세유전용)
export interface GenerationalData {
  generation: number;  // 현재 세대 번호
  ancestorTraits?: {
    grandparent1?: Partial<SpotPhenotype>;  // 조부모1 형질
    grandparent2?: Partial<SpotPhenotype>;  // 조부모2 형질
  };
}

// 역치 형질 정의
export interface ThresholdTrait {
  id: string;           // 고유 ID (e.g., 'golden_sheen')
  name: string;         // 표시 이름
  requirements: Partial<Record<keyof SpotPhenotypeGenes, number>>;  // 필요 조건
  description: string;  // 설명
}

// 유전자 상호작용 타입
export type GeneInteractionType = 'synergy' | 'antagonism' | 'neutral';

// 유전자 상호작용 정의
export interface GeneInteraction {
  partner: keyof SpotPhenotypeGenes;
  type: GeneInteractionType;
  strength: number;  // 0.0 ~ 1.0
}

// ============================================

export interface KoiGenetics {
  baseColorGenes: GeneType[]; // Changed to array for unlimited polygenic system
  spots: Spot[];
  lightness: number; // For standard color variation (0-100), represents HSL lightness. 50 is standard red.
  isTransparent: boolean; // New trait: Transparency modifier
  spotPhenotypeGenes?: SpotPhenotypeGenes; // Optional for backward compatibility
  generationalData?: GenerationalData; // NEW: 세대 기억 (격세유전용)
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
  NIGHT = '밤 연못',
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

// ============================================
// Marketplace Types
// ============================================

export interface MarketplaceListing {
  id: string; // Document ID
  sellerId: string;
  sellerNickname: string; // For display
  koiData: Koi; // Full koi data
  startPrice: number; // 시작가 (AP)
  buyNowPrice?: number; // 즉시 구매가 (AP) - 없으면 즉시 구매 불가
  currentBid: number; // 현재 최고 입찰가 (AP)
  currentBidderId?: string | null; // 현재 최고 입찰자
  currentBidderNickname?: string | null; // 현재 최고 입찰자 닉네임
  bidCount?: number; // 총 입찰 수
  createdAt: number; // Timestamp
  expiresAt: number; // Timestamp
  status: 'active' | 'sold' | 'expired' | 'cancelled';
}

export interface MarketplaceBid {
  id: string;
  listingId: string;
  bidderId: string;
  bidderNickname: string;
  amount: number;
  timestamp: number;
}
