import React from 'react';
import { Star } from 'lucide-react';

interface APDisplayProps {
    ap: number;
    onAdClick: () => void;
}

export const APDisplay: React.FC<APDisplayProps> = ({ ap, onAdClick }) => {
    return (
        <div className="bg-gray-900/60 backdrop-blur-sm p-3 rounded-lg border border-gray-700/50 flex items-center gap-2">
            <Star size={18} className="text-yellow-400" />
            <div className="flex flex-col items-start leading-none">
                <span className="text-[10px] text-gray-400">AP</span>
                <span className="text-sm font-bold text-yellow-300">
                    {ap.toLocaleString()}
                </span>
            </div>
            <button
                onClick={onAdClick}
                className="ml-2 text-xs bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-2 py-1 rounded transition-colors"
            >
                + 광고
            </button>
        </div>
    );
};
