import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';
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
            // 게스트 데이터가 로그인 계정에 섞이지 않도록, 로그인 직후 로컬 진행 데이터를 초기화합니다.
            clearLocalGameSaves();
            onClose(); // 성공 시 모달 닫기
            window.location.reload();
        } catch (error) {
            resumeLocalGameSave();
            alert("로그인 실패: 다시 시도해주세요.");
        }
    };

    return (
        <div className="auth-modal-overlay">
            <div className="auth-modal-content">
                <h2>🎏 Zen Koi Garden</h2>
                <div className="auth-modal-body">
                    <p className="auth-description">
                        온라인 기능을 이용하려면 로그인이 필요합니다.<br />
                        로그인하면 친구들과 잉어를 거래할 수 있습니다!
                    </p>

                    <button className="auth-btn google" onClick={handleGoogleLogin}>
                        🔐 Google로 로그인
                    </button>

                    <div className="divider">또는</div>

                    <button className="auth-btn guest" onClick={onGuestPlay}>
                        🎮 게스트로 시작
                    </button>

                    <div className="auth-warning">
                        ⚠️ 게스트 플레이 데이터는 나중에 온라인 계정으로 연결할 수 없습니다.
                    </div>
                </div>
            </div>
        </div>
    );
};
