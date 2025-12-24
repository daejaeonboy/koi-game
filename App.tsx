/// <reference types="vite/client" />
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Pond } from './components/Pond';
import { ControlBar } from './components/ControlBar';
import { ShopModal } from './components/ShopModal';
import { KoiDetailModal } from './components/KoiDetailModal';
import { PondInfoModal } from './components/PondInfoModal';
import { SaveLoadModal } from './components/SaveLoadModal';
import { AccountModal } from './components/AccountModal';
// SettingsModal removed


import { breedKoi, calculateKoiValue, getPhenotype, GENE_COLOR_MAP, getDisplayColor, createFixedSpotPhenotypeGenes } from './utils/genetics';
import { useKoiPond, createInitialPonds } from './hooks/useKoiPond';
import { Koi, GeneType, KoiGenetics, GrowthStage, Ponds, Decoration, DecorationType, PondTheme, SavedGameState } from './types';
import { Wheat, DollarSign, ShoppingCart, Dna, Settings, User, X } from 'lucide-react';
import { audioManager } from './utils/audio';
import { ThemeModal } from './components/ThemeModal';
import { CleanConfirmModal } from './components/CleanConfirmModal';
import { SpotGeneticsDebugPanel } from './components/debug/SpotGeneticsDebugPanel';

// --- New Feature Imports ---
import { useAuth } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { startSession, listenToActiveDevice } from './services/session';
import { saveGameToCloud, loadUserDataOnce } from './services/sync';
import { SessionConflictModal } from './components/SessionConflictModal';
import { APDisplay } from './components/APDisplay';
import { AdRewardModal } from './components/AdRewardModal';
import { AdType, getAdReward, initializeAdMob, showRewardAd } from './services/ads';
import { listenToAPBalance, setAPBalance } from './services/points';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './services/firebase';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { MarketplaceModal } from './components/MarketplaceModal';
import { CreateListingModal } from './components/CreateListingModal';
import { ListingDetailModal } from './components/ListingDetailModal';
import { createListing, createListingAtomic, fetchUserActiveListings } from './services/marketplace';
import { MedicineConfirmModal } from './components/MedicineConfirmModal';
import { MarketplaceListing } from './types';
import { FORCE_CLEAR_KEY, SAVE_GAME_KEY, clearLocalGameSaves, suppressLocalGameSave } from './services/localSave';
import { ensureUserProfileNickname, updateUserNickname } from './services/profile';
import { RankingModal } from './components/RankingModal';
import { useAchievements } from './hooks/useAchievements';
import { AchievementModal } from './components/AchievementModal';

interface Animation {
  id: number;
  value?: number;
  feedAmount?: number;
  position: { x: number; y: number };
}

const BREEDING_COST = 300;
const FOOD_PACK_PRICE = 200;
const FOOD_PACK_AMOUNT = 50;
const CORN_PACK_PRICE = 500; // Premium food
const CORN_PACK_AMOUNT = 20; // Fewer quantity but 3x effect
const MEDICINE_PRICE = 3000;
const CLEANING_COST = 100;
const FOOD_LARGE_PACK_PRICE = 1000;
const FOOD_LARGE_PACK_AMOUNT = 250;
const CORN_LARGE_PACK_PRICE = 2500;
const CORN_LARGE_PACK_AMOUNT = 100;

const loadGameState = (): SavedGameState | null => {
  try {
    const savedData = localStorage.getItem(SAVE_GAME_KEY);
    if (savedData) {
      return JSON.parse(savedData);
    }
  } catch (error) {
    console.error("Failed to load game state:", error);
  }
  return null;
}

