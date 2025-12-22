
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { Koi, GeneType, Ponds, GrowthStage, Decoration, DecorationType, PondTheme, SpotShape } from '../types';
import { createRandomSpotPhenotypeGenes } from '../utils/genetics';

const POINTS_TO_JUVENILE = 10;
const POINTS_TO_ADULT = 20;
const JUVENILE_SIZE = 4;
const ADULT_SIZE = 7;
const PERFECT_SIZE = 10;
const EATING_DISTANCE = 2;
const FEED_COOLDOWN_MS = 3000;

interface FoodPellet {
    id: number;
    position: { x: number; y: number };
    feedAmount: number; // 1 for normal, 3 for corn
}

interface FeedAnimation {
    id: number;
    position: { x: number; y: number };
    feedAmount: number;
}

interface UseKoiPondInitialState {
    ponds: Ponds;
    activePondId: string;
    foodCount?: number;
    cornCount?: number;
    medicineCount?: number;
}

const createInitialPonds = (): Ponds => {


    const createSpecificKoi = (id: string, name: string): Koi => {
        const spotCount = Math.floor(Math.random() * 2) + 1; // 1 or 2 spots
        const spots = [];
        for (let i = 0; i < spotCount; i++) {
            spots.push({
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                size: Math.random() * 15 + 15, // 15-30 size
                color: GeneType.RED,
                shape: Object.values(SpotShape)[Math.floor(Math.random() * 3)]
            });
        }

        return {
            id,
            name,
            description: "연못의 초기 주민입니다.",
            genetics: {
                baseColorGenes: [GeneType.CREAM, GeneType.CREAM], // Cream Base (Homozygous)
                spots: spots,
                lightness: 50,
                isTransparent: false,
            },
            position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
            velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
            size: ADULT_SIZE,
            age: 100,
            growthStage: GrowthStage.ADULT,
            timesFed: 0,
            foodTargetId: null,
            feedCooldownUntil: null,
            stamina: 100,
        };
    };

    // Test Spawn: 6 Specific Koi for Spot Verification
    // Initial Spawn: 2 Koi with Circle spots as requested
    const shapes = [
        { shape: SpotShape.CIRCLE, name: 'Circle' },
        { shape: SpotShape.CIRCLE, name: 'Circle' }
    ];

    const initialKois: Koi[] = shapes.map((s, index) => {
        const id = `initial-${index + 1}`;
        const spots: any[] = [];

        // Add 1 random spot of the specific shape as requested
        const count = 1;
        for (let k = 0; k < count; k++) {
            spots.push({
                x: Math.random() * 80 + 10,
                y: Math.random() * 80 + 10,
                size: Math.random() * 15 + 15,
                color: GeneType.RED,
                shape: s.shape
            });
        }

        return {
            id: id,
            name: `코이`,
            description: `${s.name} 패턴을 가진 코이입니다.`,
            genetics: {
                baseColorGenes: [GeneType.CREAM, GeneType.CREAM],
                spots: spots,
                lightness: 50,
                isTransparent: false,
                spotPhenotypeGenes: createRandomSpotPhenotypeGenes(),
            },
            position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
            velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
            size: ADULT_SIZE,
            age: 100,
            growthStage: GrowthStage.ADULT,
            timesFed: 0,
            foodTargetId: null,
            feedCooldownUntil: null,
            stamina: 100,
        };
    });

    return {
        'pond-1': {
            id: 'pond-1',
            name: '연못 1',
            kois: initialKois,
            decorations: [
                // 개구리밥 설정 제거됨
            ],

            theme: PondTheme.DEFAULT,
            waterQuality: 100,
        }
    };
};

