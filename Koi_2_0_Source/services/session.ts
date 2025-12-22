import { db } from './firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';

const SESSION_COLLECTION = 'sessions';
const USERS_COLLECTION = 'users';
const DEVICE_ID_KEY = 'zenkoigarden_device_id';

// 기기 고유 ID 가져오기 (없으면 생성)
export const getDeviceId = (): string => {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
};

// 세션 시작 (접속)
export const startSession = async (userId: string) => {
    const deviceId = getDeviceId();
    const sessionRef = doc(db, SESSION_COLLECTION, userId);

    await setDoc(sessionRef, {
        deviceId,
        lastActive: serverTimestamp(),
        isOnline: true,
        // userAgent: navigator.userAgent // Optional info
    });
};

// 세션 유지 (Heartbeat - 필요시 호출)
export const heartbeatSession = async (userId: string) => {
    const sessionRef = doc(db, SESSION_COLLECTION, userId);
    // 내 세션이 맞을 때만 업데이트
    // (Note: This is a simple client-side check. 
    // Ideally, security rules or Cloud Functions should verify ownership/active status)
    await setDoc(sessionRef, {
        lastActive: serverTimestamp()
    }, { merge: true });
};

// 내 세션이 유효한지 감시 (중복 로그인 감지)
export const listenToSession = (userId: string, onConflict: () => void) => {
    const deviceId = getDeviceId();
    const sessionRef = doc(db, SESSION_COLLECTION, userId);

    return onSnapshot(sessionRef, (snapshot) => {
        const data = snapshot.data();
        if (data) {
            // DB에 기록된 deviceId가 내 것과 다르면 다른 기기에서 접속한 것
            if (data.deviceId !== deviceId) {
                onConflict();
            }
        }
    });
};

// 세션 문서(/sessions)는 읽기 차단(rules) 상태를 유지하고,
// 사용자 문서(/users)에 기록된 activeDeviceId를 감시하여 중복 로그인(다른 기기 접속)을 감지합니다.
export const listenToActiveDevice = (userId: string, onConflict: () => void) => {
    const deviceId = getDeviceId();
    const userRef = doc(db, USERS_COLLECTION, userId);

    return onSnapshot(userRef, (snapshot) => {
        const data = snapshot.data() as { activeDeviceId?: string } | undefined;
        const activeDeviceId = data?.activeDeviceId;
        if (activeDeviceId && activeDeviceId !== deviceId) {
            onConflict();
        }
    });
};
