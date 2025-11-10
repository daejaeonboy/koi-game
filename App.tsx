
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Pond } from './components/Pond';
import { ControlBar } from './components/ControlBar';
import { ShopModal } from './components/ShopModal';
import { KoiDetailModal } from './components/KoiDetailModal';
import { PondInfoModal } from './components/PondInfoModal';
import { useKoiPond } from './hooks/useKoiPond';
import { Koi, GeneType, KoiGenetics, GrowthStage, Ponds } from './types';
import { breedKoi, calculateKoiValue, getPhenotype, GENE_COLOR_MAP } from './utils/genetics';
import { Info, Store, X, Dna, DollarSign, Wheat } from 'lucide-react';

interface Animation {
  id: number;
  value?: number;
  position: { x: number; y: number };
}

const BREEDING_COST = 300;
const FOOD_PACK_PRICE = 200;
const FOOD_PACK_AMOUNT = 50;
const SAVE_GAME_KEY = 'zenKoiGardenSaveData';

interface SavedGameState {
    ponds: Ponds;
    activePondId: string;
    zenPoints: number;
    foodCount: number;
    koiNameCounter: number;
}

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

// Sound effect for feeding
const playPlopSound = () => {
    const audioCtx = new (window.AudioContext)();
    if (!audioCtx) return;

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(150, audioCtx.currentTime); 

    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.3);
};


