import React from 'react';
import { motion } from 'motion/react';
import { Club, Diamond, Heart, Spade } from 'lucide-react';

export type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface CardData {
  suit: Suit;
  rank: Rank;
}

interface CardProps {
  card: CardData;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  small?: boolean;
  hidden?: boolean;
  highlighted?: boolean;
  layoutId?: string;
}

const suitIcons = {
  SPADES: <Spade className="fill-current" />,
  HEARTS: <Heart className="fill-current" />,
  DIAMONDS: <Diamond className="fill-current" />,
  CLUBS: <Club className="fill-current" />,
};

const suitColors = {
  SPADES: 'text-slate-900',
  HEARTS: 'text-rose-600',
  DIAMONDS: 'text-rose-600',
  CLUBS: 'text-slate-900',
};

export default function Card({ card, onClick, selected, disabled, small, hidden, highlighted, layoutId }: CardProps) {
  if (hidden) {
    return (
      <div className={`${small ? 'w-8 h-12' : 'w-16 h-24 md:w-20 md:h-32'} bg-slate-800 border-2 border-slate-700 rounded-lg flex items-center justify-center shadow-md overflow-hidden relative`}>
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="w-full h-full border border-white/5 rounded-inner p-1">
          <div className="w-full h-full bg-slate-900/50 rounded flex items-center justify-center">
            <div className="w-4 h-4 border border-white/20 rotate-45" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      layout
      layoutId={layoutId}
      whileHover={!disabled ? { 
        y: -15, 
        scale: 1.05,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        ${small ? 'w-8 h-12 text-xs' : 'w-16 h-24 md:w-20 md:h-32'} 
        bg-white rounded-lg flex flex-col items-center justify-between p-1 md:p-2 cursor-pointer relative overflow-hidden group
        border-2 flex-shrink-0
        transition-all duration-300
        ${selected ? 'ring-4 ring-emerald-500 -translate-y-6 border-emerald-500 z-50 shadow-[0_0_30px_rgba(16,185,129,0.5)]' : 'shadow-xl hover:shadow-2xl border-gray-100'}
        ${highlighted && !disabled && !selected ? 'ring-4 ring-yellow-400 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : ''}
        ${disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}
        ${suitColors[card.suit]}
      `}
    >
      <div className="self-start font-black leading-none">
        {card.rank}
      </div>
      
      <div className={`w-1/2 h-1/2 flex items-center justify-center`}>
        {React.cloneElement(suitIcons[card.suit] as React.ReactElement, { size: small ? 16 : 24 })}
      </div>

      <div className="self-end font-black leading-none rotate-180">
        {card.rank}
      </div>

      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
