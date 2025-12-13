import React, { useState, useEffect } from 'react';
import { X, Save, Upload, RotateCcw, Trash2, FilePlus, Volume2, Music, Speaker, Database, Copy, Download, Palette } from 'lucide-react';
import { SavedGameState, PondData } from '../types';
import { audioManager } from '../utils/audio';
import { compressGameStateAsync, decompressGameStateAsync } from '../utils/serializer';

interface SaveLoadModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentGameState: SavedGameState;
    onLoad: (state: SavedGameState) => void;
    onReset: () => void;
    onThemeClick: () => void;
}

interface SaveSlot {
    id: string;
    timestamp: number;
    summary: string;
}

const SLOT_PREFIX = 'zenKoiGardenSaveSlot_';
const SLOTS = ['1', '2', '3'];

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({
    isOpen,
    onClose,
    currentGameState,
    onLoad,
    onReset,
    onThemeClick,
}) => {
    const [activeTab, setActiveTab] = useState<'save' | 'load' | 'backup' | 'new' | 'settings'>('save');
    const [bgmVolume, setBgmVolume] = useState(0.3);
    const [sfxVolume, setSfxVolume] = useState(0.5);

    // Backup State
    const [importData, setImportData] = useState('');
    const [backupStatus, setBackupStatus] = useState('');

    useEffect(() => {
        const vols = audioManager.getVolumes();
        setBgmVolume(vols.bgm);
        setSfxVolume(vols.sfx);
    }, [isOpen]); // Update when opened

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
    const [slots, setSlots] = useState<Record<string, SaveSlot | null>>({});

    useEffect(() => {
        if (isOpen) {
            loadSlots();
        }
    }, [isOpen]);

    const loadSlots = () => {
        // console.log("Loading slots...");
        const loadedSlots: Record<string, SaveSlot | null> = {};
        SLOTS.forEach(id => {
            try {
                const key = `${SLOT_PREFIX}${id}`;
                const data = localStorage.getItem(key);
                // console.log(`Slot ${id} (${key}):`, data ? "Found data" : "Empty");
                if (data) {
                    const parsed: SavedGameState = JSON.parse(data);
                    loadedSlots[id] = {
                        id,
                        timestamp: parsed.timestamp || Date.now(),
                        summary: `${parsed.zenPoints.toLocaleString()} ZP | ${Object.values(parsed.ponds).reduce((acc, p) => acc + p.kois.length, 0)} Kois`
                    };
                } else {
                    loadedSlots[id] = null;
                }
            } catch (e) {
                console.error(`Error loading slot ${id}:`, e);
                loadedSlots[id] = null;
            }
        });
        setSlots(loadedSlots);
    };

    const handleSave = (slotId: string) => {
        try {
            const stateToSave = {
                ...currentGameState,
                timestamp: Date.now(),
            };
            const json = JSON.stringify(stateToSave);
            localStorage.setItem(`${SLOT_PREFIX}${slotId}`, json);
            audioManager.playSFX('click');
            alert("저장되었습니다!");
            loadSlots();
        } catch (e) {
            console.error("Save failed:", e);
            alert(`저장 실패: ${e}`);
        }
    };

    const handleLoad = (slotId: string) => {
        const data = localStorage.getItem(`${SLOT_PREFIX}${slotId}`);
        if (data) {
            if (window.confirm(`슬롯 ${slotId}을 불러오시겠습니까? 현재 진행 상황은 저장되지 않은 경우 사라집니다.`)) {
                try {
                    const parsed: SavedGameState = JSON.parse(data);
                    onLoad(parsed);
                    onClose();
                    audioManager.playSFX('click');
                } catch (e) {
                    alert('데이터를 불러오는 중 오류가 발생했습니다.');
                }
            }
        }
    };

    const handleDelete = (slotId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm(`슬롯 ${slotId}의 데이터를 삭제하시겠습니까?`)) {
            localStorage.removeItem(`${SLOT_PREFIX}${slotId}`);
            loadSlots();
            audioManager.playSFX('click');
        }
    };

    const handleNewGame = () => {
        console.log("Starting new game...");
        onReset();
        onClose();
    };

    // --- Serverless Backup Logic ---
    const handleExport = async () => {
        try {
            const code = await compressGameStateAsync(currentGameState);

            await navigator.clipboard.writeText(code);
            setBackupStatus('복사 완료! (Clipboard)');
            setTimeout(() => setBackupStatus(''), 3000);
            audioManager.playSFX('click');
        } catch (e: any) {
            setBackupStatus(`복사 실패: ${e.message || e}`);
            console.error(e);
        }
    };

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            setImportData(text);
            if (text) setBackupStatus('붙여넣기 완료!');
        } catch (e) {
            setBackupStatus('붙여넣기 권한 필요 / 실패');
            // Fallback: manually focus?
        }
    };

    const handleImport = async () => {
        if (!importData) {
            alert("입력된 데이터가 없습니다.");
            return;
        }

        try {
            const parsed = await decompressGameStateAsync(importData);

            // Basic Validation
            if (!parsed.ponds || !parsed.activePondId) {
                throw new Error("Invalid Save Data Format");
            }

            if (window.confirm(`백업 데이터를 적용하시겠습니까?\n포인트: ${parsed.zenPoints}\n코이: ${Object.values(parsed.ponds).reduce((acc: number, p: PondData) => acc + p.kois.length, 0)}마리`)) {
                onLoad(parsed);
                onClose();
                audioManager.playSFX('click');
                alert("데이터가 성공적으로 복구되었습니다.");
            }
        } catch (e) {
            alert(`데이터 복구 실패:\n올바르지 않은 백업 코드입니다.\n(${e})`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-xl max-w-md w-full border border-gray-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex justify-between items-center p-4 bg-gray-900 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Save size={20} className="text-cyan-400" /> 게임 메뉴
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700 overflow-x-auto">
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'save' ? 'bg-gray-700 text-cyan-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('save')}
                    >
                        저장
                    </button>
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'load' ? 'bg-gray-700 text-green-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('load')}
                    >
                        불러오기
                    </button>
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'backup' ? 'bg-gray-700 text-yellow-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('backup')}
                    >
                        백업/복구
                    </button>
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'new' ? 'bg-gray-700 text-red-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('new')}
                    >
                        새 게임
                    </button>
                    <button
                        className={`flex-1 py-3 px-2 font-bold transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'bg-gray-700 text-purple-300' : 'text-gray-400 hover:bg-gray-700/50'}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        설정
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 min-h-[300px]">
                    {activeTab === 'save' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400 mb-2">저장할 슬롯을 선택하세요.</p>
                            {SLOTS.map(id => (
                                <button
                                    key={id}
                                    className="w-full text-left bg-gray-700/50 border border-gray-600 rounded-lg p-3 flex justify-between items-center hover:bg-gray-700 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-cyan-400"
                                    onClick={() => handleSave(id)}
                                    type="button"
                                >
                                    <div>
                                        <div className="font-bold text-white">슬롯 {id}</div>
                                        <div className="text-xs text-gray-400">
                                            {slots[id] ? (
                                                <>
                                                    <div>{new Date(slots[id]!.timestamp).toLocaleString()}</div>
                                                    <div className="text-cyan-300">{slots[id]!.summary}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-500">비어 있음</span>
                                            )}
                                        </div>
                                    </div>
                                    <Save size={20} className="text-cyan-400" />
                                </button>
                            ))}
                        </div>
                    )}

                    {activeTab === 'load' && (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400 mb-2">불러올 데이터를 선택하세요.</p>
                            {SLOTS.map(id => (
                                <div
                                    key={id}
                                    className={`border rounded-lg p-3 flex justify-between items-center transition-colors ${slots[id] ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 cursor-pointer' : 'bg-gray-800/50 border-gray-700 opacity-50 cursor-not-allowed'}`}
                                    onClick={() => slots[id] && handleLoad(id)}
                                >
                                    <div>
                                        <div className="font-bold text-white">슬롯 {id}</div>
                                        <div className="text-xs text-gray-400">
                                            {slots[id] ? (
                                                <>
                                                    <div>{new Date(slots[id]!.timestamp).toLocaleString()}</div>
                                                    <div className="text-green-300">{slots[id]!.summary}</div>
                                                </>
                                            ) : (
                                                <span className="text-gray-500">비어 있음</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {slots[id] && (
                                            <button
                                                onClick={(e) => handleDelete(id, e)}
                                                className="p-2 hover:bg-red-500/20 rounded-full text-gray-400 hover:text-red-400 transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                        <Upload size={20} className={slots[id] ? "text-green-400" : "text-gray-600"} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'backup' && (
                        <div className="space-y-6">
                            {/* Export Section */}
                            <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                                    <Database size={18} className="text-cyan-400" /> 데이터 내보내기 (백업)
                                </h3>
                                <p className="text-xs text-gray-400 mb-3">
                                    현재 게임 데이터를 텍스트 코드로 변환하여 클립보드에 복사합니다. 이 코드를 안전한 곳에 보관하세요.
                                </p>
                                <button
                                    onClick={handleExport}
                                    className="w-full bg-cyan-700 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Copy size={16} /> 백업 코드 복사하기
                                </button>
                            </div>

                            {/* Import Section */}
                            <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                                <h3 className="text-white font-bold flex items-center gap-2 mb-2">
                                    <Download size={18} className="text-green-400" /> 데이터 불러오기 (복구)
                                </h3>
                                <p className="text-xs text-gray-400 mb-3">
                                    보관해둔 백업 코드를 아래에 붙여넣고 복구 버튼을 누르세요.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={importData}
                                            onChange={(e) => setImportData(e.target.value)}
                                            placeholder="백업 코드를 여기에 붙여넣으세요..."
                                            className="flex-1 bg-gray-900 border border-gray-600 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-green-500"
                                        />
                                        <button
                                            onClick={handlePaste}
                                            className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-xs"
                                        >
                                            붙여넣기
                                        </button>
                                    </div>
                                    <button
                                        onClick={handleImport}
                                        className="w-full bg-green-700 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Upload size={16} /> 데이터 복구하기
                                    </button>
                                </div>
                            </div>

                            {/* Status Message */}
                            {backupStatus && (
                                <div className="text-center text-sm font-bold text-yellow-300 animate-pulse">
                                    {backupStatus}
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
                                className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
                            >
                                <RotateCcw size={20} />
                                새 게임 시작하기
                            </button>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6 pt-4">
                            {/* BGM Slider */}
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

                            {/* SFX Slider */}
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
