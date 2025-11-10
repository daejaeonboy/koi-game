
import React, { useEffect, useRef } from 'react';
import { Koi as KoiType } from '../types';
import { Koi } from './Koi';

interface PondProps {
  gameState: 'pre-start' | 'playing';
  koiList: KoiType[];
  // FIX: Updated MouseEvent to MouseEvent<HTMLElement> to match handler signature in App.tsx
  onKoiClick: (event: React.MouseEvent<HTMLElement>, koi: KoiType) => void;
  // FIX: Updated MouseEvent to MouseEvent<HTMLElement> to match handler signature in App.tsx
  onBackgroundClick: (event: React.MouseEvent<HTMLElement>) => void;
  updateKoiPositions: () => void;
  isSellModeActive: boolean;
  isFeedModeActive: boolean;
  breedingSelection: string[];
  sellAnimations: { id: number, value?: number, position: { x: number, y: number } }[];
  feedAnimations: { id: number, position: { x: number, y: number } }[];
  foodDropAnimations: { id: number, position: { x: number, y: number } }[];
  foodPellets: { id: number, position: { x: number, y: number } }[];
}

const Rocks: React.FC = () => (
    <div className="absolute bottom-[-40px] left-[-50px] w-64 h-48 z-0 opacity-60 pointer-events-none" style={{ transform: 'rotate(-15deg)' }}>
        <svg viewBox="0 0 200 100" className="w-full h-full">
            <path d="M 50,100 C 20,100 0,80 0,50 C 0,20 20,0 50,0 L 150,0 C 180,0 200,20 200,50 C 200,80 180,100 150,100 Z" fill="#374151" transform="translate(10, 25) rotate(-10 100 50) scale(0.9)" />
            <path d="M 120,100 C 100,100 80,90 80,70 C 80,50 100,40 120,40 L 180,40 C 200,40 210,50 210,70 C 210,90 200,100 180,100 Z" fill="#4b5563" transform="translate(-50, 45) rotate(20 145 70) scale(0.7)" />
            <path d="M 90,100 C 70,100 50,90 50,70 C 50,50 70,40 90,40 L 150,40 C 170,40 180,50 180,70 C 180,90 170,100 150,100 Z" fill="#4b5563" transform="translate(-20, 60) rotate(-5 115 70) scale(0.5)" />
        </svg>
    </div>
);

const LilyPad: React.FC<{ top: string; left: string; scale: number; rotation: number }> = ({ top, left, scale, rotation }) => (
    <div className="absolute z-0 pointer-events-none" style={{ top, left, transform: `scale(${scale}) rotate(${rotation}deg)` }}>
        <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
                <radialGradient id="lilyGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                    <stop offset="0%" style={{stopColor: '#38a169'}} /> 
                    <stop offset="100%" style={{stopColor: '#2f855a'}} />
                </radialGradient>
            </defs>
            <path d="M 50 0 A 50 50 0 1 1 49.99 0 L 70 50 Z" fill="url(#lilyGradient)" stroke="#276749" strokeWidth="2.5" />
        </svg>
    </div>
);

export const Pond: React.FC<PondProps> = ({ gameState, koiList, onKoiClick, onBackgroundClick, updateKoiPositions, isSellModeActive, isFeedModeActive, breedingSelection, sellAnimations, feedAnimations, foodDropAnimations, foodPellets }) => {
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    const animate = () => {
      updateKoiPositions();
      animationFrameId.current = requestAnimationFrame(animate);
    };
    
    if (gameState === 'playing') {
      animationFrameId.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [gameState, updateKoiPositions]);

  const getPondClassName = () => {
      let className = 'flex-grow h-full w-full relative bg-gradient-to-br from-slate-100 via-cyan-100 to-blue-200 overflow-hidden cursor-pointer';
      if (isSellModeActive) className += ' sell-mode';
      if (isFeedModeActive) className += ' feed-mode';
      if (breedingSelection.length > 0) className += ' breeding-mode';
      return className;
  }

  return (
    <div className={getPondClassName()} onClick={onBackgroundClick}>
      {/* Water effect */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/subtle-waves.png')] opacity-5"></div>
      <div className="caustics-overlay"></div>
      
      {/* Decorations */}
      <Rocks />
      <LilyPad top="15%" left="80%" scale={0.8} rotation={20} />
      <LilyPad top="75%" left="10%" scale={1} rotation={-45} />
      <LilyPad top="85%" left="20%" scale={0.7} rotation={120} />
      
      {koiList.map((koi) => (
        <Koi 
            key={koi.id} 
            koi={koi} 
            onClick={onKoiClick} 
            isSelected={breedingSelection.includes(koi.id)}
        />
      ))}

      {foodPellets.map(pellet => (
        <div
          key={`pellet-${pellet.id}`}
          className="absolute z-10 pointer-events-none"
          style={{
            left: `${pellet.position.x}%`,
            top: `${pellet.position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div style={{width: '6px', height: '6px', backgroundColor: '#78350f', borderRadius: '50%', boxShadow: '0 0 2px rgba(0,0,0,0.5)'}}></div>
        </div>
      ))}

      {sellAnimations.map(anim => (
          <div 
            key={anim.id} 
            className="absolute text-green-600 font-bold text-xl animate-float-up z-30" 
            style={{ 
                left: `${anim.position.x}%`, 
                top: `${anim.position.y}%`,
                transform: 'translate(-50%, -50%)',
            }}
          >
              +{anim.value} ZP
          </div>
      ))}
      {feedAnimations.map(anim => (
          <div 
            key={anim.id} 
            className="absolute text-green-500 font-bold text-lg animate-feed-up z-30" 
            style={{ 
                left: `${anim.position.x}%`, 
                top: `${anim.position.y}%`,
                transform: 'translate(-50%, -50%)',
            }}
          >
              +1
          </div>
      ))}
      {foodDropAnimations.map(anim => (
          <div 
            key={anim.id} 
            className="absolute z-30 pointer-events-none"
            style={{ 
                left: `${anim.position.x}%`, 
                top: `${anim.position.y}%`,
            }}
          >
            <div className="food-pellet pellet1"></div>
            <div className="food-pellet pellet2"></div>
            <div className="food-pellet pellet3"></div>
          </div>
      ))}
    </div>
  );
};
