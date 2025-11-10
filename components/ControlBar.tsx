
import React from 'react';
import { Store, DollarSign, Fish, Wheat } from 'lucide-react';

interface ControlBarProps {
  onShopClick: () => void;
  isSellModeActive: boolean;
  onToggleSellMode: () => void;
  isFeedModeActive: boolean;
  onToggleFeedMode: () => void;
  foodCount: number;
  onPondInfoClick: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  onShopClick,
  isSellModeActive,
  onToggleSellMode,
  isFeedModeActive,
  onToggleFeedMode,
  foodCount,
  onPondInfoClick
}) => {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-gray-900/70 backdrop-blur-md border border-gray-700/50 rounded-full p-2 shadow-lg">
      <button onClick={onShopClick} className="bg-yellow-500 hover:bg-yellow-400 text-white rounded-full p-3 shadow-lg transition-transform hover:scale-110" aria-label="Open shop">
        <Store size={24} />
      </button>
      <button 
        onClick={onToggleSellMode}
        className={`rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 ${isSellModeActive ? 'bg-red-500 hover:bg-red-400 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        aria-label="Toggle sell mode"
      >
        <DollarSign size={24} />
      </button>
      <button 
        onClick={onToggleFeedMode}
        className={`relative rounded-full p-3 shadow-lg transition-all duration-200 hover:scale-110 ${isFeedModeActive ? 'bg-green-500 hover:bg-green-400 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
        aria-label="Toggle feed mode"
      >
        <Wheat size={24} />
        <span className="absolute -top-1 -right-2 bg-green-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-gray-800">
          {foodCount}
        </span>
      </button>
      <button onClick={onPondInfoClick} className="bg-blue-500 hover:bg-blue-400 text-white rounded-full p-3 shadow-lg transition-transform hover:scale-110" aria-label="Open pond info">
        <Fish size={24} />
      </button>
    </div>
  );
};
