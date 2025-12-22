import React, { useEffect, useState } from 'react';
import { FilePlus, LogOut, Menu, Moon, Music, RotateCcw, Speaker, Sun, User, X } from 'lucide-react';
import { audioManager } from '../utils/audio';
import { useAuth } from '../contexts/AuthContext';
import { broadcastForceClear, resumeLocalGameSave, suppressLocalGameSave } from '../services/localSave';

interface SaveLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onNewGame: () => Promise<boolean>;
    onLogoutCleanup: () => void;
    isNight: boolean;
    onToggleDayNight: () => void;
    userNickname?: string;
    onSaveNickname?: (nickname: string) => Promise<void>;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
    isOpen,
    onClose,
    onNewGame,
    onLogoutCleanup,
    isNight,
    onToggleDayNight,
    userNickname,
    onSaveNickname,
}) => {
    const [activeTab, setActiveTab] = useState<'settings' | 'new'>('settings');
    const [bgmVolume, setBgmVolume] = useState(0.3);
    const [sfxVolume, setSfxVolume] = useState(0.5);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [isStartingNewGame, setIsStartingNewGame] = useState(false);
    const [nicknameInput, setNicknameInput] = useState('');
    const [isSavingNickname, setIsSavingNickname] = useState(false);
    const [nicknameError, setNicknameError] = useState<string | null>(null);
    const { user, logout } = useAuth();

    useEffect(() => {
        if (!isOpen) return;
        const vols = audioManager.getVolumes();
        setBgmVolume(vols.bgm);
        setSfxVolume(vols.sfx);
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        setNicknameInput(userNickname ?? '');
        setNicknameError(null);
    }, [isOpen, userNickname]);

    const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setBgmVolume(val);
        audioManager.setBGMVolume(val);
    };

    const handleSfxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setSfxVolume(val);
        audioManager.setSFXVolume(val);
    };

    const handleSfxMouseUp = () => {
        audioManager.playSFX('click');
    };

    const handleNewGame = async () => {
        if (isStartingNewGame) return;

        try {
            setIsStartingNewGame(true);
            audioManager.playSFX('click');
            const ok = await onNewGame();
            if (ok) {
                onClose();
            }
        } finally {
            setIsStartingNewGame(false);
        }
    };

    const handleSaveNickname = async () => {
        if (!user) return;
        if (!onSaveNickname) return;
        if (isSavingNickname) return;

        const trimmed = nicknameInput.trim();
        if (!trimmed) {
            setNicknameError('닉네임을 입력해주세요.');
            return;
        }
        if (trimmed.length > 20) {
            setNicknameError('닉네임은 20자 이하로 입력해주세요.');
            return;
        }

        try {
            setIsSavingNickname(true);
            setNicknameError(null);
            audioManager.playSFX('click');
            await onSaveNickname(trimmed);
        } catch (error) {
            console.error('Nickname save failed:', error);
            setNicknameError('닉네임 저장에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSavingNickname(false);
        }
    };

    const handleLogout = async () => {
        if (isLoggingOut) return;

        try {
            suppressLocalGameSave();
            setIsLoggingOut(true);
            audioManager.playSFX('click');
            await logout();
            broadcastForceClear();
            onClose();
            onLogoutCleanup();
        } catch (error) {
            resumeLocalGameSave();
            console.error('Logout failed:', error);
            alert('로그아웃 실패: 다시 시도해주세요.');
        } finally {
            setIsLoggingOut(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* 헤더 */}
                <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Menu size={20} className="text-cyan-400" /> 게임 메뉴
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* 탭 */}
                <div className="flex border-b border-gray-700 overflow-x-auto">
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-gray-700 text-purple-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('settings')}
                        type="button"
                    >
                        설정
                    </button>
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'new' ? 'bg-gray-700 text-red-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('new')}
                        type="button"
                    >
                        새 게임
                    </button>
                </div>

                {/* 내용 */}
                <div className="p-4 min-h-[300px]">
                    {activeTab === 'settings' && (
                        <div className="space-y-6 pt-4">
                            <div className="text-sm text-gray-400 bg-gray-900/30 border border-gray-700 rounded-lg p-3">
                                게임 진행은 자동 저장됩니다. 로그인하면 계정에도 자동 저장됩니다.
                            </div>

                            {/* 배경 음악 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-gray-300">
                                    <span className="flex items-center gap-2"><Music size={18} /> 배경 음악</span>
                                    <span className="font-mono text-sm text-gray-500">{Math.round(bgmVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={bgmVolume}
                                    onChange={handleBgmChange}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>

                            {/* 효과음 */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-gray-300">
                                    <span className="flex items-center gap-2"><Speaker size={18} /> 효과음</span>
                                    <span className="font-mono text-sm text-gray-500">{Math.round(sfxVolume * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={sfxVolume}
                                    onChange={handleSfxChange}
                                    onMouseUp={handleSfxMouseUp}
                                    onTouchEnd={handleSfxMouseUp}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                                />
                            </div>

                            {/* 낮/밤 전환 */}
                            <div className="pt-2 border-t border-gray-700">
                                <div className="flex justify-between items-center text-gray-300 mb-2">
                                    <span className="flex items-center gap-2"><Sun size={18} /> 시간대 설정</span>
                                    <span className="text-xs text-gray-500">{isNight ? '현재: 밤' : '현재: 낮'}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        onToggleDayNight();
                                        audioManager.playSFX('click');
                                    }}
                                    className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isNight
                                        ? 'bg-indigo-900 text-yellow-300 border border-indigo-700 hover:bg-indigo-800'
                                        : 'bg-blue-100 text-orange-600 border border-orange-200 hover:bg-blue-200'
                                        }`}
                                    type="button"
                                >
                                    {isNight ? (
                                        <>
                                            <Sun size={20} /> 아침으로 변경하기
                                        </>
                                    ) : (
                                        <>
                                            <Moon size={20} /> 밤으로 변경하기
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* 닉네임 */}
                            {user && onSaveNickname && (
                                <div className="pt-4 border-t border-gray-700">
                                    <div className="flex justify-between items-center text-gray-300 mb-2">
                                        <span className="flex items-center gap-2"><User size={18} /> 닉네임</span>
                                        <span className="text-xs text-gray-500">장터에 표시됩니다</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            value={nicknameInput}
                                            onChange={(e) => setNicknameInput(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveNickname();
                                            }}
                                            className="flex-1 bg-gray-800 border border-gray-600 rounded-lg py-2 px-3 text-white focus:border-cyan-500 focus:outline-none"
                                            placeholder="닉네임 입력"
                                            maxLength={20}
                                            disabled={isSavingNickname}
                                        />
                                        <button
                                            onClick={handleSaveNickname}
                                            disabled={isSavingNickname}
                                            className={`px-4 rounded-lg font-bold transition-colors ${isSavingNickname
                                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                                : 'bg-cyan-700 hover:bg-cyan-600 text-white'
                                                }`}
                                            type="button"
                                        >
                                            {isSavingNickname ? '저장 중' : '저장'}
                                        </button>
                                    </div>
                                    {nicknameError && (
                                        <div className="mt-2 text-xs text-red-300 bg-red-900/30 border border-red-800 rounded p-2">
                                            {nicknameError}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* 로그아웃 (로그인 상태에서만 표시) */}
                            {user && (
                                <div className="pt-4 border-t border-gray-700">
                                    <div className="flex justify-between items-center text-gray-300 mb-2 gap-3">
                                        <span className="flex items-center gap-2"><LogOut size={18} /> 계정</span>
                                        <span className="text-xs text-gray-500 truncate max-w-[180px] text-right">
                                            {user.email ?? user.displayName ?? '로그인됨'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        disabled={isLoggingOut}
                                        className={`w-full py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${isLoggingOut
                                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                            : 'bg-red-900/50 text-red-300 border border-red-700 hover:bg-red-900'
                                            }`}
                                        type="button"
                                    >
                                        <LogOut size={20} />
                                        {isLoggingOut ? '로그아웃 중...' : '로그아웃'}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'new' && (
                        <div className="flex flex-col items-center justify-center h-full py-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center text-red-400">
                                <FilePlus size={40} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white mb-2">새 게임 시작</h3>
                                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                    현재 진행 상황을 모두 초기화하고<br />새로운 연못에서 시작합니다.
                                </p>
                            </div>
                            <button
                                onClick={handleNewGame}
                                disabled={isStartingNewGame || isLoggingOut}
                                className={`font-bold py-3 px-8 rounded-full shadow-lg transition-all flex items-center gap-2 ${isStartingNewGame || isLoggingOut
                                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-600 hover:bg-red-500 text-white transform hover:scale-105'
                                    }`}
                                type="button"
                            >
                                <RotateCcw size={20} />
                                {isStartingNewGame ? '초기화 중...' : '새 게임 시작하기'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
