import { db } from './firebase';
import { doc, getDoc, onSnapshot, setDoc, updateDoc, increment } from 'firebase/firestore';

const COLLECTION = 'users';

export const getAPBalance = async (userId: string): Promise<number> => {
    const userRef = doc(db, COLLECTION, userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        return snap.data().ap || 0;
    }
    return 0;
};

export const listenToAPBalance = (userId: string, onUpdate: (ap: number) => void) => {
    const userRef = doc(db, COLLECTION, userId);

    return onSnapshot(userRef, (snap) => {
        if (!snap.exists()) {
            onUpdate(0);
            return;
        }

        const ap = snap.data().ap;
        onUpdate(typeof ap === 'number' ? ap : 0);
    });
};

export const addAP = async (userId: string, amount: number): Promise<void> => {
    const userRef = doc(db, COLLECTION, userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        // 문서가 있으면 업데이트
        await updateDoc(userRef, {
            ap: increment(amount)
        });
    } else {
        // 문서가 없으면 생성
        await setDoc(userRef, {
            ap: amount,
            createdAt: new Date()
        });
    }
};

export const deductAP = async (userId: string, amount: number): Promise<boolean> => {
    const userRef = doc(db, COLLECTION, userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const currentAP = snap.data().ap || 0;
        if (currentAP >= amount) {
            await updateDoc(userRef, {
                ap: increment(-amount)
            });
            return true;
        }
    }
    return false;
};
