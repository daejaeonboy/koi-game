export const SAVE_GAME_KEY = 'zenKoiGardenSaveData_v2';
export const MANUAL_SAVE_KEY = 'zenKoiGardenManualSaveData';
export const FORCE_CLEAR_KEY = 'zenKoiGardenForceClear_v1';

let isLocalSaveSuppressed = false;

export function suppressLocalGameSave(): void {
    isLocalSaveSuppressed = true;
}

export function resumeLocalGameSave(): void {
    isLocalSaveSuppressed = false;
}

export function isLocalGameSaveSuppressed(): boolean {
    return isLocalSaveSuppressed;
}

export function broadcastForceClear(): void {
    try {
        localStorage.setItem(FORCE_CLEAR_KEY, String(Date.now()));
    } catch {
        // ignore
    }
}

export function clearLocalGameSaves(): void {
    const legacyKeys = [
        // 현재 키
        SAVE_GAME_KEY,
        MANUAL_SAVE_KEY,
        // 레거시/이전 키 가능성
        'zenKoiGardenSaveData',
        'zenKoiGardenSaveData_v1',
        'zenPoints',
    ];

    legacyKeys.forEach((key) => localStorage.removeItem(key));

    // 혹시 버전 문자열이 다른 저장 키가 남아있어도 확실히 제거합니다.
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (!key) continue;

        if (key.startsWith('zenKoiGardenSaveData')) {
            localStorage.removeItem(key);
        }
    }
}
