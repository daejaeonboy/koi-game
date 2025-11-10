
import { useState, useCallback, useRef, useMemo } from 'react';
import { Koi, GeneType, Ponds, GrowthStage } from '../types';

const FEEDS_TO_GROW = 3;
const FEEDS_TO_PERFECT = 10;
const JUVENILE_SIZE = 4;
const ADULT_SIZE = 7;
const PERFECT_SIZE = 10;
const EATING_DISTANCE = 2;
const FEED_COOLDOWN_MS = 6000;

interface FoodPellet {
  id: number;
  position: { x: number; y: number };
}

interface FeedAnimation {
    id: number;
    position: { x: number; y: number };
}

interface UseKoiPondInitialState {
  ponds: Ponds;
  activePondId: string;
}

const createInitialPonds = (): Ponds => {
    const koi1: Koi = {
        id: 'initial-1',
        name: '코이 #1',
        description: "연못의 첫 번째 주민입니다.",
        genetics: {
            baseColorGenes: [GeneType.RED, GeneType.RED],
            spots: [],
            lightness: 50,
        },
        position: { x: 30, y: 50 },
        velocity: { vx: 0.1, vy: -0.1 },
        size: ADULT_SIZE,
        growthStage: GrowthStage.ADULT,
        timesFed: 0,
        foodTargetId: null,
        feedCooldownUntil: null,
    };

    const koi2: Koi = {
        id: 'initial-2',
        name: '코이 #2',
        description: "연못의 두 번째 주민입니다.",
        genetics: {
            baseColorGenes: [GeneType.RED, GeneType.RED],
            spots: [],
            lightness: 50,
        },
        position: { x: 70, y: 50 },
        velocity: { vx: -0.1, vy: 0.1 },
        size: ADULT_SIZE,
        growthStage: GrowthStage.ADULT,
        timesFed: 0,
        foodTargetId: null,
        feedCooldownUntil: null,
    };
    
    return {
        'pond-1': {
            id: 'pond-1',
            name: '연못 1',
            kois: [koi1, koi2],
        }
    };
};

