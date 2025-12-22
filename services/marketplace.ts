import { db, functions } from './firebase';
import {
    collection,
    addDoc,
    doc,
    query,
    where,
    orderBy,
    limit,
    onSnapshot,
    Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { MarketplaceListing, Koi } from '../types';

const MARKETPLACE_ITEMS_PATH = ['marketplace', 'listings', 'items'] as const;

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
        )
    ]);
};

const getMarketplaceItemsCollection = () => collection(db, ...MARKETPLACE_ITEMS_PATH);

// Firestore는 undefined 값을 허용하지 않으므로, 판매 등록 전에 undefined 필드를 제거합니다.
const sanitizeForFirestore = <T,>(value: T): T => {
    return JSON.parse(JSON.stringify(value)) as T;
};

const toMarketplaceListing = (id: string, data: any): MarketplaceListing => {
    return {
        id,
        sellerId: data.sellerId,
        sellerNickname: data.sellerNickname,
        koiData: data.koiData,
        startPrice: data.startPrice ?? 0,
        buyNowPrice: data.buyNowPrice ?? undefined,
        currentBid: data.currentBid ?? 0,
        currentBidderId: data.currentBidderId ?? null,
        currentBidderNickname: data.currentBidderNickname ?? null,
        bidCount: data.bidCount ?? 0,
        createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        expiresAt: data.expiresAt?.toMillis?.() ?? Date.now(),
        status: data.status,
    };
};

// 활성 경매 목록 구독 (전체)
export const fetchActiveListings = (onUpdate: (listings: MarketplaceListing[]) => void) => {
    const q = query(
        getMarketplaceItemsCollection(),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc'),
        limit(50),
    );

    return onSnapshot(q, (snapshot) => {
        const listings: MarketplaceListing[] = [];
        snapshot.forEach((docSnap) => {
            listings.push(toMarketplaceListing(docSnap.id, docSnap.data()));
        });
        onUpdate(listings);
    }, (error) => {
        console.error('[Marketplace] fetchActiveListings error:', error);
    });
};

// 특정 사용자의 활성 매물 목록 구독 (그림자 코이 방지용)
export const fetchUserActiveListings = (userId: string, onUpdate: (listings: MarketplaceListing[]) => void) => {
    const q = query(
        getMarketplaceItemsCollection(),
        where('sellerId', '==', userId),
        where('status', '==', 'active'),
    );

    return onSnapshot(q, (snapshot) => {
        const listings: MarketplaceListing[] = [];
        snapshot.forEach((docSnap) => {
            listings.push(toMarketplaceListing(docSnap.id, docSnap.data()));
        });
        onUpdate(listings);
    }, (error) => {
        console.error('[Marketplace] fetchUserActiveListings error:', error);
    });
};

export const listenToListing = (listingId: string, onUpdate: (listing: MarketplaceListing | null) => void) => {
    const ref = doc(db, ...MARKETPLACE_ITEMS_PATH, listingId);
    return onSnapshot(ref, (snap) => {
        if (!snap.exists()) {
            onUpdate(null);
            return;
        }

        onUpdate(toMarketplaceListing(snap.id, snap.data()));
    }, (error) => {
        console.error('[Marketplace] listenToListing error:', error);
    });
};

// 판매 등록(경매 생성)
export const createListing = async (
    sellerId: string,
    sellerNickname: string,
    koi: Koi,
    startPrice: number,
    buyNowPrice?: number,
): Promise<string> => {
    console.log('[Marketplace] START: createListing for koi:', koi.id);
    if (!sellerId) {
        console.error('[Marketplace] FAILED: sellerId is missing');
        throw new Error('로그인 정보가 없습니다. 다시 로그인 해주세요.');
    }
    const now = Date.now();
    const expiresAt = now + 3 * 24 * 60 * 60 * 1000; // 3일
    // Firestore는 undefined를 허용하지 않으므로 koiData를 완전히 정제합니다.
    const koiData = JSON.parse(JSON.stringify(koi));

    const listingData = {
        sellerId,
        sellerNickname,
        koiData,
        koiPreview: koi.name,
        startPrice,
        buyNowPrice: buyNowPrice ?? null,
        currentBid: startPrice,
        currentBidderId: null,
        currentBidderNickname: null,
        bidCount: 0,
        createdAt: Timestamp.fromMillis(now),
        expiresAt: Timestamp.fromMillis(expiresAt),
        status: 'active',
    };

    console.log('[Marketplace] Listing Data prepared:', {
        sellerId,
        koiId: koi.id,
        price: buyNowPrice
    });

    try {
        console.log('[Marketplace] Submitting to Firestore (30s timeout)...');
        // 네트워크 지연으로 인해 서버엔 등록되지만 로컬에선 타임아웃이 뜰 수 있으므로 시간을 넉넉히 잡습니다.
        const docRef = await withTimeout(
            addDoc(getMarketplaceItemsCollection(), listingData),
            30000,
            '서버 응답이 늦어지고 있습니다. 잠시 후 장터를 확인해주세요.'
        );
        console.log('[Marketplace] SUCCESS: Listing created ID:', docRef.id);
        return docRef.id;
    } catch (error: any) {
        console.error('[Marketplace] FAILED: createListing:', error);
        if (error.code === 'permission-denied') {
            throw new Error('권한이 없습니다. 보안 규칙을 확인해주세요.');
        }
        throw error;
    }
};

// 입찰 (문서 생성 → Cloud Function onBidCreate가 검증/처리)
export const placeBid = async (
    listingId: string,
    bidderId: string,
    bidderNickname: string,
    amount: number,
) => {
    const bidsCol = collection(db, ...MARKETPLACE_ITEMS_PATH, listingId, 'bids');
    await withTimeout(
        addDoc(bidsCol, {
            bidderId,
            bidderNickname,
            amount,
            timestamp: Timestamp.fromMillis(Date.now()),
        }),
        10000,
        '입찰 요청 시간 초과'
    );
};

// 즉시 구매 (Cloud Function)
export const buyNowListing = async (listingId: string) => {
    console.log('[Marketplace] START: buyNowListing:', listingId);
    const callable = httpsCallable(functions, 'onBuyNow');
    try {
        const result = await withTimeout(
            callable({ listingId }),
            15000,
            '구매 요청 시간 초과'
        );
        return result.data as any;
    } catch (error) {
        console.error('[Marketplace] FAILED: buyNowListing:', error);
        throw error;
    }
};

// 판매 취소 (Cloud Function)
export const cancelListing = async (listingId: string) => {
    console.log('[Marketplace] START: cancelListing:', listingId);
    const callable = httpsCallable(functions, 'onCancelListing');
    try {
        const result = await withTimeout(
            callable({ listingId }),
            15000,
            '취소 요청 시간 초과'
        );
        console.log('[Marketplace] SUCCESS: cancelListing result:', result.data);
        return result.data as any;
    } catch (error) {
        console.error('[Marketplace] FAILED: cancelListing:', error);
        throw error;
    }
};