export const App: React.FC = () => {
  const [savedState] = useState(loadGameState);

  const {
    ponds,
    setPonds,
    activePondId,
    setActivePondId,
    koiList,
    addKois,
    removeKoi,
    updateKoiPositions,
    addPond,
    feedKoi,
    foodPellets,
    dropFood,
    feedAnimations,
    addDecoration,
    setPondTheme,
    resetPonds,
    handleFoodEaten,
    spawnKoi,
    cleanPond,
    consumeStamina,
    reduceWaterQuality,
    medicineCount,
    setMedicineCount,
    cureAllKoi,
    renameKoi,
    toggleKoiFavorite,
    moveKoi,
  } = useKoiPond(savedState ? { ponds: savedState.ponds, activePondId: savedState.activePondId } : undefined);

  const activePond = ponds[activePondId];
  const decorations = activePond?.decorations || [];
  const currentTheme = activePond?.theme || PondTheme.DEFAULT;
  const waterQuality = activePond?.waterQuality ?? 100;

  // ...

  // Modal States
  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isPondInfoModalOpen, setIsPondInfoModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);
  const [activeKoi, setActiveKoi] = useState<Koi | null>(null);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [isCleanConfirmOpen, setIsCleanConfirmOpen] = useState(false);
  const [isMedicineConfirmOpen, setIsMedicineConfirmOpen] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // --- New Feature States ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const { user, loading: authLoading, logout: logoutFromContext } = useAuth();

  // AP (Ad Points) State
  const [adPoints, setAdPoints] = useState(savedState?.adPoints ?? 400);
  const [isAdModalOpen, setIsAdModalOpen] = useState(false);
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adWatchProgress, setAdWatchProgress] = useState(0);

  // Marketplace State
  const [isMarketplaceOpen, setIsMarketplaceOpen] = useState(false);
  const [isCreateListingOpen, setIsCreateListingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<MarketplaceListing | null>(null);
  const [marketplaceRefreshKey, setMarketplaceRefreshKey] = useState(0);

  // Session & Sync State
  const [isConflictOpen, setIsConflictOpen] = useState(false);
  const [userNickname, setUserNickname] = useState<string>('');
  const [isCloudSyncReady, setIsCloudSyncReady] = useState(false);

  // Achievement System
  const {
    achievements,
    unlockedIds,
    claimedIds,
    checkAchievements,
    claimReward,
    hasUnclaimedRewards,
    totalPoints: achievementScore
  } = useAchievements(user?.uid);
  const [isAchievementModalOpen, setIsAchievementModalOpen] = useState(false);

  // Show achievement unlock notification
  useEffect(() => {
    if (user?.uid && koiList.length > 0) {
      const newUnlocks = checkAchievements(koiList);
      if (newUnlocks && newUnlocks.length > 0) {
        // Show notification for the first unlocked achievement in this batch
        setNotification({
          message: `🏆 업적 달성: ${newUnlocks[0].title}`,
          type: 'success'
        });
        audioManager.playSFX('click'); // Reuse existing SFX or add new one
      }
    }
  }, [koiList, user?.uid, checkAchievements]);

  const handleClaimReward = (id: string, reward: any) => {
    claimReward(id, (rewardContent) => {
      // Add items if present
      if (rewardContent.items) {
        rewardContent.items.forEach((item: any) => {
          if (item.type === 'corn') setCornCount(prev => prev + item.count);
          if (item.type === 'medicine') setMedicineCount(prev => prev + item.count);
        });
      }
      const itemsText = rewardContent.items
        ? rewardContent.items.map((i: any) => i.type === 'corn' ? `옥수수 ${i.count}개` : `${i.type} ${i.count}개`).join(', ')
        : '';
      setNotification({
        message: `보상 획득! 업적 포인트 ${rewardContent.achievementPoints}점${itemsText ? `, ${itemsText}` : ''}`,
        type: 'success'
      });
      audioManager.playSFX('coin');
    });
  };
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMarketplaceOperationPending = useRef(false);
  const feedingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const feedingDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPointerPosRef = useRef<{ x: number, y: number } | null>(null);
  const [zenPoints, setZenPoints] = useState(savedState?.zenPoints ?? (import.meta.env.DEV ? 10000 : 2000));
  const [isFeedModeActive, setIsFeedModeActive] = useState(false);
  const [breedingSelection, setBreedingSelection] = useState<string[]>([]);
  const [honorPoints, setHonorPoints] = useState(savedState?.honorPoints ?? 0);
  const [sellAnimations, setSellAnimations] = useState<Animation[]>([]);
  const [foodDropAnimations, setFoodDropAnimations] = useState<Animation[]>([]);

  // Item Counts
  const [foodCount, setFoodCount] = useState(savedState?.foodCount ?? 20);
  const [cornCount, setCornCount] = useState(savedState?.cornCount ?? 0);

  const [selectedFoodType, setSelectedFoodType] = useState<'normal' | 'corn' | 'medicine'>('normal');
  const [koiNameCounter, setKoiNameCounter] = useState(savedState?.koiNameCounter ?? 3);
  const [isMuted, setIsMuted] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'info' | 'error' } | null>(null);

  // Latest state refs for interval access
  const latestFoodCountsRef = useRef({ food: foodCount, corn: cornCount, type: selectedFoodType });
  useEffect(() => {
    latestFoodCountsRef.current = { food: foodCount, corn: cornCount, type: selectedFoodType };
  }, [foodCount, cornCount, selectedFoodType]);

  // Clear notification after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Clear feeding interval on unmount or mode change
  useEffect(() => {
    return () => {
      if (feedingIntervalRef.current) clearInterval(feedingIntervalRef.current);
      if (feedingDelayTimeoutRef.current) clearTimeout(feedingDelayTimeoutRef.current);
      feedingIntervalRef.current = null;
      feedingDelayTimeoutRef.current = null;
    };
  }, [isFeedModeActive]);

  // Initialize audio on first interaction
  useEffect(() => {
    const initAudio = () => {
      audioManager.init();
      audioManager.playBGM();
      window.removeEventListener('click', initAudio);
    };
    window.addEventListener('click', initAudio);

    // Handle background audio (Mobile/Tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        audioManager.suspend();
      } else {
        audioManager.resume();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('click', initAudio);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // --- Effects for New Features ---

  // Initialize AdMob
  useEffect(() => {
    initializeAdMob();
  }, []);

  // Auth check
  useEffect(() => {
    if (!authLoading && !user) {
      setIsAuthModalOpen(true);
    }
  }, [user, authLoading]);

  // Handle cross-tab logout/clear
  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FORCE_CLEAR_KEY) return;
      if (!event.newValue) return;
      suppressLocalGameSave();
      clearLocalGameSaves();
      window.location.reload();
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // AP balance와 Nickname은 initSession에서 통합 로드됨
  // 로그아웃 시 초기화만 처리
  useEffect(() => {
    if (!user) {
      setAdPoints(0);
      setUserNickname('');
    }
  }, [user]);

  const resolvedUserNickname = useMemo(() => {
    const fromProfile = userNickname.trim();
    if (fromProfile) return fromProfile;
    const fromAuthDisplayName = user?.displayName?.trim();
    if (fromAuthDisplayName) return fromAuthDisplayName;
    const fromEmail = user?.email?.split('@')?.[0]?.trim();
    if (fromEmail) return fromEmail;
    return 'User';
  }, [userNickname, user]);

  // Ref to hold latest state for periodic saving
  const gameStateRef = useRef<SavedGameState | null>(null);

  useEffect(() => {
    gameStateRef.current = {
      ponds,
      activePondId,
      zenPoints,
      adPoints,
      foodCount,
      cornCount,
      medicineCount,
      honorPoints,
      koiNameCounter,
    };
  }, [ponds, activePondId, zenPoints, adPoints, foodCount, cornCount, medicineCount, honorPoints, koiNameCounter]);

  // Periodic Save (Every 5 seconds) to prevent excessive writes
  useEffect(() => {
    const saveInterval = setInterval(() => {
      if (gameStateRef.current) {
        try {
          localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameStateRef.current));
        } catch (error) {
          console.error("Failed to save game state:", error);
        }
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, []);

  // Session & Cloud Sync Logic (통합 최적화: 모든 사용자 데이터를 병렬로 1회 로드)
  useEffect(() => {
    let unsubscribeSession: (() => void) | undefined;
    let unsubscribeAP: (() => void) | undefined;
    let cancelled = false;

    const initSession = async () => {
      let cloudReady = false;
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      if (!user) {
        setIsCloudSyncReady(false);
        return;
      }
      setIsCloudSyncReady(false);
      try {
        // 병렬 실행: 세션 시작 + 사용자 데이터 통합 로드
        const [, userData] = await Promise.all([
          startSession(user.uid),
          loadUserDataOnce(user.uid)
        ]);
        if (cancelled) return;

        // 통합 데이터에서 한번에 설정
        if (userData) {
          if (userData.gameData) handleLoadGame(userData.gameData);
          if (userData.nickname) setUserNickname(userData.nickname);
          setAdPoints(userData.ap);
        }

        // 실시간 구독 설정 (이후 변경사항 감지용)
        unsubscribeSession = listenToActiveDevice(user.uid, () => {
          setIsConflictOpen(true);
        });
        unsubscribeAP = listenToAPBalance(user.uid, setAdPoints);

        cloudReady = true;
      } catch (error) {
        if (!cancelled) console.error("Session init failed:", error);
      } finally {
        if (!cancelled) setIsCloudSyncReady(cloudReady);
      }
    };

    initSession();
    return () => {
      cancelled = true;
      if (unsubscribeSession) unsubscribeSession();
      if (unsubscribeAP) unsubscribeAP();
    };
  }, [user]);

  // Periodic Save (Cloud + Local)
  useEffect(() => {
    const saveInterval = setInterval(async () => {
      if (!gameStateRef.current) return;

      // Local Save
      try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(gameStateRef.current));
      } catch (error: any) { console.error("Local save failed:", error); }

      // Cloud Save (Only if logged in and ready)
      if (user && isCloudSyncReady) {
        if (isMarketplaceOperationPending.current) {
          console.log('[Marketplace] Periodic cloud save skipped due to pending operation.');
          return;
        }
        try {
          await saveGameToCloud(user.uid, gameStateRef.current);
        } catch (error: any) {
          if (error.code !== 'unavailable') {
            console.error("Cloud save failed:", error);
          }
        }
      }
    }, 5000);

    return () => clearInterval(saveInterval);
  }, [user, isCloudSyncReady]);

  // --- Koi Claimer Effect ---
  // 구매하거나 취소되어 root 'kois' 필드에 들어온 잉어를 안전하게 연못으로 수령합니다.
  useEffect(() => {
    if (!user || !isCloudSyncReady) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (snap) => {
      if (!snap.exists()) return;
      const userData = snap.data();
      const claimableKois = userData.kois as Koi[] | undefined;

      if (claimableKois && claimableKois.length > 0) {
        console.log(`[Claimer] ${claimableKois.length} claimable koi(s) found! Moving to pond...`);

        // 1. 현재 연못 상태 업데이트
        const activePond = ponds[activePondId];
        if (activePond) {
          const updatedPonds: Ponds = {
            ...ponds,
            [activePondId]: {
              ...activePond,
              kois: [...activePond.kois, ...claimableKois]
            }
          };
          setPonds(updatedPonds);
          setNotification({ message: `${claimableKois.length}마리의 잉어를 수령했습니다!`, type: 'success' });

          // 2. 서버의 root 'kois' 필드 비우기 (중복 수령 방지)
          try {
            await setDoc(userRef, { kois: [] }, { merge: true });
            console.log('[Claimer] Server claimed kois cleared successfully.');

            // 3. 즉시 저장 (데이터 유실 방지)
            const stateToSave: SavedGameState = {
              ...gameStateRef.current!,
              ponds: updatedPonds
            };
            localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(stateToSave));
            await saveGameToCloud(user.uid, stateToSave);
          } catch (error: any) {
            console.error('[Claimer] Failed to clear claimed kois or sync:', error);
          }
        }
      }
    });

    return () => unsubscribe();
  }, [user, isCloudSyncReady, ponds, activePondId]);

  // --- Shadow Koi Cleanup ---
  // 등록 중 오류가 발생하여 등록은 되었으나 연못에서 안 사라진 경우를 대비한 2차 보정
  useEffect(() => {
    if (!user || !isCloudSyncReady || isMarketplaceOperationPending.current) return;

    const unsubscribe = fetchUserActiveListings(user.uid, (listings) => {
      const activeListingKoiIds = new Set(listings.map(l => l.koiData.id));

      let hasShadowKoi = false;
      Object.values(ponds).forEach(pond => {
        if (pond.kois.some(koi => activeListingKoiIds.has(koi.id))) {
          hasShadowKoi = true;
        }
      });

      if (hasShadowKoi) {
        console.log('[Marketplace] Shadow koi detected. Cleaning up pond automatically...');
        setPonds(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(pondId => {
            const pond = next[pondId];
            const filteredKois = pond.kois.filter(koi => !activeListingKoiIds.has(koi.id));
            if (pond.kois.length !== filteredKois.length) {
              next[pondId] = { ...pond, kois: filteredKois };
            }
          });

          // 보정된 상태를 ref에 즉시 반영
          gameStateRef.current = {
            ...gameStateRef.current!,
            ponds: next
          };

          return next;
        });
      }
    });

    return () => unsubscribe();
  }, [user, isCloudSyncReady, ponds]);

  const handleSaveNickname = useCallback(async (nickname: string) => {
    if (!user) return;
    const trimmed = nickname.trim();
    await updateUserNickname(user.uid, trimmed);
    setUserNickname(trimmed);
    setNotification({ message: '닉네임이 저장되었습니다.', type: 'success' });
  }, [user]);

  // Ad watching handler - 임시 시스템: 15초 후 200 AP 지급 (에드센스 승인 전)
  const handleWatchAd = async (_adType: AdType) => {
    setIsWatchingAd(true);

    try {
      // 15초 대기 (mock 광고 시청 시뮬레이션)
      const success = await showRewardAd();

      setIsWatchingAd(false);

      if (success) {
        const rewardAmount = 200; // 고정 200 AP

        // 로컬 상태 즉시 업데이트 (로그인 여부와 관계없이)
        setAdPoints(prev => prev + rewardAmount);
        setNotification({ message: `+${rewardAmount} AP 획득!`, type: 'success' });
        setIsAdModalOpen(false);

        // 로그인 상태면 Firestore에도 즉시 저장 (백그라운드에서)
        if (user) {
          try {
            const userRef = doc(db, 'users', user.uid);
            const snap = await getDoc(userRef);
            const currentAp = snap.exists() ? (snap.data()?.ap ?? 0) : 0;
            await setDoc(userRef, { ap: currentAp + rewardAmount }, { merge: true });
          } catch (e) {
            console.error('Failed to sync AP to cloud:', e);
            // 실패해도 로컬 상태는 이미 업데이트됨
          }
        }
      } else {
        setNotification({ message: '광고 시청이 완료되지 않았습니다.', type: 'error' });
      }
    } catch (error) {
      console.error('Ad watch failed:', error);
      setIsWatchingAd(false);
      setNotification({ message: '광고 로드 실패', type: 'error' });
    }
  };


  // Marketplace Handlers
  const handleRenameKoi = (koiId: string, nextName: string) => {
    renameKoi(koiId, nextName);
  };

  const handleListingCreated = async (koiId: string, listingFee: number) => {
    console.log('[Marketplace] Listing created atomically. Updating local state and pausing sync...');
    isMarketplaceOperationPending.current = true; // 자동 저장 일시 중지

    // 등록 비용 차감 (로컬 + Firestore 동시 업데이트)
    const nextAP = Math.max(0, adPoints - listingFee);
    setAdPoints(nextAP);

    // Firestore에도 즉시 동기화 (리스너가 덮어쓰지 않도록)
    if (user) {
      try {
        await setAPBalance(user.uid, nextAP);
      } catch (e) {
        console.error('Failed to sync AP deduction to cloud:', e);
      }
    }

    setPonds(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(pondId => {
        next[pondId] = {
          ...next[pondId],
          kois: next[pondId].kois.filter(k => k.id !== koiId)
        };
      });

      // 즉시 ref 업데이트하여 다음 주기 저장 방지
      gameStateRef.current = {
        ...gameStateRef.current!,
        ponds: next
      };

      return next;
    });

    setMarketplaceRefreshKey(prev => prev + 1);
    setNotification({ message: `잉어를 장터에 등록했습니다! (등록비 ${listingFee} AP)`, type: 'success' });

    // 3초 후 자동 저장 재개
    setTimeout(() => {
      isMarketplaceOperationPending.current = false;
      console.log('[Marketplace] Resuming periodic saves after listing created.');
    }, 3000);
  };

  const handleBuySuccess = async (koi?: Koi) => {
    console.log('[Marketplace] Buy success. Refreshing marketplace and pausing sync...');
    isMarketplaceOperationPending.current = true;

    setMarketplaceRefreshKey(prev => prev + 1);
    setSelectedListing(null);
    audioManager.playSFX('purchase');
    setNotification({ message: `입양 절차가 진행 중입니다. 잠시만 기다려주세요.`, type: 'info' });

    setTimeout(() => {
      isMarketplaceOperationPending.current = false;
    }, 3000);
  };

  const handleCancelSuccess = async (koi: Koi) => {
    console.log('[Marketplace] Cancel success. Refreshing marketplace and pausing sync...');
    isMarketplaceOperationPending.current = true;

    setMarketplaceRefreshKey(prev => prev + 1);
    setSelectedListing(null);
    setNotification({ message: '판매 취소 요청이 완료되었습니다.', type: 'info' });

    setTimeout(() => {
      isMarketplaceOperationPending.current = false;
    }, 3000);
  };

  const handleCleanPond = () => {
    const activePond = ponds[activePondId];
    if ((activePond?.waterQuality ?? 100) >= 100) {
      setNotification({ message: '수질이 이미 깨끗합니다!', type: 'error' });
      return;
    }
    setIsCleanConfirmOpen(true);
  };

  const confirmCleanPond = async () => {
    if (adPoints < CLEANING_COST) {
      setNotification({ message: `AP가 부족합니다! (${CLEANING_COST.toLocaleString()} AP 필요)`, type: 'error' });
      setIsCleanConfirmOpen(false);
      return;
    }

    // AP 차감 (로컬 + Firestore 동시 업데이트)
    const nextAP = adPoints - CLEANING_COST;
    setAdPoints(nextAP);

    // Firestore에도 즉시 동기화 (리스너가 덮어쓰지 않도록)
    if (user) {
      try {
        await setAPBalance(user.uid, nextAP);
      } catch (e) {
        console.error('Failed to sync AP deduction to cloud:', e);
      }
    }

    audioManager.playSFX('click');
    cleanPond();
    setNotification({ message: '연못을 청소했습니다!', type: 'success' });
    setIsCleanConfirmOpen(false);
  };

  const confirmUseMedicine = () => {
    if ((medicineCount || 0) <= 0) return;

    cureAllKoi();
    setMedicineCount(c => Math.max(0, (c || 0) - 1));
    audioManager.playSFX('purchase');
    setNotification({ message: `모든 코이에게 치료제를 사용했습니다.`, type: 'success' });
    setIsMedicineConfirmOpen(false);
  };

  const handleNewGame = async (): Promise<boolean> => {
    if (!window.confirm("정말 새 게임을 시작하시겠습니까? 현재 진행 상황이 모두 사라집니다.")) return false;

    const initialState: SavedGameState = {
      ponds: createInitialPonds(),
      activePondId: 'pond-1',
      zenPoints: import.meta.env.DEV ? 10000 : 2000,
      adPoints: 400,
      foodCount: 20,
      cornCount: 0,
      medicineCount: 0,
      honorPoints: 0,
      koiNameCounter: 3,
    };

    if (user) {
      // 로그인 상태: 클라우드에 즉시 초기화 상태 저장 및 AP 리셋
      try {
        await Promise.all([
          saveGameToCloud(user.uid, initialState),
          setAPBalance(user.uid, 400)
        ]);
      } catch (error) {
        console.error("Failed to reset cloud game state or AP:", error);
        if (!window.confirm("클라우드 초기화에 실패했습니다. 그래도 진행하시겠습니까? (다시 로드될 가능성이 있습니다)")) {
          return false;
        }
      }
    }

    localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(initialState));
    localStorage.removeItem('zenPoints'); // legacy cleanup

    // 리로드하여 전체 상태를 깨끗하게 반영
    window.location.reload();
    return true;
  };

  const handleLogoutCleanup = () => {
    setZenPoints(2000);
    setAdPoints(400);
    resetPonds();
  };

  const handleLoadGame = (loadedState: SavedGameState) => {
    setPonds(loadedState.ponds);
    setActivePondId(loadedState.activePondId);
    setZenPoints(loadedState.zenPoints);
    setFoodCount(loadedState.foodCount);
    setCornCount(loadedState.cornCount || 0);
    setMedicineCount(loadedState.medicineCount || 0);
    setHonorPoints(loadedState.honorPoints || 0);
    setKoiNameCounter(loadedState.koiNameCounter);
    setNotification({ message: "게임을 불러왔습니다.", type: 'success' });
  };

  const handleUpdateKoi = (koiId: string, updates: { genetics?: Partial<KoiGenetics>; growthStage?: GrowthStage }) => {
    setPonds((prev: Ponds) => {
      const activePond = prev[activePondId];
      if (!activePond) return prev;

      const updatedKois = activePond.kois.map(k => {
        if (k.id === koiId) {
          return {
            ...k,
            genetics: updates.genetics ? { ...k.genetics, ...updates.genetics } : k.genetics,
            growthStage: updates.growthStage !== undefined ? updates.growthStage : k.growthStage,
            // Update size if growth stage changed
            size: updates.growthStage === GrowthStage.FRY ? 4 : (updates.growthStage === GrowthStage.JUVENILE ? 8 : 12),
          };
        }
        return k;
      });

      return {
        ...prev,
        [activePondId]: { ...activePond, kois: updatedKois }
      };
    });
    setNotification({ message: '코이 정보가 업데이트되었습니다.', type: 'success' });
  };

  const handleSell = useCallback((koi: Koi) => {
    if (koiList.length <= 2) {
      setNotification({ message: '연못에는 최소 두 마리의 코이가 있어야 합니다!', type: 'error' });
      return;
    }

    const value = calculateKoiValue(koi);
    setZenPoints(prev => prev + value);
    audioManager.playSFX('coin');

    const animId = Date.now();
    setSellAnimations(prev => [...prev, { id: animId, value, position: koi.position }]);
    setTimeout(() => {
      setSellAnimations(prev => prev.filter(a => a.id !== animId));
    }, 1500);

    removeKoi(koi.id);
  }, [removeKoi, koiList.length]);

  const handleSellSelected = useCallback((kois: Koi[]) => {
    // Restriction: Ensure at least 2 koi remain
    if (koiList.length - kois.length < 2) {
      setNotification({ message: '연못에는 최소 두 마리의 코이가 있어야 합니다!', type: 'error' });
      return;
    }

    let totalValue = 0;
    kois.forEach(koi => {
      totalValue += calculateKoiValue(koi);
      removeKoi(koi.id);
    });
    setZenPoints(prev => prev + totalValue);
    audioManager.playSFX('coin');
  }, [removeKoi, setZenPoints, koiList.length]);

  const handleBreedKois = useCallback((parents: Koi[]) => {
    if (parents.length !== 2) return;
    if (zenPoints < BREEDING_COST) {
      setNotification({ message: '젠 포인트가 부족합니다!', type: 'error' });
      return;
    }

    const hasNonAdult = parents.some(k => k.growthStage !== GrowthStage.ADULT);
    if (hasNonAdult) {
      setNotification({ message: '성체 코이만 교배할 수 있습니다.', type: 'error' });
      return;
    }

    // Check Pond Capacity
    if (koiList.length >= 30) {
      setNotification({ message: '연못이 가득 찼습니다! (최대 30마리)', type: 'error' });
      return;
    }

    const parent1 = parents[0];
    const parent2 = parents[1];

    // Check Stamina
    if ((parent1.stamina ?? 0) < 30 || (parent2.stamina ?? 0) < 30) {
      setNotification({ message: '부모 코이의 체력이 부족합니다! (최소 30 필요)', type: 'error' });
      return;
    }

    setZenPoints(p => p - BREEDING_COST);
    activePond && consumeStamina([parent1.id, parent2.id], 30); // Consume 30 stamina
    reduceWaterQuality(4);
    audioManager.playSFX('breed');

    const newKois: Koi[] = [];
    let currentCounter = koiNameCounter;

    const offspringCount = Math.floor(Math.random() * 2) + 2; // 2 to 3
    for (let i = 0; i < offspringCount; i++) {
      const breedResult = breedKoi(parent1.genetics, parent2.genetics);
      const newKoi: Koi = {
        id: crypto.randomUUID(),
        name: `코이`,
        description: `${parent1.name}와 ${parent2.name}의 자손`,
        genetics: breedResult.genetics,
        position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
        velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
        age: 0,
        growthStage: GrowthStage.FRY,
        timesFed: 0,
        foodTargetId: null,
        feedCooldownUntil: null,
        stamina: 100,
      };
      newKois.push(newKoi);
      currentCounter++;
    }

    setKoiNameCounter(currentCounter);
    addKois(newKois);
    // No notification
    audioManager.playSFX('purchase');
  }, [zenPoints, koiList.length, koiNameCounter, addKois, setZenPoints, setNotification, audioManager, setKoiNameCounter, consumeStamina, activePond]);

  const handleMultiParentBreed = () => {
    const selectedKois = koiList.filter(k => breedingSelection.includes(k.id));
    handleBreedKois(selectedKois);
    setBreedingSelection([]);
  };



  const buySpecialKoi = (genes: [GeneType, GeneType], cost: number, typeName: string) => {
    if (zenPoints < cost) return;

    if (koiList.length >= 30) {
      setNotification({ message: '연못이 가득 찼습니다! (최대 30마리)', type: 'error' });
      return;
    }

    setZenPoints(p => p - cost);
    audioManager.playSFX('purchase');
    setIsShopModalOpen(false);

    const newGenetics: KoiGenetics = {
      baseColorGenes: genes,
      spots: [],
      lightness: 50, // User Request: Force 50 (Standard)
      saturation: 50, // User Request: Force 50 (Standard)
      spotPhenotypeGenes: createFixedSpotPhenotypeGenes(50), // Standard Saturation
    };

    const newKoi: Koi = {
      id: `${typeName}-${Date.now()}`,
      name: `코이`,
      description: `상점에서 구매한 특별한 ${typeName} 코이입니다.`,
      genetics: newGenetics,
      position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
      velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
      age: 50, // Shop kois are juveniles
      growthStage: GrowthStage.JUVENILE,
      timesFed: 0,
      foodTargetId: null,
      feedCooldownUntil: null,
      stamina: 100,
    };
    addKois([newKoi]);
    setKoiNameCounter(c => c + 1);
  }

  const handleBuyPondExpansion = () => {
    const cost = 20000;
    if (zenPoints < cost) return;
    setZenPoints(p => p - cost);
    audioManager.playSFX('purchase');
    addPond();
    setIsShopModalOpen(false);
  }

  const handleBuyFood = (quantity: number) => {
    const cost = FOOD_PACK_PRICE * quantity;
    if (zenPoints < cost) return;
    setZenPoints(p => prevZen(p, cost));
    audioManager.playSFX('purchase');
    setFoodCount(c => c + (FOOD_PACK_AMOUNT * quantity));
    setIsShopModalOpen(false);
  }

  const handleBuyFoodLarge = (quantity: number) => {
    const cost = FOOD_LARGE_PACK_PRICE * quantity;
    if (zenPoints < cost) return;
    setZenPoints(p => prevZen(p, cost));
    audioManager.playSFX('purchase');
    setFoodCount(c => c + (FOOD_LARGE_PACK_AMOUNT * quantity));
    setIsShopModalOpen(false);
  }

  const handleBuyCorn = (quantity: number) => {
    const cost = CORN_PACK_PRICE * quantity;
    if (zenPoints < cost) return;
    setZenPoints(p => prevZen(p, cost));
    audioManager.playSFX('purchase');
    setCornCount(c => c + (CORN_PACK_AMOUNT * quantity));
    setIsShopModalOpen(false);
  }

  const handleBuyCornLarge = (quantity: number) => {
    const cost = CORN_LARGE_PACK_PRICE * quantity;
    if (zenPoints < cost) return;
    setZenPoints(p => prevZen(p, cost));
    audioManager.playSFX('purchase');
    setCornCount(c => c + (CORN_LARGE_PACK_AMOUNT * quantity));
    setIsShopModalOpen(false);
  }

  // Helper for zen points deduction
  const prevZen = (p: number, cost: number) => Math.max(0, p - cost);

  const handleBuyMedicine = (quantity: number) => {
    const cost = MEDICINE_PRICE * quantity;
    if (zenPoints < cost) return;
    setZenPoints(p => p - cost);
    audioManager.playSFX('purchase');
    setMedicineCount(c => (c || 0) + quantity);
    setIsShopModalOpen(false);
  }

  const handleBuyTrophy = useCallback(async (quantity: number) => {
    const totalCost = 100000 * quantity;
    if (zenPoints < totalCost) {
      setNotification({ message: '젠 포인트가 부족합니다!', type: 'error' });
      return;
    }

    // 상태 업데이트
    const nextZenPoints = zenPoints - totalCost;
    const nextHonorPoints = (honorPoints || 0) + quantity;

    setZenPoints(nextZenPoints);
    setHonorPoints(nextHonorPoints);
    audioManager.playSFX('purchase');
    setNotification({ message: `명예 트로피 ${quantity}개를 구매했습니다!`, type: 'success' });

    // 즉시 클라우드 동기화 시도
    if (user && isCloudSyncReady && gameStateRef.current) {
      try {
        const immediateState: SavedGameState = {
          ...gameStateRef.current,
          zenPoints: nextZenPoints,
          honorPoints: nextHonorPoints
        };
        await saveGameToCloud(user.uid, immediateState);
      } catch (e) {
        console.error("Immediate cloud sync failed:", e);
      }
    }
  }, [zenPoints, honorPoints, user, isCloudSyncReady]);

  const handleBuyKoi = (color: GeneType) => {
    let price = 30000;
    if (color === GeneType.CREAM) {
      price = 500;
    }

    if (zenPoints < price) {
      setNotification({ message: '젠 포인트가 부족합니다!', type: 'error' });
      // audioManager.playSFX('error'); // 'error' type not exists
      return;
    }

    if (koiList.length >= 30) {
      setNotification({ message: '연못이 가득 찼습니다! (최대 30마리)', type: 'error' });
      return;
    }
    setZenPoints(p => p - price);
    audioManager.playSFX('purchase');
    spawnKoi(color);
    setNotification({ message: '새로운 코이가 연못에 도착했습니다!', type: 'success' });
    setIsShopModalOpen(false);
  }



  const handlePondPointerDown = useCallback((event: React.PointerEvent<HTMLElement> | React.MouseEvent<HTMLElement>, koi?: Koi) => {
    // Feed Mode Logic
    if (isFeedModeActive) {
      if (selectedFoodType === 'medicine') {
        if ((medicineCount || 0) <= 0) {
          setNotification({ message: '치료제가 없습니다!', type: 'error' });
          return;
        }
        setIsMedicineConfirmOpen(true);
      } else {
        // Food Logic (Normal / Corn)
        if (!koi) {
          const stopFeeding = () => {
            if (feedingIntervalRef.current) {
              clearInterval(feedingIntervalRef.current);
              feedingIntervalRef.current = null;
            }
            if (feedingDelayTimeoutRef.current) {
              clearTimeout(feedingDelayTimeoutRef.current);
              feedingDelayTimeoutRef.current = null;
            }
          };

          const executeDrop = (x: number, y: number, feedAmount: number) => {
            audioManager.playSFX('plop');
            dropFood({ x, y }, feedAmount);
            const dropAnimId = Date.now();
            setFoodDropAnimations(p => [...p, { id: dropAnimId, position: { x, y } }]);
            setTimeout(() => {
              setFoodDropAnimations(p => p.filter(a => a.id !== dropAnimId));
            }, 1000);
          };

          const dropSingleFood = (x: number, y: number) => {
            const { food, corn, type } = latestFoodCountsRef.current;

            if (type === 'corn') {
              if (corn <= 0) {
                stopFeeding();
                return;
              }
              setCornCount(prev => prev - 1);
              // Update ref immediately for interval consistency
              latestFoodCountsRef.current.corn -= 1;
              executeDrop(x, y, 2);
            } else if (type === 'normal') {
              if (food <= 0) {
                stopFeeding();
                return;
              }
              setFoodCount(prev => prev - 1);
              // Update ref immediately for interval consistency
              latestFoodCountsRef.current.food -= 1;
              executeDrop(x, y, 1);
            }
          };

          const pondRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
          const x = ((event.clientX - pondRect.left) / pondRect.width) * 100;
          const y = ((event.clientY - pondRect.top) / pondRect.height) * 100;
          lastPointerPosRef.current = { x, y };

          // Drop first pellet immediately
          dropSingleFood(x, y);

          // Start continuous dropping after a short delay (long press detection)
          if (!feedingIntervalRef.current && !feedingDelayTimeoutRef.current) {
            feedingDelayTimeoutRef.current = setTimeout(() => {
              feedingIntervalRef.current = setInterval(() => {
                if (lastPointerPosRef.current) {
                  dropSingleFood(lastPointerPosRef.current.x, lastPointerPosRef.current.y);
                }
              }, 100); // 100ms interval for faster feeding
            }, 250); // 250ms delay before continuous feeding starts
          }
        } else {
          setIsFeedModeActive(false);
        }
      }
    }

    // Selection Logic
    if (koi && !(isFeedModeActive && selectedFoodType === 'medicine')) {
      audioManager.playSFX('click');
      if (breedingSelection.includes(koi.id)) {
        setBreedingSelection(prev => prev.filter(id => id !== koi.id));
      } else {
        setBreedingSelection(prev => [...prev, koi.id]);
      }
    } else if (!koi) {
      setBreedingSelection([]);
    }
  }, [isFeedModeActive, breedingSelection, foodCount, cornCount, medicineCount, selectedFoodType, dropFood, audioManager, setNotification, setFoodDropAnimations]);

  const handlePondPointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (feedingIntervalRef.current) {
      const pondRect = event.currentTarget.getBoundingClientRect();
      const x = ((event.clientX - pondRect.left) / pondRect.width) * 100;
      const y = ((event.clientY - pondRect.top) / pondRect.height) * 100;
      lastPointerPosRef.current = { x, y };
    }
  }, []);

  const handlePondPointerUp = useCallback(() => {
    if (feedingIntervalRef.current) {
      clearInterval(feedingIntervalRef.current);
      feedingIntervalRef.current = null;
    }
    if (feedingDelayTimeoutRef.current) {
      clearTimeout(feedingDelayTimeoutRef.current);
      feedingDelayTimeoutRef.current = null;
    }
    lastPointerPosRef.current = null;
  }, []);

  const handleToggleFeedMode = () => {
    setBreedingSelection([]);
    setIsFeedModeActive(prev => !prev);
    audioManager.playSFX('click');
  }

  const handleToggleMute = () => {
    const muted = audioManager.toggleMute();
    setIsMuted(muted);
  }

  const selectedKoisForBreeding = useMemo(() =>
    koiList.filter(k => breedingSelection.includes(k.id)),
    [koiList, breedingSelection]
  );

  const canBreed = useMemo(() => {
    if (breedingSelection.length !== 2 || zenPoints < BREEDING_COST) return false;
    const hasNonAdult = selectedKoisForBreeding.some(k => k.growthStage !== GrowthStage.ADULT);
    const hasLowStamina = selectedKoisForBreeding.some(k => (k.stamina ?? 0) < 30);
    return !hasNonAdult && !hasLowStamina;
  }, [breedingSelection, selectedKoisForBreeding, zenPoints]);

  const totalSellValue = useMemo(() => {
    return selectedKoisForBreeding.reduce((sum, koi) => sum + calculateKoiValue(koi), 0);
  }, [selectedKoisForBreeding]);

  return (
    <div className="relative w-full h-[100svh] bg-gray-900 overflow-hidden select-none font-sans flex flex-col">
      <main
        className="flex-grow relative overflow-hidden touch-none"
      >
        <div
          className="w-full h-full"
        >
          <Pond
            gameState={'playing'}
            koiList={koiList}
            decorations={decorations}
            theme={currentTheme}
            onKoiClick={(e, koi) => {
              handlePondPointerDown(e, koi);
            }}
            onBackgroundClick={(e) => {
              handlePondPointerDown(e);
            }}
            onPointerMove={handlePondPointerMove}
            onPointerUp={handlePondPointerUp}
            isFeedModeActive={isFeedModeActive}
            updateKoiPositions={updateKoiPositions}
            isSellModeActive={false} // No separate sell mode currently
            breedingSelection={breedingSelection}
            sellAnimations={sellAnimations}
            feedAnimations={feedAnimations}
            foodDropAnimations={foodDropAnimations}
            foodPellets={foodPellets}
            onFoodEaten={handleFoodEaten}
            isNight={false}
            waterQuality={waterQuality}
          />
        </div>
      </main>

      {/* Notification Toast */}
      {
        notification && (
          <div
            className={`absolute top-10 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-xl font-bold transition-all duration-300 ${notification.type === 'error'
              ? 'bg-white text-red-600 border-2 border-red-600'
              : 'bg-white text-black border border-gray-300'
              }`}
          >
            {notification.message}
          </div>
        )
      }

      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] left-4 z-20 flex flex-col gap-2">
        <div className="bg-gray-900/60 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50 min-w-[140px]">
          <p className="text-lg font-bold text-yellow-300">{zenPoints.toLocaleString()} ZP</p>
        </div>

        {/* Ad Point Display */}
        <APDisplay
          ap={adPoints}
          onAdClick={() => setIsAdModalOpen(true)}
        />

        {/* Water Quality Indicator - Interactive */}
        <div className="bg-gray-900/60 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50 flex items-center gap-2 min-w-[140px]">
          <div className="flex flex-col items-start leading-none">
            <span className="text-[10px] text-gray-400">수질</span>
            <span className={`text-sm font-bold ${waterQuality < 50 ? 'text-red-400' : 'text-white'}`}>
              {Math.round(waterQuality)}%
            </span>
          </div>
          <button
            onClick={handleCleanPond}
            className="ml-auto text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-2 py-1 rounded transition-colors"
          >
            + 청소
          </button>
        </div>
      </div>

      <div className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-20 flex items-center gap-2">
        <button
          onClick={() => setIsSaveLoadModalOpen(true)}
          className="bg-gray-900/40 backdrop-blur-sm p-3 rounded-full border border-white/10 text-white hover:text-yellow-400 transition-colors hover:bg-gray-800/60 hover:border-white/20"
          aria-label="설정 메뉴"
          title="설정 메뉴 (저장/불러오기/새 게임)"
        >
          <Settings size={22} strokeWidth={1.5} />
        </button>

        {/* Profile Section - Unified Circular Icon Only */}
        <button
          onClick={() => {
            if (!user) setIsAuthModalOpen(true);
            else setIsAccountModalOpen(true);
          }}
          className="bg-gray-900/40 backdrop-blur-sm p-0 rounded-full border border-white/10 text-white hover:text-yellow-400 transition-colors hover:bg-gray-800/60 hover:border-white/20 w-[46px] h-[46px] overflow-hidden flex items-center justify-center group shadow-xl ml-1"
          title={user ? `${user.displayName || userNickname || '게스트'} 님` : '클릭하여 로그인'}
        >
          {user && user.photoURL ? (
            <img
              src={user.photoURL.replace(/^http:\/\//i, 'https://')}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 group-hover:text-yellow-400 bg-gray-900/40">
              <User size={24} strokeWidth={1.5} />
            </div>
          )}
        </button>
      </div>

      {
        breedingSelection.length > 0 && (
          <div className="absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-full max-w-xs px-4">

            {/* Selection Indicators */}
            <div className="flex items-center gap-2 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-full p-2 shadow-lg">
              {selectedKoisForBreeding.map(k => {
                const phenotype = getPhenotype(k.genetics.baseColorGenes);
                const bgColor = getDisplayColor(phenotype, k.genetics.lightness, k.genetics.saturation);
                return (
                  <div key={k.id} className="w-8 h-8 rounded-full border-2 border-purple-400" style={{ backgroundColor: bgColor }}></div>
                )
              })}
            </div>

            <div className="flex flex-col gap-2 w-full">
              {/* Breed Button - Only if exactly 2 selected */}
              {breedingSelection.length === 2 && (
                <button
                  onClick={handleMultiParentBreed}
                  disabled={!canBreed}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition-all hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm"
                >
                  <Dna size={18} />
                  교배 ({BREEDING_COST} ZP)
                </button>
              )}

              {/* Sell Button - Always visible if selection > 0 */}
              <button
                onClick={() => handleSellSelected(selectedKoisForBreeding)}
                className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition-all hover:bg-red-500 text-sm"
              >
                <DollarSign size={18} />
                판매 (+{totalSellValue} ZP)
              </button>

              {/* Warning Message for disabled breeding - Below Sell Button */}
              {breedingSelection.length === 2 && !canBreed && (
                <div className="text-red-400 text-xs text-center font-bold bg-black/50 p-1 rounded">
                  {selectedKoisForBreeding.some(k => k.growthStage !== GrowthStage.ADULT)
                    ? "성체 코이만 교배 가능합니다."
                    : selectedKoisForBreeding.some(k => (k.stamina ?? 0) < 30)
                      ? "체력이 부족합니다. (최소 30)"
                      : "젠 포인트가 부족합니다."}
                </div>
              )}
            </div>
          </div>
        )
      }

      <ControlBar
        onShopClick={() => {
          audioManager.playSFX('click');
          setIsShopModalOpen(true);
        }}
        isFeedModeActive={isFeedModeActive}
        onToggleFeedMode={handleToggleFeedMode}
        foodCount={foodCount}
        cornCount={cornCount}
        medicineCount={medicineCount ?? 0}
        selectedFoodType={selectedFoodType}
        onSelectFoodType={setSelectedFoodType}
        onPondInfoClick={() => {
          audioManager.playSFX('click');
          setIsPondInfoModalOpen(true);
        }}
        onThemeClick={() => {
          audioManager.playSFX('click');
          setIsThemeModalOpen(true);
        }}
        onMarketplaceClick={() => {
          if (!user) {
            setNotification({ message: '로그인이 필요합니다.', type: 'error' });
            setIsAuthModalOpen(true);
            return;
          }
          audioManager.playSFX('click');
          setIsMarketplaceOpen(true);
        }}
        onRankingClick={() => {
          audioManager.playSFX('click');
          setIsRankingModalOpen(true);
        }}
        onAchievementClick={() => {
          audioManager.playSFX('click');
          setIsAchievementModalOpen(true);
        }}
        hasUnclaimedAchievements={hasUnclaimedRewards}
      />

      {
        isMedicineConfirmOpen && (
          <MedicineConfirmModal
            onClose={() => setIsMedicineConfirmOpen(false)}
            onConfirm={confirmUseMedicine}
            currentCount={medicineCount}
          />
        )
      }

      {
        isShopModalOpen && (
          <ShopModal
            onClose={() => setIsShopModalOpen(false)}
            zenPoints={zenPoints}
            onBuyFood={handleBuyFood}
            onBuyFoodLarge={handleBuyFoodLarge}
            onBuyCorn={handleBuyCorn}
            onBuyCornLarge={handleBuyCornLarge}
            onBuyMedicine={handleBuyMedicine}
            onBuyKoi={handleBuyKoi}
            onBuyTrophy={handleBuyTrophy}
            onBuyPond={handleBuyPondExpansion}
            pondCount={Object.keys(ponds).length}
            honorPoints={honorPoints}
          />
        )
      }
      {
        isThemeModalOpen && (
          <ThemeModal
            onClose={() => setIsThemeModalOpen(false)}
            zenPoints={zenPoints}
            currentTheme={currentTheme}
            onSelectTheme={(theme, cost) => {
              // Theme logic handles cost but here we assume free or handled
              setPondTheme(theme);
              setIsThemeModalOpen(false);
            }}
          />
        )
      }
      {
        isCleanConfirmOpen && (
          <CleanConfirmModal
            onClose={() => setIsCleanConfirmOpen(false)}
            onConfirm={confirmCleanPond}
            cost={CLEANING_COST}
            adPoints={adPoints}
          />
        )
      }
      {/* Settings Modal */}
      <SaveLoadModal
        isOpen={isSaveLoadModalOpen}
        onClose={() => setIsSaveLoadModalOpen(false)}
        onNewGame={handleNewGame}
        isNight={false} // Perpetual day by request
        onToggleDayNight={() => { }}
      />

      {/* Account Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        userNickname={userNickname}
        onSaveNickname={handleSaveNickname}
        onLogoutCleanup={handleLogoutCleanup}
      />
      {
        activeKoi && <KoiDetailModal
          koi={activeKoi}
          totalKoiCount={koiList.length}
          onClose={() => setActiveKoi(null)}
          onRename={handleRenameKoi}
          onSell={(koi) => {
            handleSell(koi);
            setActiveKoi(null);
          }}
        />
      }
      {
        isPondInfoModalOpen && <PondInfoModal
          onClose={() => setIsPondInfoModalOpen(false)}
          ponds={ponds}
          activePondId={activePondId}
          onPondChange={setActivePondId}
          koiList={koiList}
          zenPoints={zenPoints}
          onKoiSelect={(koi) => {
            setActiveKoi(koi);
            setIsPondInfoModalOpen(false);
          }}
          onSell={handleSellSelected}
          onBreed={handleBreedKois}
          onMove={(kois, targetPondId) => {
            moveKoi(kois.map(k => k.id), targetPondId);
            setIsPondInfoModalOpen(false);
            setNotification({ message: '코이들이 새로운 연못으로 이사했습니다!', type: 'success' });
          }}
          onRenameKoi={handleRenameKoi}
          onToggleFavorite={toggleKoiFavorite}
        />
      }
      {
        isInfoModalOpen && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setIsInfoModalOpen(false)}>
            <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto border border-gray-700 shadow-xl custom-scrollbar" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-cyan-300">젠 코이 가든</h2>
                <button onClick={() => setIsInfoModalOpen(false)} className="text-gray-400 hover:text-white"><X /></button>
              </div>
              <p className="text-gray-300 mb-4">당신만의 평온한 코이 연못에 오신 것을 환영합니다. 아름다운 코이를 키우고, 교배하여 새로운 품종을 발견하세요.</p>
              <div className="space-y-3 text-gray-400">
                <p><strong className="text-white">교배:</strong> 연못의 코이를 클릭하여 교배할 부모를 선택하세요. 밝은 코이끼리 교배하면 흰색에, 어두운 코이끼리 교배하면 검은색에 가까운 자손을 얻을 수 있습니다. 성체 코이만 교배할 수 있습니다. 교배 후에도 부모는 사라지지 않습니다.</p>
                <p><strong className="text-white">성장:</strong> <Wheat size={16} className="inline-block" /> 먹이주기 모드를 활성화하고 연못 바닥을 클릭하여 먹이를 주세요. 치어는 성체로 성장합니다.</p>
                <p><strong className="text-white">판매:</strong> <DollarSign size={16} className="inline-block" /> 연못 현황 목록에서 코이를 선택하여 판매하고 젠 포인트를 얻으세요. 희귀한 색상이나 특별한 품종을 교배하고 더 많이 성장시킨 코이일수록 높은 가치를 가집니다.</p>
                <p><strong className="text-white">상점:</strong> <ShoppingCart size={16} className="inline-block" /> 상점에서 먹이를 구매하여 코이를 성장시키세요.</p>
                <p><strong className="text-white">저장:</strong> 게임 진행 상황은 당신의 브라우저에 자동으로 저장됩니다. 언제든지 다시 돌아와 연못을 돌보세요.</p>

                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-white font-bold mb-2 flex items-center gap-2">
                    <Dna size={18} className="text-cyan-400" /> 열성 유전자 가이드
                  </h3>
                  <div className="text-sm space-y-3 bg-gray-900/50 p-3 rounded border border-gray-700 text-gray-300">
                    <p>
                      <span className="text-yellow-400 font-bold block mb-1">🔍 숨겨진 색상 (Recessive Genes)</span>
                      코이는 겉으로 보이는 색 외에도 <strong className="text-white">수많은 숨겨진 색상 유전자</strong>를 가질 수 있습니다.
                      상세 정보창에서 코이가 보유한 모든 유전자 목록을 확인할 수 있습니다.
                    </p>

                    <p>
                      <span className="text-cyan-400 font-bold block mb-1">🎨 색상 발현 규칙</span>
                      특정 색상이 눈에 보이려면, 그 색상의 유전자를 <strong className="text-white">최소 2개 이상</strong> 가지고 있어야 합니다.
                      <br />
                      <span className="text-xs text-gray-500 mt-1 block">예: [빨강, 빨강] → 빨강 발현 / [빨강, 검정] → 크림색(기본)</span>
                    </p>

                    <p>
                      <span className="text-purple-400 font-bold block mb-1">🧬 유전과 변이</span>
                      자손은 부모의 유전자를 무작위로 물려받습니다.
                      가끔 <strong className="text-white">새로운 유전자가 추가</strong>되거나 돌연변이가 발생하여 유전자 풀이 점점 넓어집니다.
                      다양한 코이를 교배하여 숨겨진 희귀 색상을 찾아보세요!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onGuestPlay={() => setIsAuthModalOpen(false)}
      />

      <MarketplaceModal
        isOpen={isMarketplaceOpen}
        onClose={() => setIsMarketplaceOpen(false)}
        currentUserId={user?.uid}
        userAP={adPoints}
        refreshKey={marketplaceRefreshKey}
        onSelectListing={setSelectedListing}
        onCreateListingClick={(count) => {
          if (count >= 4) {
            setNotification({ message: '장터에는 최대 4마리까지만 등록할 수 있습니다.', type: 'error' });
            return;
          }
          setIsCreateListingOpen(true);
        }}
      />

      {
        isCreateListingOpen && (
          <CreateListingModal
            isOpen={isCreateListingOpen}
            onClose={() => setIsCreateListingOpen(false)}
            kois={koiList}
            userId={user?.uid || ''}
            userNickname={resolvedUserNickname}
            userAP={adPoints}
            gameState={gameStateRef.current!}
            onListingCreated={handleListingCreated}
          />
        )
      }

      {
        selectedListing && (
          <ListingDetailModal
            listing={selectedListing}
            onClose={() => setSelectedListing(null)}
            currentUserId={user?.uid}
            userNickname={resolvedUserNickname}
            userAP={adPoints}
            onBuySuccess={handleBuySuccess}
            onCancelSuccess={handleCancelSuccess}
          />
        )
      }

      <AdRewardModal
        isOpen={isAdModalOpen}
        onClose={() => setIsAdModalOpen(false)}
        currentAP={adPoints}
        onWatchAd={handleWatchAd}
        isWatching={isWatchingAd}
        watchProgress={adWatchProgress}
      />

      <SessionConflictModal
        isOpen={isConflictOpen}
        onResolve={() => {
          if (user) {
            startSession(user.uid).then(() => {
              setIsConflictOpen(false);
              setNotification({ message: '세션이 복구되었습니다.', type: 'success' });
            });
          }
        }}
        onLogout={async () => {
          suppressLocalGameSave();
          try {
            await logoutFromContext();
          } finally {
            window.location.reload();
          }
        }}
      />

      {/* Spot Genetics Debug Panel - shows first selected koi's genes */}
      {/* Spot Genetics Debug Panel - shows first selected koi's genes */}
      {import.meta.env.DEV && (
        <SpotGeneticsDebugPanel
          koi={activeKoi || selectedKoisForBreeding[0] || null}
          zenPoints={zenPoints}
          onSetZenPoints={(points) => setZenPoints(points)}
          adPoints={adPoints}
          onSetAdPoints={(points) => setAdPoints(points)}
          onSpawnKoi={(genetics, growthStage) => {
            // Create new koi with custom genetics and growth stage
            const newKoi: Koi = {
              id: crypto.randomUUID(),
              name: `코이`,
              description: '디버그 패널에서 생성된 코이입니다.',
              genetics: {
                baseColorGenes: genetics.baseColorGenes || [GeneType.CREAM, GeneType.CREAM],
                spots: genetics.spots || [],
                lightness: genetics.lightness ?? 50,
                saturation: genetics.saturation ?? 50,

                spotPhenotypeGenes: genetics.spotPhenotypeGenes,
              },
              position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
              velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
              age: growthStage === GrowthStage.FRY ? 0 : (growthStage === GrowthStage.JUVENILE ? 50 : 100),
              growthStage: growthStage || GrowthStage.FRY,
              timesFed: 0,
              foodTargetId: null,
              feedCooldownUntil: null,
              stamina: 100,
            };
            addKois([newKoi]);
            setNotification({ message: '새로운 코이가 생성되었습니다.', type: 'success' });
          }}
          onUpdateKoi={handleUpdateKoi}
        />
      )}

      <RankingModal
        isOpen={isRankingModalOpen}
        onClose={() => setIsRankingModalOpen(false)}
        userNickname={resolvedUserNickname}
        myHonorPoints={honorPoints}
        isLoggedIn={!!user}
        currUserId={user?.uid}
        myAchievementPoints={achievementScore}
      />

      <AchievementModal
        isOpen={isAchievementModalOpen}
        onClose={() => setIsAchievementModalOpen(false)}
        achievements={achievements}
        unlockedIds={unlockedIds}
        claimedIds={claimedIds}
        onClaim={handleClaimReward}
      />
    </div >
  );
};
