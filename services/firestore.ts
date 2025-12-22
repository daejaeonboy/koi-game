/**
 * Firestore 데이터베이스 유틸리티 함수
 * 사용자 데이터, 세션, 장터 관련 CRUD 작업
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    onSnapshot,
    addDoc,
    serverTimestamp,
    Timestamp,
    DocumentReference,
    QueryConstraint,
    Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import {
    FirestoreUserDocument,
    UserProfile,
    UserGameData,
    SessionData,
    MarketplaceListing,
    Bid,
    Transaction,
    SerializedKoi,
    ListingStatus,
    MarketplaceSortOption,
    MarketplaceFilter,
} from '../types/online';

// ============================================
// 1. 사용자 데이터 관리
// ============================================

/**
 * 사용자 문서 가져오기
 */
export async function getUserDocument(userId: string): Promise<FirestoreUserDocument | null> {
    try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data() as FirestoreUserDocument;
        }
        return null;
    } catch (error) {
        console.error('Error getting user document:', error);
        throw error;
    }
}

/**
 * 새 사용자 문서 생성
 */
export async function createUserDocument(
    userId: string,
    displayName: string
): Promise<void> {
    try {
        const now = serverTimestamp();
        const initialData: Omit<FirestoreUserDocument, 'profile'> & { profile: Omit<UserProfile, 'createdAt' | 'lastLogin'> & { createdAt: ReturnType<typeof serverTimestamp>; lastLogin: ReturnType<typeof serverTimestamp> } } = {
            profile: {
                nickname: displayName || `Koi_${userId.slice(0, 6)}`,
                createdAt: now,
                lastLogin: now,
            },
            gameData: {
                money: 1000,      // 시작 ZP
                food: 10,
                corn: 0,
                medicine: 0,
                honorPoints: 0,    // 명예 트로피 초기값
                theme: '기본 (맑은 물)' as any, // PondTheme.DEFAULT
                pondCapacity: 10,
            },
            ap: 0,              // 시작 AP
            kois: [],
        };

        const docRef = doc(db, 'users', userId);
        await setDoc(docRef, initialData);
    } catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
}

/**
 * 사용자 게임 데이터 업데이트
 */
export async function updateUserGameData(
    userId: string,
    gameData: Partial<UserGameData>
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId);
        const updateData: Record<string, any> = {};

        // gameData 필드들을 개별적으로 업데이트
        Object.entries(gameData).forEach(([key, value]) => {
            updateData[`gameData.${key}`] = value;
        });

        await updateDoc(docRef, updateData);
    } catch (error) {
        console.error('Error updating user game data:', error);
        throw error;
    }
}

/**
 * 사용자 잉어 목록 업데이트
 */
export async function updateUserKois(
    userId: string,
    kois: SerializedKoi[]
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, { kois });
    } catch (error) {
        console.error('Error updating user kois:', error);
        throw error;
    }
}

/**
 * 사용자 AP 업데이트
 */
export async function updateUserAP(
    userId: string,
    ap: number
): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, { ap });
    } catch (error) {
        console.error('Error updating user AP:', error);
        throw error;
    }
}

/**
 * 마지막 로그인 시간 업데이트
 */
export async function updateLastLogin(userId: string): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId);
        await updateDoc(docRef, {
            'profile.lastLogin': serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating lastLogin:', error);
        throw error;
    }
}

/**
 * 랭킹 목록 가져오기 (명예 트로피 기준)
 */
export async function getTopRankings(limitCount: number = 20): Promise<FirestoreUserDocument[]> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(
            usersRef,
            orderBy('gameData.honorPoints', 'desc'),
            limit(limitCount)
        );
        const querySnap = await getDocs(q);

        const rankings: FirestoreUserDocument[] = [];
        querySnap.forEach((doc) => {
            const data = doc.data() as FirestoreUserDocument;
            rankings.push({ ...data, uid: doc.id });
        });

        return rankings;
    } catch (error) {
        console.error('Error getting rankings:', error);
        throw error;
    }
}

/**
 * 사용자 데이터 실시간 리스너
 */
