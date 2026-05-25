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
  size?: 'small' | 'medium' | 'large';
  small?: boolean;
  hidden?: boolean;
  highlighted?: boolean;
  layoutId?: string;
  key?: string | number;
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

export default function Card({ card, onClick, selected, disabled, size = 'medium', small, hidden, highlighted, layoutId }: CardProps) {
  const backStyle = localStorage.getItem('shelem_card_back') || 'classic';
  
  // Backward compatibility
  const effectiveSize = small ? 'small' : size;

  const sizeClasses = {
    small: 'w-10 h-16 text-[10px] p-1 md:p-1.5',
    medium: 'w-16 h-24 md:w-20 md:h-32 lg:w-24 lg:h-36 p-1.5 md:p-2.5 lg:p-4',
    large: 'w-20 h-28 md:w-24 md:h-36 lg:w-32 lg:h-48 p-2 md:p-3.5 lg:p-6'
  };

  const iconSizes = {
    small: { corner: 8, center: 16 },
    medium: { corner: 12, center: 28 },
    large: { corner: 16, center: 40 }
  };

  if (hidden) {
    const backColors: { [key: string]: string } = {
      classic: 'bg-blue-900 border-blue-800',
      modern: 'bg-zinc-900 border-zinc-800',
      royal: 'bg-yellow-900 border-yellow-800',
      emerald: 'bg-emerald-950 border-emerald-800',
      obsidian: 'bg-stone-950 border-amber-600/30 ring-1 ring-amber-500/10',
      crimson: 'bg-red-950 border-red-900',
    };

    let centerBorderColor = 'border-white/20';
    let innerLineColor = 'bg-white/10';
    let centerCoreBg = 'bg-white/5';
    if (backStyle === 'obsidian') {
      centerBorderColor = 'border-amber-400/40';
      innerLineColor = 'bg-amber-400/20';
      centerCoreBg = 'bg-amber-950/20';
    } else if (backStyle === 'emerald') {
      centerBorderColor = 'border-emerald-400/40';
      innerLineColor = 'bg-emerald-400/20';
      centerCoreBg = 'bg-emerald-950/20';
    } else if (backStyle === 'crimson') {
      centerBorderColor = 'border-rose-400/40';
      innerLineColor = 'bg-rose-400/20';
      centerCoreBg = 'bg-rose-950/20';
    } else if (backStyle === 'royal') {
      centerBorderColor = 'border-yellow-400/40';
      innerLineColor = 'bg-yellow-400/20';
    }

    const hiddenSizeClasses = {
        small: 'w-10 h-16',
        medium: 'w-16 h-24 md:w-20 md:h-32',
        large: 'w-20 h-28 md:w-24 md:h-36'
    };

    return (
      <div className={`${hiddenSizeClasses[effectiveSize]} ${backColors[backStyle] || backColors.classic} border-2 rounded-xl flex items-center justify-center shadow-md overflow-hidden relative`}>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="w-full h-full border border-white/10 rounded-inner p-1.5">
          <div className={`w-full h-full ${centerCoreBg} rounded-lg flex items-center justify-center border border-white/5`}>
             <div className="relative">
                <div className={`w-6 h-6 border-2 ${centerBorderColor} rotate-45 flex items-center justify-center ${effectiveSize === 'large' ? 'scale-150' : ''}`}>
                    <div className="w-3 h-3 border border-white/10" />
                </div>
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-px ${innerLineColor} -rotate-45`} />
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-px ${innerLineColor} -rotate-45`} />
             </div>
          </div>
        </div>
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
      </div>
    );
  }

  return (
    <motion.div
      layout
      layoutId={layoutId}
      style={{ perspective: 1000, transformStyle: "preserve-3d" }}
      whileHover={!disabled ? { 
        y: -22, 
        scale: 1.1,
        rotateY: 12,
        rotateX: 8,
        z: 15,
        boxShadow: "0px 25px 40px rgba(0,0,0,0.6)",
        transition: { type: "spring", stiffness: 500, damping: 14 }
      } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      onClick={!disabled ? onClick : undefined}
      className={`
        ${sizeClasses[effectiveSize]}
        bg-white rounded-xl flex flex-col items-center justify-between cursor-pointer relative overflow-hidden group
        border-b-4 flex-shrink-0
        transition-all duration-300
        ${selected ? 'ring-4 ring-emerald-500 -translate-y-6 md:-translate-y-8 border-emerald-600 z-50 shadow-[0_20px_40px_rgba(16,185,129,0.3)]' : 'shadow-lg border-gray-200'}
        ${highlighted && !disabled && !selected ? 'ring-4 ring-yellow-400 border-yellow-500 shadow-[0_0_20px_rgba(250,204,21,0.4)]' : ''}
        ${disabled ? 'opacity-40 grayscale cursor-not-allowed bg-gray-50 border-gray-200' : 'hover:scale-110'}
        ${suitColors[card.suit]}
      `}
    >
      <div className="flex flex-col items-center self-start gap-0.5">
        <div className={`font-black leading-none ${effectiveSize === 'small' ? 'text-sm' : 'text-sm md:text-base lg:text-xl'}`}>
          {card.rank}
        </div>
        <div className="opacity-80">
          {React.cloneElement(suitIcons[card.suit] as React.ReactElement, { size: iconSizes[effectiveSize].corner })}
        </div>
      </div>
      
      <div className={`w-full flex-1 flex items-center justify-center`}>
        <div className={`${effectiveSize === 'small' ? 'p-1' : 'p-2 md:p-3 lg:p-4'} rounded-full bg-current/5 border border-current/10 flex items-center justify-center transition-transform group-hover:scale-125 duration-500`}>
          {React.cloneElement(suitIcons[card.suit] as React.ReactElement, { size: iconSizes[effectiveSize].center })}
        </div>
      </div>

      <div className="flex flex-col items-center self-end gap-0.5 rotate-180">
        <div className={`font-black leading-none ${effectiveSize === 'small' ? 'text-sm' : 'text-sm md:text-base lg:text-xl'}`}>
          {card.rank}
        </div>
        <div className="opacity-80">
          {React.cloneElement(suitIcons[card.suit] as React.ReactElement, { size: iconSizes[effectiveSize].corner })}
        </div>
      </div>

      {/* Decorative details */}
      <div className="absolute top-1 right-1 opacity-5 mix-blend-multiply origin-top-right scale-150 rotate-12">
          {suitIcons[card.suit]}
      </div>
      <div className="absolute bottom-1 left-1 opacity-5 mix-blend-multiply origin-bottom-left scale-150 rotate-12">
          {suitIcons[card.suit]}
      </div>

      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}
