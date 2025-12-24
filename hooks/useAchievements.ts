import { useState, useEffect, useCallback } from 'react';
import { Achievement, AchievementState, Koi } from '../types';
import { ACHIEVEMENTS, checkUnlockableAchievements } from '../utils/achievements';
import { addAP } from '../services/points'; // Direct import

export const useAchievements = (userId: string | undefined) => {
    const [state, setState] = useState<AchievementState>({
        unlockedIds: [],
        claimedIds: [],
        totalPoints: 0,
        lastChecked: Date.now(),
    });

    // Load from local storage on mount (User specific)
    useEffect(() => {
        if (!userId) return;
        const key = `koi_garden_achievements_${userId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setState(prev => ({
                    ...prev,
                    unlockedIds: parsed.unlockedIds || [],
                    claimedIds: parsed.claimedIds || [],
                    totalPoints: parsed.totalPoints || 0,
                }));
            } catch (e) {
                console.error("Failed to load achievements", e);
            }
        } else {
            // Reset if no data for this user
            setState({
                unlockedIds: [],
                claimedIds: [],
                totalPoints: 0,
                lastChecked: Date.now(),
            });
        }
    }, [userId]);

    // Save to local storage on change
    useEffect(() => {
        if (!userId) return;
        const key = `koi_garden_achievements_${userId}`;
        const dataToSave = {
            unlockedIds: state.unlockedIds,
            claimedIds: state.claimedIds,
            totalPoints: state.totalPoints,
        };
        localStorage.setItem(key, JSON.stringify(dataToSave));
    }, [state.unlockedIds, state.claimedIds, state.totalPoints, userId]);

    const checkAchievements = useCallback((kois: Koi[]) => {
        const newUnlocks = checkUnlockableAchievements(kois, state.unlockedIds);

        if (newUnlocks.length > 0) {
            const newIds = newUnlocks.map(a => a.id);
            setState(prev => ({
                ...prev,
                unlockedIds: [...prev.unlockedIds, ...newIds],
                lastChecked: Date.now(),
            }));

            // Optional: return new unlocks for notification toast
            return newUnlocks;
        }
        return [];
    }, [state.unlockedIds]);

    const claimReward = useCallback(async (achievementId: string, onRewardClaimed?: (reward: Achievement['reward']) => void) => {
        if (!userId) return; // Guard clause
        if (state.claimedIds.includes(achievementId)) return;
        if (!state.unlockedIds.includes(achievementId)) return;

        const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
        if (!achievement) return;

        // 1. Add Achievement Points (State Update)
        // Note: Actual points data is just stored in local storage state for now.

        // 2. Add Items (handled by callback in App.tsx)
        if (onRewardClaimed) {
            onRewardClaimed(achievement.reward);
        }

        const newTotalPoints = (state.totalPoints || 0) + achievement.reward.achievementPoints;

        setState(prev => ({
            ...prev,
            claimedIds: [...prev.claimedIds, achievementId],
            totalPoints: newTotalPoints
        }));

        // Sync to Firestore if user is online
        if (userId) {
            import('../services/firestore').then(({ updateUserGameData }) => {
                updateUserGameData(userId, { achievementPoints: newTotalPoints });
            }).catch(console.error);
        }
    }, [state.claimedIds, state.unlockedIds, state.totalPoints, userId]);

    // Sync total points to Firestore on mount/change to ensure consistency (Backfill)
    useEffect(() => {
        if (!userId || state.totalPoints === 0) return;
        const syncToCloud = async () => {
            // We can use a slight delay or just fire/forget
            try {
                const { updateUserGameData } = await import('../services/firestore');
                await updateUserGameData(userId, { achievementPoints: state.totalPoints });
            } catch (e) {
                console.error("Failed to backfill achievement points:", e);
            }
        };
        syncToCloud();
    }, [userId, state.totalPoints]); // Syncs whenever point count changes or user logs in

    const getAchievementStatus = useCallback((id: string) => {
        const isUnlocked = state.unlockedIds.includes(id);
        const isClaimed = state.claimedIds.includes(id);
        return { isUnlocked, isClaimed };
    }, [state.unlockedIds, state.claimedIds]);

    const hasUnclaimedRewards = state.unlockedIds.some(id => !state.claimedIds.includes(id));

    return {
        achievements: ACHIEVEMENTS,
        unlockedIds: state.unlockedIds,
        claimedIds: state.claimedIds,
        checkAchievements,
        claimReward,
        getAchievementStatus,
        hasUnclaimedRewards,
        totalPoints: state.totalPoints || 0
    };
};