export const useKoiPond = (initialState?: UseKoiPondInitialState) => {
    const [ponds, setPonds] = useState<Ponds>(() => {
        const initial = initialState?.ponds ?? createInitialPonds();
        // Migration: ensure all ponds have decorations array
        Object.values(initial).forEach(pond => {
            if (!pond.decorations) pond.decorations = [];

            // 개구리밥 마이그레이션 로직 제거됨
            // 기존 개구리밥 제거
            const otherDecorations = pond.decorations.filter(d => d.type !== DecorationType.DUCKWEED);

            pond.decorations = [...otherDecorations];
            if (!Object.values(PondTheme).includes(pond.theme)) {
                pond.theme = PondTheme.DEFAULT;
            }
            if (pond.waterQuality === undefined) {
                pond.waterQuality = 100;
            }
            pond.kois.forEach(k => {
                if (k.stamina === undefined || k.stamina === null) k.stamina = 100;
                // Developer Fix: Reset stamina if 0 (likely due to fast decay bug)
                if (k.stamina <= 0) k.stamina = 100;
            });
            // pond.theme = PondTheme.NIGHT; // Removed forced override
        });
        return initial;
    });
    const [activePondId, setActivePondId] = useState<string>(() => initialState?.activePondId ?? 'pond-1');


    // ... (inside useKoiPond hook)
    const [foodPellets, setFoodPellets] = useState<FoodPellet[]>([]);
    const [feedAnimations, setFeedAnimations] = useState<FeedAnimation[]>([]);
    const [foodCount, setFoodCount] = useState(initialState?.foodCount ?? 20);
    const [cornCount, setCornCount] = useState(initialState?.cornCount ?? 0);
    const [medicineCount, setMedicineCount] = useState(initialState?.medicineCount ?? 0);
    const [dayNightCycle, setDayNightCycle] = useState<{ phase: 'day' | 'night', timer: number }>({ phase: 'day', timer: 600 }); // 10 mins day

    useEffect(() => {
        const interval = setInterval(() => {
            // Day/Night Cycle Logic
            setDayNightCycle((prev: { phase: 'day' | 'night', timer: number }) => {
                const newTimer = prev.timer - 1;
                if (newTimer <= 0) {
                    return {
                        phase: prev.phase === 'day' ? 'night' : 'day',
                        timer: prev.phase === 'day' ? 300 : 600 // 5m night, 10m day
                    };
                }
                return { ...prev, timer: newTimer };
            });
        }, 1000); // 1 sec interval

        const degradationInterval = setInterval(() => {
            setPonds((prev: Ponds) => {
                const activePond = prev[activePondId];
                if (!activePond) return prev;

                // degrade water quality: 0.002 per koi per second (Slower)
                const qualityLoss = Math.min(activePond.kois.length * 0.002, 0.5);
                const newWaterQuality = Math.max(0, (activePond.waterQuality ?? 100) - qualityLoss);

                // degrade stamina based on water quality
                // User Request: 
                // Quality <= 80: -2 per 4s (-0.5 per sec)
                // Quality <= 60: -3 per 4s (-0.75 per sec)
                const currentQuality = activePond.waterQuality ?? 100;
                let staminaDecay = 0;

                if (currentQuality <= 60) {
                    staminaDecay = 1 / 3; // 1 per 3 seconds
                } else if (currentQuality <= 70) {
                    staminaDecay = 1 / 6; // 1 per 6 seconds
                }

                // 1. Apply Decay & Sickness Check
                let updatedKois = activePond.kois.map(k => {
                    let newStamina = Math.max(0, (k.stamina ?? 100) - staminaDecay);
                    let newSickTimestamp = k.sickTimestamp;

                    // Sick Limit: 5% (User Request)
                    const SICK_THRESHOLD = 5;

                    // If stamina drops below threshold and not already sick, become sick
                    if (newStamina <= SICK_THRESHOLD && !newSickTimestamp) {
                        newSickTimestamp = Date.now();
                    }

                    // If sick, stamina cannot recover (handled in feeding), but here we just clamp it if needed?
                    // User says "healthy fish also keeps losing stamina below 8%". 
                    // This implies if they get infected, they drop to 8 or lower.

                    return {
                        ...k,
                        stamina: newStamina,
                        sickTimestamp: newSickTimestamp
                    };
                });

                // 2. Contagion Logic
                // If a koi is sick for > 2 mins (120,000 ms), it infects nearby healthy koi
                const now = Date.now();
                const CONTAGION_TIME = 120000;
                const CONTAGION_DISTANCE = 20;

                const infectiousKois = updatedKois.filter(k => k.sickTimestamp && (now - k.sickTimestamp > CONTAGION_TIME));

                if (infectiousKois.length > 0) {
                    updatedKois = updatedKois.map(target => {
                        if (target.sickTimestamp) return target; // Already sick

                        const isCloseToInfected = infectiousKois.some(source => {
                            if (source.id === target.id) return false;
                            const dx = source.position.x - target.position.x;
                            const dy = source.position.y - target.position.y;
                            return Math.sqrt(dx * dx + dy * dy) < CONTAGION_DISTANCE;
                        });

                        if (isCloseToInfected) {
                            return {
                                ...target,
                                stamina: Math.min(target.stamina ?? 100, 8), // Drop to 8% immediately
                                sickTimestamp: now
                            };
                        }
                        return target;
                    });
                }

                return {
                    ...prev,
                    [activePondId]: {
                        ...activePond,
                        waterQuality: newWaterQuality,
                        kois: updatedKois
                    }
                };
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(degradationInterval);
        };
    }, [activePondId]);

    const isNight = dayNightCycle.phase === 'night';
    const pondBounds = useRef({ width: 100, height: 100 });

    const koiList = useMemo(() => ponds[activePondId]?.kois || [], [ponds, activePondId]);

    const addPond = useCallback(() => {
        const newPondId = `pond-${Object.keys(ponds).length + 1}`;
        setPonds((prevPonds: Ponds) => {
            return {
                ...prevPonds,
                [newPondId]: {
                    id: newPondId,
                    name: `연못 ${Object.keys(prevPonds).length + 1}`,
                    kois: [],
                    decorations: [],
                    theme: PondTheme.DEFAULT,
                    waterQuality: 100,
                }
            };
        });
        setActivePondId(newPondId);
    }, [ponds]);

    const addKois = useCallback((kois: Koi[]) => {
        setPonds((prev: Ponds) => {
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

    const addDecoration = useCallback((decoration: Decoration) => {
        setPonds((prev: Ponds) => {
            const activePond = prev[activePondId];
            if (!activePond) return prev;
            return {
                ...prev,
                [activePondId]: {
                    ...activePond,
                    decorations: [...(activePond.decorations || []), decoration],
                }
            };
        });
    }, [activePondId]);

    const spawnKoi = useCallback((color: GeneType) => {
        setPonds((prev: Ponds) => {
            const activePond = prev[activePondId];
            if (!activePond) return prev;

            const newId = `shop-koi-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            const isBasicKoi = color === GeneType.CREAM;
            let initialSpots: any[] = [];

            if (isBasicKoi) {
                // Basic Koi: Exactly 2 spots (randomized) - Set to RED for visibility (Kohaku style)
                initialSpots = [
                    { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, size: 25, color: GeneType.RED, shape: SpotShape.CIRCLE },
                    { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10, size: 25, color: GeneType.RED, shape: SpotShape.CIRCLE }
                ];
            } else {
                // Special Koi: 3 Fixed Spots (as before)
                initialSpots = [
                    { x: 50, y: 30, size: 20, color: color, shape: SpotShape.CIRCLE },
                    { x: 50, y: 60, size: 25, color: color, shape: SpotShape.HEXAGON },
                    { x: 50, y: 85, size: 15, color: color, shape: SpotShape.POLYGON }
                ];
            }

            const newKoi: Koi = {
                id: newId,
                name: `코이`,
                description: isBasicKoi ? "가장 기본적인 코이입니다." : "상점에서 온 특별한 코이입니다.",
                genetics: {
                    baseColorGenes: [color, color], // Homozygous to ensure expression
                    spots: initialSpots,
                    lightness: 50,
                    isTransparent: false,
                    spotPhenotypeGenes: createRandomSpotPhenotypeGenes(),
                },
                position: { x: 50, y: 50 }, // Center spawn
                velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
                size: JUVENILE_SIZE,
                age: 0,
                growthStage: GrowthStage.FRY,
                timesFed: 0,
                foodTargetId: null,
                feedCooldownUntil: null,
                stamina: 100,
            };

            // Randomize spot shapes for Basic Koi too?
            // User said "Basic Koi has 2 spots".
            // If I randomize shapes, it's fine.
            newKoi.genetics.spots.forEach(spot => {
                spot.shape = Object.values(SpotShape)[Math.floor(Math.random() * 3)] as SpotShape;
            });

            return {
                ...prev,
                [activePondId]: {
                    ...activePond,
                    kois: [...activePond.kois, newKoi],
                }
            };
        });
    }, [activePondId]);

    const removeKoi = useCallback((koiId: string) => {
        setPonds((prev: Ponds) => {
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

    const setPondTheme = useCallback((theme: PondTheme) => {
        setPonds((prev: Ponds) => {
            const activePond = prev[activePondId];
            if (!activePond) return prev;
            return {
                ...prev,
                [activePondId]: {
                    ...activePond,
                    theme,
                }
            };
        });
    }, [activePondId]);

    const dropFood = useCallback((position: { x: number; y: number }, feedAmount: number = 1) => {
        const newPellets: FoodPellet[] = [];
        for (let i = 0; i < 3; i++) {
            newPellets.push({
                id: Date.now() + i,
                position: {
                    x: position.x + (Math.random() - 0.5) * 4,
                    y: position.y + (Math.random() - 0.5) * 4,
                },
                feedAmount,
            });
        }
        setFoodPellets((prev: FoodPellet[]) => [...prev, ...newPellets]);
    }, []);

    const triggerFeedAnimation = useCallback((position: { x: number; y: number }, feedAmount: number = 1) => {
        const animId = Date.now() + Math.random();
        const newAnimation = { id: animId, position, feedAmount };
        setFeedAnimations((prev: FeedAnimation[]) => [...prev, newAnimation]);
        setTimeout(() => {
            setFeedAnimations((prev: FeedAnimation[]) => prev.filter(a => a.id !== animId));
        }, 1500);
    }, []);

    // This function is for direct feeding, which is not the primary mechanism anymore,
    // but we keep it for potential future use or debugging.
    const moveKoi = useCallback((koiIds: string[], targetPondId: string) => {
        setPonds((prev: Ponds) => {
            const sourcePond = prev[activePondId];
            const targetPond = prev[targetPondId];

            if (!sourcePond || !targetPond) return prev;
            if (activePondId === targetPondId) return prev;

            // Check capacity
            if (targetPond.kois.length + koiIds.length > 30) {
                // UI should check this, but safety catch
                return prev;
            }

            const koisToMove = sourcePond.kois.filter(k => koiIds.includes(k.id));
            const remainingKois = sourcePond.kois.filter(k => !koiIds.includes(k.id));

            const movedKois = koisToMove.map(k => ({
                ...k,
                position: { x: 50, y: 50 }, // Reset position to center
                vx: 0, vy: 0, // Reset velocity
                target: { x: 50, y: 50 } // Reset target
            }));

            return {
                ...prev,
                [activePondId]: {
                    ...sourcePond,
                    kois: remainingKois
                },
                [targetPondId]: {
                    ...targetPond,
                    kois: [...targetPond.kois, ...movedKois]
                }
            };
        });
    }, [activePondId]);

    // Original feedKoi...
    const feedKoi = useCallback((koiId: string, feedAmount: number = 1) => {
        let fedKoiPosition: { x: number; y: number } | null = null;
        const now = Date.now();
        setPonds((prev: Ponds) => {
            const activePond = prev[activePondId];
            if (!activePond) return prev;

            const updatedKois = activePond.kois.map(k => {
                if (k.id === koiId && (!k.feedCooldownUntil || now > k.feedCooldownUntil)) {
                    fedKoiPosition = k.position;
                    const newTimesFed = k.timesFed + feedAmount;
                    const newCooldown = { feedCooldownUntil: now + FEED_COOLDOWN_MS };
                    const newStamina = Math.min(100, (k.stamina ?? 0) + 30); // Restore 30 stamina

                    // Growth Logic (Legacy direct feed)
                    if (k.growthStage === GrowthStage.FRY && newTimesFed >= POINTS_TO_JUVENILE) {
                        return { ...k, timesFed: 0, growthStage: GrowthStage.JUVENILE, size: JUVENILE_SIZE, ...newCooldown, stamina: newStamina };
                    } else if (k.growthStage === GrowthStage.JUVENILE && newTimesFed >= POINTS_TO_ADULT) {
                        return { ...k, timesFed: 0, growthStage: GrowthStage.ADULT, size: ADULT_SIZE, ...newCooldown, stamina: newStamina };
                    }
                    return { ...k, timesFed: newTimesFed, ...newCooldown, stamina: newStamina };
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
            triggerFeedAnimation(fedKoiPosition, feedAmount);
        }
    }, [activePondId, triggerFeedAnimation]);

    const updateKoiPositions = useCallback(() => {
        // Legacy function - physics is now handled by GameEngine
        // We keep this structure if we ever need to revert or for reference
    }, []);

    const handleFoodEaten = useCallback((koiId: string, foodId: number, feedAmount: number, position: { x: number, y: number }) => {
        const now = Date.now();
        setPonds((prev: Ponds) => {
            const activePond = prev[activePondId];
            if (!activePond) return prev;

            const updatedKois = activePond.kois.map(k => {
                if (k.id === koiId) {
                    const newTimesFed = k.timesFed + feedAmount;
                    const newCooldown = { feedCooldownUntil: now + FEED_COOLDOWN_MS };

                    // User Request: Basic(+5), Corn(+10)
                    // Assuming Corn has feedAmount > 1 (usually 3)
                    const staminaGain = feedAmount > 1 ? 10 : 5;

                    // Sick Logic: If sick, cannot recover
                    const isSick = !!k.sickTimestamp; // Check flag
                    if (isSick) {
                        // Consumes food but no effect
                        return { ...k, timesFed: k.timesFed, foodTargetId: null, ...newCooldown };
                    }

                    const newStamina = Math.min(100, (k.stamina ?? 0) + staminaGain);

                    // Growth Logic
                    if (k.growthStage === GrowthStage.FRY && newTimesFed >= POINTS_TO_JUVENILE) {
                        // Grow to Juvenile
                        return {
                            ...k,
                            timesFed: 0, // Reset counter for next stage
                            growthStage: GrowthStage.JUVENILE,
                            size: JUVENILE_SIZE,
                            foodTargetId: null,
                            ...newCooldown,
                            stamina: newStamina
                        };
                    } else if (k.growthStage === GrowthStage.JUVENILE && newTimesFed >= POINTS_TO_ADULT) {
                        // Grow to Adult
                        return {
                            ...k,
                            timesFed: 0, // Reset counter (maxed out)
                            growthStage: GrowthStage.ADULT,
                            size: ADULT_SIZE,
                            foodTargetId: null,
                            ...newCooldown,
                            stamina: newStamina
                        };
                    }

                    return { ...k, timesFed: newTimesFed, foodTargetId: null, ...newCooldown, stamina: newStamina };
                }
                return k;
            });

            return {
                ...prev,
                [activePondId]: {
                    ...activePond,
                    kois: updatedKois,
                }
            };
        });

        setFoodPellets((prev: FoodPellet[]) => prev.filter(p => p.id !== foodId));
        triggerFeedAnimation(position, feedAmount);
    }, [activePondId, triggerFeedAnimation]);


    const activePond = ponds[activePondId];

    const resetPonds = () => {
        const initial = createInitialPonds();
        setPonds(initial);
    };

    const toggleDayNight = useCallback(() => {
        setDayNightCycle((prev: { phase: 'day' | 'night', timer: number }) => ({
            phase: prev.phase === 'day' ? 'night' : 'day',
            timer: prev.phase === 'day' ? 300 : 600 // Switch to 5m night or 10m day
        }));
    }, []);

    return {
        ponds,
        setPonds, // Exposed for manual load
        activePondId,
        setActivePondId,
        koiList: activePond?.kois || [],
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
        isNight: dayNightCycle.phase === 'night',
        toggleDayNight,
        resetPonds,
        handleFoodEaten,
        spawnKoi,
        cleanPond: () => {
            setPonds(prev => ({
                ...prev,
                [activePondId]: {
                    ...prev[activePondId],
                    waterQuality: 100
                }
            }));
        },
        reduceWaterQuality: (amount: number) => {
            setPonds(prev => {
                const activePond = prev[activePondId];
                if (!activePond) return prev;
                return {
                    ...prev,
                    [activePondId]: {
                        ...activePond,
                        waterQuality: Math.max(0, (activePond.waterQuality ?? 100) - amount)
                    }
                };
            });
        },
        consumeStamina: (koiIds: string[], amount: number) => {
            setPonds(prev => {
                const activePond = prev[activePondId];
                if (!activePond) return prev;

                const updatedKois = activePond.kois.map(k => {
                    if (koiIds.includes(k.id)) {
                        return { ...k, stamina: Math.max(0, (k.stamina ?? 0) - amount) };
                    }
                    return k;
                });

                return {
                    ...prev,
                    [activePondId]: {
                        ...activePond,
                        kois: updatedKois
                    }
                };
            });
        },
        medicineCount,
        setMedicineCount,
        foodCount,
        setFoodCount,
        cornCount,
        setCornCount,
        cureAllKoi: () => {
            setPonds(prev => {
                const activePond = prev[activePondId];
                if (!activePond) return prev;

                const updatedKois = activePond.kois.map(k => {
                    if (k.sickTimestamp) {
                        return {
                            ...k,
                            sickTimestamp: null,
                            stamina: Math.max(k.stamina ?? 0, 20) // Restore to 20% if lower
                        };
                    }
                    return k;
                });

                return {
                    ...prev,
                    [activePondId]: {
                        ...activePond,
                        kois: updatedKois
                    }
                };
            });
        },
        moveKoi,
    };
};
