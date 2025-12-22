/**
 * 온라인 시스템 관련 타입 정의
 * Firestore 데이터베이스 구조와 일치
 */

import { Koi, PondTheme } from '../types';

// ============================================
// Firestore Timestamp 타입 (Firebase SDK)
// ============================================
import { Timestamp } from 'firebase/firestore';

// ============================================
// 1. 사용자 정보 (users/{userId})
// ============================================

/** 사용자 프로필 */
export interface UserProfile {
    nickname: string;
    createdAt: Timestamp;
    lastLogin: Timestamp;
}

/** 사용자 게임 데이터 (온라인 저장용) */
export interface UserGameData {
    money: number;           // ZP (인게임 재화)
    food: number;
    corn: number;
    medicine: number;
    theme: PondTheme;
    pondCapacity: number;
    honorPoints?: number;
}

/** 장터용 잉어 미리보기 정보 */
export interface KoiPreview {
    id: string;
    name: string;
    baseColors: string[];    // 주요 색상들
    age: number;
    hasRareTraits: boolean;  // 희귀 형질 보유 여부
}

/** 온라인 저장용 잉어 데이터 (Koi 타입에서 런타임 정보 제외) */
export interface SerializedKoi {
    id: string;
    name: string;
    description: string;
    genetics: Koi['genetics'];
    age: number;
    growthStage: 'fry' | 'juvenile' | 'adult';
    timesFed: number;
    stamina?: number;
}

/** Firestore users/{userId} 문서 전체 구조 */
export interface FirestoreUserDocument {
    uid?: string;            // 문서 ID (식별용)
    profile: UserProfile;
    gameData: UserGameData;
    ap: number;              // 광고 포인트
    kois: SerializedKoi[];   // 잉어 배열
}

// ============================================
// 2. 세션 관리 (sessions/{userId})
// ============================================

/** 세션 정보 (동시접속 방지용) */
export interface SessionData {
    deviceId: string;
    lastActive: Timestamp;
    isOnline: boolean;
}

// ============================================
// 3. 장터 - 경매 목록 (marketplace/listings/{listingId})
// ============================================

/** 경매 상태 */
export type ListingStatus = 'active' | 'sold' | 'expired' | 'cancelled';

/** 경매 목록 아이템 */
export interface MarketplaceListing {
    id?: string;              // Firestore 문서 ID (클라이언트에서 사용)
    sellerId: string;
    sellerNickname: string;
    koiData: SerializedKoi;   // 잉어 전체 정보
    koiPreview: KoiPreview | string;   // 미리보기용 요약 정보 (또는 이름)
    startPrice: number;       // 시작가 (AP)
    buyNowPrice: number | null;      // 즉시구매가 (AP)
    currentBid: number;       // 현재 최고 입찰가
    currentBidderId: string | null;  // 현재 최고 입찰자
    currentBidderNickname: string | null;
    bidCount: number;         // 입찰 횟수
    createdAt: Timestamp;
    expiresAt: Timestamp;     // 경매 종료 시간
    status: ListingStatus;
}

// ============================================
// 4. 입찰 내역 (marketplace/listings/{listingId}/bids/{bidId})
// ============================================

/** 입찰 정보 */
export interface Bid {
    id?: string;              // Firestore 문서 ID
    bidderId: string;
    bidderNickname: string;
    amount: number;           // 입찰 금액 (AP)
    timestamp: Timestamp;
}

// ============================================
// 5. 거래 내역 (transactions/{transactionId})
// ============================================

/** 거래 유형 */
export type TransactionType = 'purchase' | 'bid_win' | 'ad_reward' | 'listing_sale';

/** 거래 기록 */
export interface Transaction {
    id?: string;              // Firestore 문서 ID
    type: TransactionType;
    userId: string;
    amount: number;           // AP 변동량 (+/-)
    fee?: number;             // 수수료 (5%)
    listingId?: string;       // 관련 경매 ID
    description?: string;     // 거래 설명
    timestamp: Timestamp;
}

// ============================================
// 프론트엔드 상태 타입
// ============================================

/** 온라인/오프라인 모드 */
export type GameMode = 'offline' | 'online';

/** 인증 상태 */
export interface AuthState {
    isAuthenticated: boolean;
    userId: string | null;
    displayName: string | null;
    photoURL: string | null;
    isLoading: boolean;
}

/** 온라인 상태 */
export interface OnlineState {
    mode: GameMode;
    isConnected: boolean;
    isSyncing: boolean;
    lastSyncTime: Date | null;
    sessionConflict: boolean;
}

// ============================================
// 장터 필터/정렬 옵션
// ============================================

/** 장터 정렬 옵션 */
export type MarketplaceSortOption =
    | 'newest'        // 최신순
    | 'ending_soon'   // 종료 임박
    | 'price_low'     // 가격 낮은순
    | 'price_high'    // 가격 높은순
    | 'bid_count';    // 입찰 많은순

/** 장터 필터 옵션 */
export interface MarketplaceFilter {
    minPrice?: number;
    maxPrice?: number;
    colors?: string[];
    hasBuyNow?: boolean;
    excludeMine?: boolean;
}

// ============================================
// Cloud Functions 호출 타입
// ============================================

/** 즉시 구매 요청 */
export interface BuyNowRequest {
    listingId: string;
}

/** 즉시 구매 응답 */
export interface BuyNowResponse {
    success: boolean;
    message: string;
    koiData?: SerializedKoi;
    totalPaid?: number;
    fee?: number;
}

/** 광고 보상 요청 */
export interface AdRewardRequest {
    adType: '15s' | '30s';
    verificationToken: string;
}

/** 광고 보상 응답 */
export interface AdRewardResponse {
    success: boolean;
    message: string;
    pointsAwarded: number;
    newBalance: number;
}

/** 입찰 요청 */
export interface PlaceBidRequest {
    listingId: string;
    amount: number;
}

/** 입찰 응답 */
export interface PlaceBidResponse {
    success: boolean;
    message: string;
    currentBid?: number;
    bidCount?: number;
}