export function subscribeToUserData(
    userId: string,
    onUpdate: (data: FirestoreUserDocument | null) => void
): Unsubscribe {
    const docRef = doc(db, 'users', userId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onUpdate(docSnap.data() as FirestoreUserDocument);
        } else {
            onUpdate(null);
        }
    });
}

// ============================================
// 2. 세션 관리 (동시접속 방지)
// ============================================

/**
 * 디바이스 ID 생성/가져오기
 */
export function getDeviceId(): string {
    let deviceId = localStorage.getItem('zen_koi_device_id');
    if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('zen_koi_device_id', deviceId);
    }
    return deviceId;
}

/**
 * 세션 생성/업데이트
 */
export async function createOrUpdateSession(userId: string): Promise<void> {
    try {
        const deviceId = getDeviceId();
        const sessionData: Omit<SessionData, 'lastActive'> & { lastActive: ReturnType<typeof serverTimestamp> } = {
            deviceId,
            lastActive: serverTimestamp(),
            isOnline: true,
        };

        const docRef = doc(db, 'sessions', userId);
        await setDoc(docRef, sessionData);
    } catch (error) {
        console.error('Error creating/updating session:', error);
        throw error;
    }
}

/**
 * 세션 하트비트 (주기적 업데이트)
 */
export async function updateSessionHeartbeat(userId: string): Promise<void> {
    try {
        const docRef = doc(db, 'sessions', userId);
        await updateDoc(docRef, {
            lastActive: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating session heartbeat:', error);
        throw error;
    }
}

/**
 * 세션 종료 (오프라인 처리)
 */
export async function endSession(userId: string): Promise<void> {
    try {
        const docRef = doc(db, 'sessions', userId);
        await updateDoc(docRef, {
            isOnline: false,
            lastActive: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error ending session:', error);
        throw error;
    }
}

// ============================================
// 3. 장터 관리
// ============================================

/**
 * 경매 목록 쿼리
 */
export async function getMarketplaceListings(
    sortBy: MarketplaceSortOption = 'newest',
    filters?: MarketplaceFilter,
    limitCount: number = 20
): Promise<MarketplaceListing[]> {
    try {
        const listingsRef = collection(db, 'marketplace', 'listings', 'items');
        const constraints: QueryConstraint[] = [
            where('status', '==', 'active' as ListingStatus),
        ];

        // 정렬 옵션
        switch (sortBy) {
            case 'newest':
                constraints.push(orderBy('createdAt', 'desc'));
                break;
            case 'ending_soon':
                constraints.push(orderBy('expiresAt', 'asc'));
                break;
            case 'price_low':
                constraints.push(orderBy('currentBid', 'asc'));
                break;
            case 'price_high':
                constraints.push(orderBy('currentBid', 'desc'));
                break;
            case 'bid_count':
                constraints.push(orderBy('bidCount', 'desc'));
                break;
        }

        constraints.push(limit(limitCount));

        const q = query(listingsRef, ...constraints);
        const querySnap = await getDocs(q);

        const listings: MarketplaceListing[] = [];
        querySnap.forEach((doc) => {
            listings.push({ id: doc.id, ...doc.data() } as MarketplaceListing);
        });

        // 클라이언트 측 필터링 (Firestore 쿼리 제한 때문)
        return applyClientFilters(listings, filters);
    } catch (error) {
        console.error('Error getting marketplace listings:', error);
        throw error;
    }
}

/**
 * 클라이언트 측 필터링
 */
function applyClientFilters(
    listings: MarketplaceListing[],
    filters?: MarketplaceFilter
): MarketplaceListing[] {
    if (!filters) return listings;

    return listings.filter((listing) => {
        if (filters.minPrice && listing.currentBid < filters.minPrice) return false;
        if (filters.maxPrice && listing.currentBid > filters.maxPrice) return false;
        if (filters.hasBuyNow && !listing.buyNowPrice) return false;
        // 추가 필터 로직...
        return true;
    });
}

/**
 * 내 경매 목록 가져오기
 */
export async function getMyListings(
    userId: string,
    status?: ListingStatus
): Promise<MarketplaceListing[]> {
    try {
        const listingsRef = collection(db, 'marketplace', 'listings', 'items');
        const constraints: QueryConstraint[] = [
            where('sellerId', '==', userId),
            orderBy('createdAt', 'desc'),
        ];

        if (status) {
            constraints.unshift(where('status', '==', status));
        }

        const q = query(listingsRef, ...constraints);
        const querySnap = await getDocs(q);

        const listings: MarketplaceListing[] = [];
        querySnap.forEach((doc) => {
            listings.push({ id: doc.id, ...doc.data() } as MarketplaceListing);
        });

        return listings;
    } catch (error) {
        console.error('Error getting my listings:', error);
        throw error;
    }
}

/**
 * 경매 상세 정보 가져오기
 */
export async function getListingById(
    listingId: string
): Promise<MarketplaceListing | null> {
    try {
        const docRef = doc(db, 'marketplace', 'listings', 'items', listingId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() } as MarketplaceListing;
        }
        return null;
    } catch (error) {
        console.error('Error getting listing:', error);
        throw error;
    }
}

/**
 * 경매 등록
 */
export async function createListing(
    listing: Omit<MarketplaceListing, 'id' | 'createdAt' | 'status' | 'currentBid' | 'currentBidderId' | 'currentBidderNickname' | 'bidCount'>
): Promise<string> {
    try {
        const listingsRef = collection(db, 'marketplace', 'listings', 'items');
        const newListing = {
            ...listing,
            currentBid: listing.startPrice,
            currentBidderId: null,
            currentBidderNickname: null,
            bidCount: 0,
            status: 'active' as ListingStatus,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(listingsRef, newListing);
        return docRef.id;
    } catch (error) {
        console.error('Error creating listing:', error);
        throw error;
    }
}

/**
 * 경매 실시간 리스너
 */
export function subscribeToListing(
    listingId: string,
    onUpdate: (listing: MarketplaceListing | null) => void
): Unsubscribe {
    const docRef = doc(db, 'marketplace', 'listings', 'items', listingId);
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            onUpdate({ id: docSnap.id, ...docSnap.data() } as MarketplaceListing);
        } else {
            onUpdate(null);
        }
    });
}

/**
 * 입찰 내역 가져오기
 */
export async function getBidsForListing(
    listingId: string,
    limitCount: number = 10
): Promise<Bid[]> {
    try {
        const bidsRef = collection(db, 'marketplace', 'listings', 'items', listingId, 'bids');
        const q = query(bidsRef, orderBy('timestamp', 'desc'), limit(limitCount));
        const querySnap = await getDocs(q);

        const bids: Bid[] = [];
        querySnap.forEach((doc) => {
            bids.push({ id: doc.id, ...doc.data() } as Bid);
        });

        return bids;
    } catch (error) {
        console.error('Error getting bids:', error);
        throw error;
    }
}

/**
 * 입찰 생성 (Cloud Function에서 검증 필요)
 */
export async function createBid(
    listingId: string,
    bid: Omit<Bid, 'id' | 'timestamp'>
): Promise<string> {
    try {
        const bidsRef = collection(db, 'marketplace', 'listings', 'items', listingId, 'bids');
        const newBid = {
            ...bid,
            timestamp: serverTimestamp(),
        };

        const docRef = await addDoc(bidsRef, newBid);
        return docRef.id;
    } catch (error) {
        console.error('Error creating bid:', error);
        throw error;
    }
}

// ============================================
// 4. 거래 내역
// ============================================

/**
 * 사용자 거래 내역 가져오기
 */
export async function getUserTransactions(
    userId: string,
    limitCount: number = 20
): Promise<Transaction[]> {
    try {
        const transactionsRef = collection(db, 'transactions');
        const q = query(
            transactionsRef,
            where('userId', '==', userId),
            orderBy('timestamp', 'desc'),
            limit(limitCount)
        );
        const querySnap = await getDocs(q);

        const transactions: Transaction[] = [];
        querySnap.forEach((doc) => {
            transactions.push({ id: doc.id, ...doc.data() } as Transaction);
        });

        return transactions;
    } catch (error) {
        console.error('Error getting transactions:', error);
        throw error;
    }
}
