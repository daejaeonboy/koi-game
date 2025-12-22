import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { SavedGameState } from '../types';

const COLLECTION = 'users';

// 클라우드에 게임 데이터 저장
export const saveGameToCloud = async (userId: string, gameState: SavedGameState) => {
    const userRef = doc(db, COLLECTION, userId);

    // Firestore는 undefined 값을 허용하지 않으므로, JSON을 통해 정제
    const sanitizedGameState = JSON.parse(JSON.stringify(gameState));

    // gameData 필드에 전체 상태 저장
    // merge: true를 사용하여 다른 필드(예: profile, ap)를 덮어쓰지 않음
    await setDoc(userRef, {
        gameData: sanitizedGameState,
        lastUpdated: new Date()
    }, { merge: true });
};

// 클라우드에서 게임 데이터 불러오기
export const loadGameFromCloud = async (userId: string): Promise<SavedGameState | null> => {
    const userRef = doc(db, COLLECTION, userId);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
        const data = snap.data();
        return data.gameData as SavedGameState;
    }
    return null;
};

// 실시간 데이터 동기화 리스너 (선택 사항)
// 다른 기기에서 저장했을 때 내 기기에 반영하려면 사용
export const listenToGameData = (userId: string, onUpdate: (data: SavedGameState) => void) => {
    const userRef = doc(db, COLLECTION, userId);

    return onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data();
            if (data.gameData) {
                onUpdate(data.gameData as SavedGameState);
            }
        }
    });
}
