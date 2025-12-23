import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';
import { isInAppBrowser, isMobile } from '../utils/userAgent';
import { clearLocalGameSaves, resumeLocalGameSave, suppressLocalGameSave } from '../services/localSave';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGuestPlay: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onGuestPlay }) => {
    const { login, user, loading } = useAuth();

    if (!isOpen) return null;
    if (loading) return null; // 로딩 중에는 아무것도 안 보여줌 (또는 로딩 스피너)

    // 이미 로그인 된 상태라면 모달 닫기 (이펙트로 처리하는 게 더 깔끔할 수 있음)
    if (user) {
        onClose();
        return null;
    }

    const handleGoogleLogin = async () => {
        try {
            suppressLocalGameSave();
            await login();
            clearLocalGameSaves();
            onClose();
            // 모바일(로그인 리다이렉트 사용)이 아닐 경우에만 새로고침
            if (!isMobile()) {
                window.location.reload();
            }
        } catch (error) {
            resumeLocalGameSave();
            alert("로그인 실패: 다시 시도해주세요.");
        }
    };

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal-content">
                <h1 className="auth-title">Koi Garden</h1>
                <div className="auth-modal-body">
                    <p className="auth-description">
                        아름다운 잉어들과 함께하는 힐링의 시간<br />
                        로그인하고 나만의 연못을 저장하세요.
                    </p>

                    {isInAppBrowser() && (
                        <div style={{
                            backgroundColor: 'rgba(255, 87, 87, 0.15)',
                            color: '#ff6b6b',
                            padding: '10px',
                            borderRadius: '8px',
                            marginBottom: '16px',
                            fontSize: '0.9rem',
                            lineHeight: '1.4',
                            border: '1px solid rgba(255, 87, 87, 0.3)'
                        }}>
                            ⚠ <strong>접속 환경 알림</strong><br />
                            카카오톡/인앱 브라우저에서는 구글 정책으로 인해 로그인이 차단될 수 있습니다.<br />
                            우측 하단/상단 메뉴의 <strong>[다른 브라우저로 열기]</strong>를 통해 Chrome이나 Safari에서 접속해주세요.
                        </div>
                    )}

                    <button className="auth-btn google" onClick={handleGoogleLogin}>
                        Google로 로그인
                    </button>

                    <div className="divider">또는</div>

                    <button className="auth-btn guest" onClick={onGuestPlay}>
                        게스트로 시작
                    </button>

                    <div className="auth-warning">
                        게스트 모드는 데이터가 계정에 저장되지 않아<br />
                        앱 삭제 시 복구가 불가능할 수 있습니다.
                    </div>
                </div>
            </div>
        </div>
    );
};
