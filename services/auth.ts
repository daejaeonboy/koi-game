import { signInWithPopup, signOut, User, onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// 리다이렉트 결과 처리 (모바일 웹 로그인 후 복귀 시 실행)
export const checkRedirectResult = async () => {
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            return result.user;
        }
    } catch (error) {
        console.error("Redirect Login Result Error:", error);
        // 여기서 에러를 throw하거나 UI에 표시할 수 있도록 리턴
        throw error;
    }
};

// 로그인
export const loginWithGoogle = async () => {
    try {
        // 웹 환경: 팝업 방식 사용 (리다이렉트는 도메인 불일치 이슈 발생)
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error("Google Login Error:", error);
        throw error;
    }
};

// 로그아웃
export const logout = async () => {
    try {
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
