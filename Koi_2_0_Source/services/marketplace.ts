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

// 활성 경매 목록 구독
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
    const now = Date.now();
    const expiresAt = now + 3 * 24 * 60 * 60 * 1000; // 3일
    const koiData = sanitizeForFirestore(koi);

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

    const docRef = await addDoc(getMarketplaceItemsCollection(), listingData);
    return docRef.id;
};

// 입찰 (문서 생성 → Cloud Function onBidCreate가 검증/처리)
export const placeBid = async (
    listingId: string,
    bidderId: string,
    bidderNickname: string,
    amount: number,
) => {
    const bidsCol = collection(db, ...MARKETPLACE_ITEMS_PATH, listingId, 'bids');
    await addDoc(bidsCol, {
        bidderId,
        bidderNickname,
        amount,
        timestamp: Timestamp.fromMillis(Date.now()),
    });
};

// 즉시 구매 (Cloud Function)
export const buyNowListing = async (listingId: string) => {
    const callable = httpsCallable(functions, 'onBuyNow');
    const result = await callable({ listingId });
    return result.data as any;
};

// 판매 취소 (Cloud Function)
export const cancelListing = async (listingId: string) => {
    const callable = httpsCallable(functions, 'onCancelListing');
    const result = await callable({ listingId });
    return result.data as any;
};