export const App: React.FC = () => {
  const [savedState] = useState(loadGameState);

  const { 
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
  } = useKoiPond(savedState ? { ponds: savedState.ponds, activePondId: savedState.activePondId } : undefined);

  const [isShopModalOpen, setIsShopModalOpen] = useState(false);
  const [isPondInfoModalOpen, setIsPondInfoModalOpen] = useState(false);
  const [activeKoi, setActiveKoi] = useState<Koi | null>(null);
  
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [zenPoints, setZenPoints] = useState(savedState?.zenPoints ?? 1000);
  const [isSellModeActive, setIsSellModeActive] = useState(false);
  const [isFeedModeActive, setIsFeedModeActive] = useState(false);
  const [breedingSelection, setBreedingSelection] = useState<string[]>([]);
  const [sellAnimations, setSellAnimations] = useState<Animation[]>([]);
  const [foodDropAnimations, setFoodDropAnimations] = useState<Animation[]>([]);
  const [foodCount, setFoodCount] = useState(savedState?.foodCount ?? 20);
  const [koiNameCounter, setKoiNameCounter] = useState(savedState?.koiNameCounter ?? 3);

  useEffect(() => {
    const stateToSave: SavedGameState = {
        ponds,
        activePondId,
        zenPoints,
        foodCount,
        koiNameCounter,
    };
    try {
        localStorage.setItem(SAVE_GAME_KEY, JSON.stringify(stateToSave));
    } catch (error) {
        console.error("Failed to save game state:", error);
    }
  }, [ponds, activePondId, zenPoints, foodCount, koiNameCounter]);


  const handleSell = useCallback((koi: Koi) => {
    const value = calculateKoiValue(koi);
    setZenPoints(prev => prev + value);
    
    const animId = Date.now();
    setSellAnimations(prev => [...prev, { id: animId, value, position: koi.position }]);
    setTimeout(() => {
        setSellAnimations(prev => prev.filter(a => a.id !== animId));
    }, 1500);

    removeKoi(koi.id);
  }, [removeKoi]);

  const handleMultiParentBreed = () => {
    const selectedKois = koiList.filter(k => breedingSelection.includes(k.id));
    if (zenPoints < BREEDING_COST || selectedKois.length < 2) return;
 
    const hasJuvenile = selectedKois.some(k => k.growthStage === GrowthStage.JUVENILE);
    if (hasJuvenile) return;
 
    setZenPoints(p => p - BREEDING_COST);
 
    const isPerfectBreed = selectedKois.every(k => k.growthStage === GrowthStage.PERFECT);
    const offspringCount = isPerfectBreed ? 8 : 4;

    const newKois: Koi[] = [];
    let currentCounter = koiNameCounter;
    const parentGenetics = selectedKois.map(k => k.genetics);

    for (let i = 0; i < offspringCount; i++) {
        const parent1Index = Math.floor(Math.random() * selectedKois.length);
        let parent2Index = Math.floor(Math.random() * selectedKois.length);
        while (parent2Index === parent1Index) {
            parent2Index = Math.floor(Math.random() * selectedKois.length);
        }
        const childGenetics = breedKoi(parentGenetics[parent1Index], parentGenetics[parent2Index]);
        
        const newKoi: Koi = {
            id: `${Date.now()}-offspring-${i}`,
            name: `코이 #${currentCounter}`,
            description: "교배를 통해 태어난 새로운 코이입니다.",
            genetics: childGenetics,
            position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
            velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
            size: 4,
            growthStage: GrowthStage.JUVENILE,
            timesFed: 0,
            foodTargetId: null,
            feedCooldownUntil: null,
        };
        newKois.push(newKoi);
        currentCounter++;
    }
    
    setKoiNameCounter(currentCounter);
    addKois(newKois);
    setBreedingSelection([]);
  };

  const buySpecialKoi = (genes: [GeneType, GeneType], cost: number, typeName: string) => {
    if (zenPoints < cost) return;

    setZenPoints(p => p - cost);
    setIsShopModalOpen(false);
    
    const newGenetics: KoiGenetics = {
        baseColorGenes: genes,
        spots: [],
        lightness: 50, // Special morphs have a default lightness, though it won't be visible
    };
    
    const newKoi: Koi = {
      id: `${typeName}-${Date.now()}`,
      name: `코이 #${koiNameCounter}`,
      description: `상점에서 구매한 특별한 ${typeName} 코이입니다.`,
      genetics: newGenetics,
      position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
      velocity: { vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2 },
      size: 4,
      growthStage: GrowthStage.JUVENILE,
      timesFed: 0,
      foodTargetId: null,
      feedCooldownUntil: null,
    };
    addKois([newKoi]);
    setKoiNameCounter(c => c + 1);
  }
  
  const handleBuyPondExpansion = () => {
      const cost = 20000;
      if (zenPoints < cost) return;
      setZenPoints(p => p - cost);
      addPond();
      setIsShopModalOpen(false);
  }

  const handleBuyFood = () => {
    if (zenPoints < FOOD_PACK_PRICE) return;
    setZenPoints(p => p - FOOD_PACK_PRICE);
    setFoodCount(c => c + FOOD_PACK_AMOUNT);
    setIsShopModalOpen(false);
  }

  const handlePondClick = useCallback((event: React.MouseEvent<HTMLElement>, koi?: Koi) => {
    // Sell Mode Logic
    if (isSellModeActive) {
      if (koi) {
        handleSell(koi);
      }
      return;
    }

    // Feed Mode Logic
    if (isFeedModeActive) {
      if (!koi) {
        if (foodCount <= 0) return;
        
        setFoodCount(c => c - 1);
        playPlopSound();
        
        const pondRect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - pondRect.left) / pondRect.width) * 100;
        const y = ((event.clientY - pondRect.top) / pondRect.height) * 100;
        
        dropFood({ x, y });

        const dropAnimId = Date.now();
        setFoodDropAnimations(prev => [...prev, { id: dropAnimId, position: { x, y } }]);
        setTimeout(() => {
            setFoodDropAnimations(prev => prev.filter(a => a.id !== dropAnimId));
        }, 1000);
      }
      return;
    }
    
    // Default/Breeding Mode Logic
    if (koi) {
      if (breedingSelection.includes(koi.id)) {
        setBreedingSelection(prev => prev.filter(id => id !== koi.id));
      } else {
        if (breedingSelection.length < 2) { 
          setBreedingSelection(prev => [...prev, koi.id]);
        } else {
          setActiveKoi(koi);
        }
      }
    } else {
      setActiveKoi(null);
      setBreedingSelection([]);
    }
  }, [isSellModeActive, isFeedModeActive, breedingSelection, foodCount, handleSell, dropFood]);

  const handleToggleSellMode = () => {
      setBreedingSelection([]);
      setIsFeedModeActive(false);
      setIsSellModeActive(prev => !prev);
  }

  const handleToggleFeedMode = () => {
    setBreedingSelection([]);
    setIsSellModeActive(false);
    setIsFeedModeActive(prev => !prev);
  }
  
  const selectedKoisForBreeding = useMemo(() => 
    koiList.filter(k => breedingSelection.includes(k.id)),
    [koiList, breedingSelection]
  );
  
  const canBreed = useMemo(() => {
    if (breedingSelection.length < 2 || zenPoints < BREEDING_COST) return false;
    const hasJuvenile = selectedKoisForBreeding.some(k => k.growthStage === GrowthStage.JUVENILE);
    return !hasJuvenile;
  }, [breedingSelection, selectedKoisForBreeding, zenPoints]);

  return (
    <div className="w-full h-full flex flex-col bg-gray-800">
      
      <main className="flex-grow flex relative">
        <Pond 
          gameState={'playing'}
          koiList={koiList}
          onKoiClick={(e, koi) => handlePondClick(e, koi)}
          onBackgroundClick={(e) => handlePondClick(e)}
          updateKoiPositions={updateKoiPositions}
          isSellModeActive={isSellModeActive}
          isFeedModeActive={isFeedModeActive}
          breedingSelection={breedingSelection}
          sellAnimations={sellAnimations}
          feedAnimations={feedAnimations}
          foodDropAnimations={foodDropAnimations}
          foodPellets={foodPellets}
        />
      </main>

      <div className="absolute top-4 left-4 z-20 bg-gray-900/60 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50">
          <p className="text-xl font-bold text-yellow-300">{zenPoints.toLocaleString()} ZP</p>
      </div>
      
      <button 
        onClick={() => setIsInfoModalOpen(true)} 
        className="absolute top-4 right-4 z-20 bg-gray-900/60 backdrop-blur-sm p-3 rounded-full border border-gray-700/50 text-white hover:bg-gray-700/60 transition-colors"
        aria-label="게임 정보"
      >
        <Info size={24} />
      </button>

      {breedingSelection.length > 0 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2">
              <div className="flex items-center gap-2 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-full p-2 shadow-lg">
                  {selectedKoisForBreeding.map(k => {
                      const phenotype = getPhenotype(k.genetics.baseColorGenes);
                      const isSpecial = phenotype === GeneType.ALBINO || phenotype === GeneType.PLATINUM;
                      const bgColor = isSpecial ? GENE_COLOR_MAP[phenotype] : `hsl(0, 80%, ${k.genetics.lightness}%)`;
                      return (
                          <div key={k.id} className="w-8 h-8 rounded-full border-2 border-purple-400" style={{ backgroundColor: bgColor }}></div>
                      )
                  })}
              </div>
              <button 
                  onClick={handleMultiParentBreed}
                  disabled={!canBreed}
                  className="flex items-center gap-2 bg-purple-600 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                  <Dna size={20} />
                  교배하기 ({BREEDING_COST} ZP)
              </button>
          </div>
      )}
      
      <ControlBar 
        onShopClick={() => setIsShopModalOpen(true)}
        isSellModeActive={isSellModeActive}
        onToggleSellMode={handleToggleSellMode}
        isFeedModeActive={isFeedModeActive}
        onToggleFeedMode={handleToggleFeedMode}
        foodCount={foodCount}
        onPondInfoClick={() => setIsPondInfoModalOpen(true)}
      />

      {isShopModalOpen && <ShopModal 
        onClose={() => setIsShopModalOpen(false)} 
        zenPoints={zenPoints}
        onBuyPondExpansion={handleBuyPondExpansion}
        onBuyFood={handleBuyFood}
        onBuyAlbinoKoi={() => buySpecialKoi([GeneType.ALBINO, GeneType.ALBINO], 100000, "알비노")}
        onBuyPlatinumKoi={() => buySpecialKoi([GeneType.PLATINUM, GeneType.PLATINUM], 500000, "플래티넘")}
      />}
      {activeKoi && <KoiDetailModal 
        koi={activeKoi} 
        onClose={() => setActiveKoi(null)} 
        onSell={(koi) => {
            handleSell(koi);
            setActiveKoi(null);
        }} 
      />}
      {isPondInfoModalOpen && <PondInfoModal 
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
      />}
      {isInfoModalOpen && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setIsInfoModalOpen(false)}>
            <div className="bg-gray-800 p-8 rounded-lg max-w-2xl w-full border border-gray-700 shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-cyan-300">젠 코이 가든</h2>
                    <button onClick={() => setIsInfoModalOpen(false)}><X/></button>
                </div>
                <p className="text-gray-300 mb-4">당신만의 평온한 코이 연못에 오신 것을 환영합니다. 아름다운 코이를 키우고, 교배하여 새로운 품종을 발견하세요.</p>
                <div className="space-y-3 text-gray-400">
                  <p><strong className="text-white">교배:</strong> 연못의 코이를 클릭하여 교배할 부모를 선택하세요. 밝은 코이끼리 교배하면 흰색에, 어두운 코이끼리 교배하면 검은색에 가까운 자손을 얻을 수 있습니다. 성체 또는 완성체 코이만 교배할 수 있습니다. 교배 후에도 부모는 사라지지 않습니다.</p>
                  <p><strong className="text-white">성장:</strong> <Wheat size={16} className="inline-block" /> 먹이주기 모드를 활성화하고 연못 바닥을 클릭하여 먹이를 주세요. 치어는 성체로, 성체는 '완성체'로 성장합니다.</p>
                  <p><strong className="text-white">판매:</strong> <DollarSign size={16} className="inline-block"/> 판매 모드를 활성화하고 코이를 클릭하여 젠 포인트를 얻으세요. 희귀한 색상(흰색, 검정색)이나 특별한 품종을 교배하고 더 많이 성장시킨 코이일수록 높은 가치를 가집니다.</p>
                  <p><strong className="text-white">상점:</strong> <Store size={16} className="inline-block"/> 상점에서 먹이를 구매하거나, 특별한 순종 코이(알비노, 플래티넘)를 구매하여 교배에 사용할 수 있습니다.</p>
                  <p><strong className="text-white">저장:</strong> 게임 진행 상황은 당신의 브라우저에 자동으로 저장됩니다. 언제든지 다시 돌아와 연못을 돌보세요.</p>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
