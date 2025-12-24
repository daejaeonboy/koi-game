import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

const USERS_COLLECTION = 'users';

const buildDefaultNickname = (userId: string, displayName?: string | null, email?: string | null) => {
    const name = displayName?.trim();
    if (name) return name;

    const emailPrefix = email?.split('@')?.[0]?.trim();
    if (emailPrefix) return emailPrefix;

    return `Koi_${userId.slice(0, 6)}`;
};

export const ensureUserProfileNickname = async (
    userId: string,
    displayName?: string | null,
    email?: string | null,
): Promise<string> => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const snap = await getDoc(userRef);

    const fallbackNickname = buildDefaultNickname(userId, displayName, email);

    if (!snap.exists()) {
        await setDoc(userRef, {
            profile: {
                nickname: fallbackNickname,
                createdAt: serverTimestamp(),
                lastLogin: serverTimestamp(),
            },
            ap: 0,
            kois: [],
        }, { merge: true });
        return fallbackNickname;
    }

    const data: any = snap.data();
    const existingNickname = typeof data?.profile?.nickname === 'string' ? data.profile.nickname.trim() : '';

    if (existingNickname) {
        // 이미 닉네임이 있으면 바로 반환 (불필요한 lastLogin 업데이트 제거로 속도 개선)
        return existingNickname;
    }

    // 닉네임이 비어있거나 없는 경우 기본값으로 채움
    await setDoc(userRef, {
        profile: {
            nickname: fallbackNickname,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
        },
        ap: 0,
        kois: [],
    }, { merge: true });
    return fallbackNickname;
};

export const updateUserNickname = async (userId: string, nickname: string): Promise<void> => {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const trimmed = nickname.trim();
    await setDoc(userRef, {
        profile: {
            nickname: trimmed,
        },
    }, { merge: true });
};

