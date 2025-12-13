import React, { useState } from 'react';
import { Store, Fish, Sparkles, Pill, Briefcase, Palette } from 'lucide-react';

// ... (IconProps and Icons remain change if needed, checking below)

interface IconProps {
  size?: number;
  className?: string;
}

const CornIcon = ({ size = 24, className = "" }: IconProps) => (
  <div
    className={`bg-current ${className}`}
    style={{
      width: size,
      height: size,
      maskImage: "url('/corn.png')",
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskImage: "url('/corn.png')",
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
    }}
  />
);

const FeedIcon = ({ size = 24, className = "" }: IconProps) => (
  <div
    className={`bg-current ${className}`}
    style={{
      width: size,
      height: size,
      maskImage: "url('/feed.png')",
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
      WebkitMaskImage: "url('/feed.png')",
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
    }}
  />
);


interface ControlBarProps {
  onShopClick: () => void;
  isFeedModeActive: boolean;
  onToggleFeedMode: () => void;
  foodCount: number;
  cornCount: number;
  medicineCount: number;
  selectedFoodType: 'normal' | 'corn' | 'medicine';
  onSelectFoodType: (type: 'normal' | 'corn' | 'medicine') => void;
  onPondInfoClick: () => void;
  onCleanPond: () => void;
  onThemeClick: () => void;
}

// Updated getButtonClass: Removed scale, shadow-lg, and glow effects
const getButtonClass = (isActive: boolean) =>
  `p-3 sm:p-4 rounded-full border transition-all duration-200 flex items-center justify-center relative ${isActive
    ? 'bg-yellow-600 border-yellow-400 text-white' // Active: distinct but flat
    : 'bg-gray-900/60 border-white/10 text-white hover:bg-gray-800' // Inactive: minimal
  }`;

export const ControlBar: React.FC<ControlBarProps> = ({
  onShopClick,
  isFeedModeActive,
  onToggleFeedMode,
  foodCount,
  cornCount,
  medicineCount,
  selectedFoodType,
  onSelectFoodType,
  onPondInfoClick,
  onCleanPond,
  onThemeClick,
}) => {
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);

  const handleInventoryClick = () => {
    setIsInventoryOpen(!isInventoryOpen);
  };

  const handleItemClick = (type: 'normal' | 'corn' | 'medicine') => {
    // If not in feed mode, turn it on. If in feed mode but different key, switch.
    // Logic: Always select and ensure feed mode is ON.
    if (!isFeedModeActive) {
      onToggleFeedMode();
    }
    onSelectFoodType(type);
    setIsInventoryOpen(false); // Close menu after selection? User said "icon appears above", usually implies selection closes or stays? Let's close for cleaner UX.
  };

  return (
    <div className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex items-center gap-2">
      <button
        onClick={onShopClick}
        className={getButtonClass(false)}
        aria-label="Open shop"
      >
        <Store size={24} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2} />
      </button>

      {/* Inventory System */}
      <div className="relative">
        {/* Submenu Items (Appear Above) */}
        {isInventoryOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-row gap-2 bg-black/60 p-2 rounded-2xl border border-gray-700 backdrop-blur-md whitespace-nowrap">
            {/* Regular Food Button */}
            <button
              onClick={() => handleItemClick('normal')}
              className={getButtonClass(isFeedModeActive && selectedFoodType === 'normal')}
              aria-label="Basic Feed"
            >
              <FeedIcon size={24} className="sm:w-[26px] sm:h-[26px]" />
              <span className="absolute -top-1 -right-1 bg-gray-800 text-yellow-400 border border-white/20 text-[10px] sm:text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {foodCount}
              </span>
            </button>

            {/* Corn Food Button */}
            <button
              onClick={() => handleItemClick('corn')}
              className={getButtonClass(isFeedModeActive && selectedFoodType === 'corn')}
              aria-label="Corn food"
            >
              <CornIcon size={24} className="sm:w-[26px] sm:h-[26px]" />
              <span className="absolute -top-1 -right-1 bg-gray-800 text-yellow-400 border border-white/20 text-[10px] sm:text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {cornCount}
              </span>
            </button>

            {/* Medicine Button */}
            <button
              onClick={() => handleItemClick('medicine')}
              className={getButtonClass(isFeedModeActive && selectedFoodType === 'medicine')}
              aria-label="Medicine"
            >
              <Pill size={24} className="sm:w-[26px] sm:h-[26px]" />
              <span className="absolute -top-1 -right-1 bg-gray-800 text-yellow-400 border border-white/20 text-[10px] sm:text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {medicineCount}
              </span>
            </button>
          </div>
        )}

        {/* Inventory Main Button */}
        <button
          onClick={handleInventoryClick}
          className={`${getButtonClass(isInventoryOpen || isFeedModeActive)} relative`}
          aria-label="Inventory"
        >
          {selectedFoodType === 'corn' ? (
            <CornIcon size={24} className="sm:w-[26px] sm:h-[26px]" />
          ) : selectedFoodType === 'medicine' ? (
            <Pill size={24} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2} />
          ) : (
            <FeedIcon size={24} className="sm:w-[26px] sm:h-[26px]" />
          )}

          {/* Quantity Badge on Main Button */}
          <span className="absolute -top-1 -right-1 bg-gray-800 text-yellow-400 border border-white/20 text-[10px] sm:text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {selectedFoodType === 'corn' ? cornCount : selectedFoodType === 'medicine' ? medicineCount : foodCount}
          </span>
        </button>
      </div>

      <button onClick={onPondInfoClick} className={getButtonClass(false)} aria-label="Open pond info">
        <Fish size={24} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2} />
      </button>

      <button onClick={onCleanPond} className={getButtonClass(false)} aria-label="Clean pond">
        <Sparkles size={24} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2} />
      </button>

      <button onClick={onThemeClick} className={getButtonClass(false)} aria-label="Change theme">
        <Palette size={24} className="sm:w-[26px] sm:h-[26px]" strokeWidth={2} />
      </button>
    </div>
  );
};