export const useKoiPond = (initialState?: UseKoiPondInitialState) => {
  const [ponds, setPonds] = useState<Ponds>(() => initialState?.ponds ?? createInitialPonds());
  const [activePondId, setActivePondId] = useState<string>(() => initialState?.activePondId ?? 'pond-1');
  const [foodPellets, setFoodPellets] = useState<FoodPellet[]>([]);
  const [feedAnimations, setFeedAnimations] = useState<FeedAnimation[]>([]);
  const pondBounds = useRef({ width: 100, height: 100 });

  const koiList = useMemo(() => ponds[activePondId]?.kois || [], [ponds, activePondId]);
  
  const addPond = useCallback(() => {
    const newPondId = `pond-${Object.keys(ponds).length + 1}`;
    setPonds(prevPonds => {
        return {
            ...prevPonds,
            [newPondId]: {
                id: newPondId,
                name: `연못 ${Object.keys(prevPonds).length + 1}`,
                kois: [],
            }
        };
    });
    setActivePondId(newPondId);
  }, [ponds]);

  const addKois = useCallback((kois: Koi[]) => {
    setPonds(prev => {
        const activePond = prev[activePondId];
        if (!activePond) return prev;
        return {
            ...prev,
            [activePondId]: {
                ...activePond,
                kois: [...activePond.kois, ...kois],
            }
        };
    });
  }, [activePondId]);

  const removeKoi = useCallback((koiId: string) => {
    setPonds(prev => {
        const activePond = prev[activePondId];
        if (!activePond) return prev;
        return {
            ...prev,
            [activePondId]: {
                ...activePond,
                kois: activePond.kois.filter(k => k.id !== koiId),
            }
        };
    });
  }, [activePondId]);

  const dropFood = useCallback((position: { x: number; y: number }) => {
    const newPellets: FoodPellet[] = [];
    for (let i = 0; i < 3; i++) {
        newPellets.push({
            id: Date.now() + i,
            position: {
                x: position.x + (Math.random() - 0.5) * 4,
                y: position.y + (Math.random() - 0.5) * 4,
            },
        });
    }
    setFoodPellets(prev => [...prev, ...newPellets]);
  }, []);

  const triggerFeedAnimation = useCallback((position: { x: number; y: number }) => {
    const animId = Date.now() + Math.random();
    const newAnimation = { id: animId, position };
    setFeedAnimations(prev => [...prev, newAnimation]);
    setTimeout(() => {
        setFeedAnimations(prev => prev.filter(a => a.id !== animId));
    }, 1500);
  }, []);

  // This function is for direct feeding, which is not the primary mechanism anymore,
  // but we keep it for potential future use or debugging.
  const feedKoi = useCallback((koiId: string) => {
    let fedKoiPosition: { x: number; y: number } | null = null;
    const now = Date.now();
    setPonds(prev => {
        const activePond = prev[activePondId];
        if (!activePond) return prev;
        
        const updatedKois = activePond.kois.map(k => {
            if (k.id === koiId && (!k.feedCooldownUntil || now > k.feedCooldownUntil)) {
                fedKoiPosition = k.position;
                const newTimesFed = k.timesFed + 1;
                const newCooldown = { feedCooldownUntil: now + FEED_COOLDOWN_MS };

                if (k.growthStage === GrowthStage.JUVENILE && newTimesFed >= FEEDS_TO_GROW) {
                    return { ...k, timesFed: 0, growthStage: GrowthStage.ADULT, size: ADULT_SIZE, ...newCooldown };
                }
                if (k.growthStage === GrowthStage.ADULT && newTimesFed >= FEEDS_TO_PERFECT) {
                    return { ...k, timesFed: newTimesFed, growthStage: GrowthStage.PERFECT, size: PERFECT_SIZE, ...newCooldown };
                }
                return { ...k, timesFed: newTimesFed, ...newCooldown };
            }
            return k;
        });

        if (fedKoiPosition === null) return prev;

        return {
            ...prev,
            [activePondId]: {
                ...activePond,
                kois: updatedKois,
            }
        };
    });

    if (fedKoiPosition) {
        triggerFeedAnimation(fedKoiPosition);
    }
  }, [activePondId, triggerFeedAnimation]);
  
  const updateKoiPositions = useCallback(() => {
    const eatenPelletIds = new Set<number>();
    const now = Date.now();

    setPonds(prevPonds => {
      const activePond = prevPonds[activePondId];
      if (!activePond) return prevPonds;
      
      let tempKois = [...activePond.kois];
      const availablePellets = foodPellets.filter(p => !tempKois.some(k => k.foodTargetId === p.id));
      
      if (availablePellets.length > 0) {
          const hungryKois = tempKois.filter(k => k.foodTargetId === null && (!k.feedCooldownUntil || now > k.feedCooldownUntil));
          
          for (const pellet of availablePellets) {
              let closestKoi: Koi | null = null;
              let minDistance = Infinity;

              for (const koi of hungryKois) {
                  if (!tempKois.some(k => k.foodTargetId === pellet.id && k.id !== koi.id)) {
                      const dx = koi.position.x - pellet.position.x;
                      const dy = koi.position.y - pellet.position.y;
                      const distance = Math.sqrt(dx * dx + dy * dy);
                      if (distance < minDistance) {
                          minDistance = distance;
                          closestKoi = koi;
                      }
                  }
              }
              if (closestKoi) {
                  tempKois = tempKois.map(k => k.id === closestKoi!.id ? { ...k, foodTargetId: pellet.id } : k);
                  const index = hungryKois.findIndex(k => k.id === closestKoi!.id);
                  if (index > -1) hungryKois.splice(index, 1);
              }
          }
      }

      const updatedKois = tempKois.map((koi) => {
        let { position, velocity, foodTargetId } = koi;
        let { x, y } = position;
        let { vx, vy } = velocity;

        const targetPellet = foodPellets.find(p => p.id === foodTargetId);

        if (targetPellet && (!koi.feedCooldownUntil || now > koi.feedCooldownUntil)) {
            const dx = targetPellet.position.x - x;
            const dy = targetPellet.position.y - y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < EATING_DISTANCE) {
                eatenPelletIds.add(targetPellet.id);
                triggerFeedAnimation(koi.position);
                const newTimesFed = koi.timesFed + 1;
                const newCooldown = { feedCooldownUntil: now + FEED_COOLDOWN_MS };

                if (koi.growthStage === GrowthStage.JUVENILE && newTimesFed >= FEEDS_TO_GROW) {
                    // FIX: Replaced 'k' with 'koi' to correctly reference the koi object in the map function's scope.
                    return { ...koi, timesFed: 0, growthStage: GrowthStage.ADULT, size: ADULT_SIZE, foodTargetId: null, ...newCooldown };
                }
                if (koi.growthStage === GrowthStage.ADULT && newTimesFed >= FEEDS_TO_PERFECT) {
                    // FIX: Replaced 'k' with 'koi' to correctly reference the koi object in the map function's scope.
                    return { ...koi, timesFed: newTimesFed, growthStage: GrowthStage.PERFECT, size: PERFECT_SIZE, foodTargetId: null, ...newCooldown };
                }
                // FIX: Replaced 'k' with 'koi' to correctly reference the koi object in the map function's scope.
                return { ...koi, timesFed: newTimesFed, foodTargetId: null, ...newCooldown };
            } else {
                const angle = Math.atan2(dy, dx);
                vx = Math.cos(angle) * 0.25;
                vy = Math.sin(angle) * 0.25;
            }

        } else {
            if (foodTargetId) {
                foodTargetId = null;
            }
            const turnMargin = 15;
            const turnForce = 0.01;
            if (x < turnMargin) vx += turnForce;
            if (x > pondBounds.current.width - turnMargin) vx -= turnForce;
            if (y < turnMargin) vy += turnForce;
            if (y > pondBounds.current.height - turnMargin) vy -= turnForce;

            if (Math.random() < 0.02) {
              vx += (Math.random() - 0.5) * 0.05;
              vy += (Math.random() - 0.5) * 0.05;
            }

            const speed = Math.sqrt(vx * vx + vy * vy);
            const maxSpeed = 0.2;
            const minSpeed = 0.05;

            if (speed > maxSpeed) {
              vx = (vx / speed) * maxSpeed;
              vy = (vy / speed) * maxSpeed;
            } else if (speed > 0 && speed < minSpeed) {
               vx = (vx / speed) * minSpeed;
               vy = (vy / speed) * minSpeed;
            }
        }
        
        x += vx;
        y += vy;
        
        x = Math.max(2, Math.min(pondBounds.current.width - 2, x));
        y = Math.max(2, Math.min(pondBounds.current.height - 2, y));

        return {
          ...koi,
          position: { x, y },
          velocity: { vx, vy },
          foodTargetId,
        };
      });

      if (eatenPelletIds.size > 0) {
        setFoodPellets(prev => prev.filter(p => !eatenPelletIds.has(p.id)));
      }

      return {
        ...prevPonds,
        [activePondId]: {
            ...activePond,
            kois: updatedKois,
        }
      };
    });
  }, [activePondId, foodPellets, triggerFeedAnimation]);


  return { 
    ponds, 
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
  };
};
