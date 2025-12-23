import { signInWithCredential, signInWithPopup, signInWithRedirect, signOut, User, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { isMobile } from '../utils/userAgent';

// 로그인
export const loginWithGoogle = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            // 모바일 앱(Capacitor) 환경: 네이티브 Google 로그인 → Firebase JS SDK로 브릿지
            const result = await FirebaseAuthentication.signInWithGoogle();
            const idToken = result.credential?.idToken;
            const accessToken = result.credential?.accessToken;

            if (!idToken && !accessToken) {
                throw new Error('Google 로그인 토큰을 가져오지 못했습니다.');
            }

            const credential = GoogleAuthProvider.credential(idToken ?? undefined, accessToken ?? undefined);
            await signInWithCredential(auth, credential);
        } else {
            // 웹 환경
            if (isMobile()) {
                // 모바일 웹에서는 리다이렉트 방식 사용 (팝업 차단/인앱 브라우저 대응)
                await signInWithRedirect(auth, googleProvider);
            } else {
                await signInWithPopup(auth, googleProvider);
            }
        }
    } catch (error) {
        console.error("Google Login Error:", error);
        throw error;
    }
};

// 로그아웃
export const logout = async () => {
    try {
        if (Capacitor.isNativePlatform()) {
            await FirebaseAuthentication.signOut();
        }
        await signOut(auth);
    } catch (error) {
        console.error("Logout Error:", error);
        throw error;
    }
};

// 인증 상태 감지 리스너
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, callback);
};
