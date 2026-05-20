import React, { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import Card, { CardData, Suit } from './Card';
import Chat from './Chat';
import { Users, Info, Settings, HelpCircle, CheckCircle2, X, Volume2, VolumeX, Eye, LogOut, Flag, Crown, Copy, Newspaper } from 'lucide-react';

interface GameBoardProps {
  room: any;
  socket: any;
  playerName: string;
}

const AVATAR_COLORS: { [key: string]: string } = {
  '🧔': 'bg-blue-500',
  '👨': 'bg-emerald-500',
  '👩': 'bg-rose-500',
  '👴': 'bg-amber-500',
  '👵': 'bg-pink-500',
  '👸': 'bg-purple-500',
  '🤴': 'bg-yellow-500',
  '🥷': 'bg-slate-700',
  '🧙': 'bg-indigo-600',
  '🧛': 'bg-red-900',
  '🧟': 'bg-green-900',
  '🤖': 'bg-cyan-500',
  '🦊': 'bg-orange-500',
  '🐱': 'bg-yellow-400',
  '🐶': 'bg-amber-600',
  '🦁': 'bg-orange-600'
};

function PlayerAvatar({ avatar, className = "" }: { avatar: string; className?: string }) {
  const isImage = avatar?.startsWith('/Images') || avatar?.startsWith('data:');
  return (
    <div className={`w-full h-full flex items-center justify-center relative ${className}`}>
      {isImage ? (
        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <>
          <div className={`absolute inset-0 opacity-40 ${AVATAR_COLORS[avatar] || 'bg-emerald-800'}`} />
          <span className="relative z-10">{avatar}</span>
        </>
      )}
    </div>
  );
}

export default function GameBoard({ room, socket, playerName }: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<CardData[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('shelem_sound_enabled') === 'true');
  const [showPossiblePlays, setShowPossiblePlays] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiBar, setShowEmojiBar] = useState(false);
  const [showChat, setShowChat] = useState(() => localStorage.getItem('shelem_show_chat') === 'true');
  const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('shelem_font') || '"Inter", sans-serif');
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem('shelem_theme') || 'emerald');
  const [cardBack, setCardBack] = useState(() => localStorage.getItem('shelem_card_back') || 'classic');
  const [tableFinish, setTableFinish] = useState(() => localStorage.getItem('shelem_table_finish') || 'smooth');
  const [cardSize, setCardSize] = useState<'small' | 'medium' | 'large'>(() => (localStorage.getItem('shelem_card_size') as any) || 'medium');
  const [resignRequest, setResignRequest] = useState<any>(null);
  const [reactions, setReactions] = useState<{ [playerId: string]: string }>({});
  const [localStats, setLocalStats] = useState<any>({ wins: 0, losses: 0, games: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [spectatorPerspective, setSpectatorPerspective] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const [hidePlayerIds, setHidePlayerIds] = useState(() => localStorage.getItem('shelem_hide_player_ids') === 'true');

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((e) => {
        console.error(`Error attempting to enable full-screen mode: ${e.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    localStorage.setItem('shelem_font', selectedFont);
  }, [selectedFont]);

  useEffect(() => {
    localStorage.setItem('shelem_theme', selectedTheme);
    document.body.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    localStorage.setItem('shelem_show_chat', String(showChat));
  }, [showChat]);

  useEffect(() => {
    localStorage.setItem('shelem_card_back', cardBack);
  }, [cardBack]);

  useEffect(() => {
    localStorage.setItem('shelem_table_finish', tableFinish);
  }, [tableFinish]);

  useEffect(() => {
    localStorage.setItem('shelem_card_size', cardSize);
  }, [cardSize]);

  useEffect(() => {
    localStorage.setItem('shelem_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const showToast = (message: string, type: 'error' | 'info' | 'success' = 'error') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    localStorage.setItem('shelem_hide_player_ids', String(hidePlayerIds));
  }, [hidePlayerIds]);

  useEffect(() => {
    setIsActionLoading(false);
  }, [room.phase, room.currentTurn, room.currentTrick.length]);

  useEffect(() => {
    const stats = JSON.parse(localStorage.getItem('shelem_stats') || '{"wins": 0, "losses": 0, "games": 0}');
    setLocalStats(stats);
  }, []);

  useEffect(() => {
    socket.on('resign_requested', (data: any) => {
      setResignRequest(data);
    });

    socket.on('resign_rejected', () => {
      showToast('Your teammate rejected the resignation.', 'info');
    });

    socket.on('error_msg', (msg: string) => {
      setIsActionLoading(false);
      showToast(msg, 'error');
    });

    socket.on('player_reaction', ({ playerId, reaction }) => {
      setReactions(prev => ({ ...prev, [playerId]: reaction }));
      setTimeout(() => {
        setReactions(prev => {
          const next = { ...prev };
          delete next[playerId];
          return next;
        });
      }, 3000);
    });

    return () => {
      socket.off('resign_requested');
      socket.off('resign_rejected');
      socket.off('player_reaction');
      socket.off('error_msg');
    };
  }, [socket]);

    // Statistics Persistence
  useEffect(() => {
    if (room.phase === 'GAME_OVER') {
      const stats = JSON.parse(localStorage.getItem('shelem_stats') || '{"wins": 0, "losses": 0, "games": 0}');
      stats.games += 1;
      const myPlayer = room.players.find((p: any) => p.name === playerName);
      if (myPlayer) {
        const winningTeam = room.scores[0] > room.scores[1] ? 0 : 1;
        if (myPlayer.team === winningTeam) stats.wins += 1;
        else stats.losses += 1;
      }
      localStorage.setItem('shelem_stats', JSON.stringify(stats));
    }
  }, [room.phase]);

  const is2P = room.mode === '2_PLAYER';
  const isSpectator = !room.players.some((p: any) => p.name === playerName);

  // Normalize positions
  let myIndex = room.players.findIndex((p: any) => p.name === playerName);
  if (myIndex === -1) myIndex = spectatorPerspective; // Use chosen perspective for spectator
  
  const getOrderedPlayers = () => {
    if (is2P) {
      return [
        room.players[myIndex] || room.players[0],
        room.players[(myIndex + 1) % 2] || room.players[1],
      ];
    }
    return [
      room.players[myIndex] || room.players[0],
      room.players[(myIndex + 1) % 4] || room.players[1],
      room.players[(myIndex + 2) % 4] || room.players[2],
      room.players[(myIndex + 3) % 4] || room.players[3],
    ];
  };

  const orderedPlayers = getOrderedPlayers();

  const handleBid = (value: number | 'PASS') => {
    if (isSpectator || isActionLoading) return;
    setIsActionLoading(true);
    socket.emit('place_bid', { roomId: room.id, bid: value });
  };

  const handleAction = (card: CardData, fromPileIndex?: number) => {
    if (isSpectator || isActionLoading || !card) return;
    
    // Prevent multiple submissions if first one is still processing
    const isPlaying = room.phase === 'PLAYING';
    const isOwner = room.players[myIndex]?.cards.some((c: any) => c.suit === card.suit && c.rank === card.rank) || fromPileIndex !== undefined;
    
    if (!isOwner && isPlaying) return;

    if (room.phase === 'DISCARDING') {
      if (selectedCards.some(c => c.suit === card.suit && c.rank === card.rank)) {
        setSelectedCards(selectedCards.filter(c => !(c.suit === card.suit && c.rank === card.rank)));
      } else if (selectedCards.length < 4) {
        setSelectedCards([...selectedCards, card]);
      }
    } else if (isPlaying) {
      if (!isMyTurn) return;
      
      const allowed = getPossiblePlays();
      const isCardAllowed = allowed.some((c: any) => c.suit === card.suit && c.rank === card.rank);
      if (!isCardAllowed) {
        const trick = room.currentTrick;
        const suitNames: { [key: string]: string } = {
          SPADES: 'Hokm/Spades ♠',
          HEARTS: 'Hearts ♥',
          DIAMONDS: 'Diamonds ♦',
          CLUBS: 'Clubs ♣'
        };
        if (trick.length > 0) {
          const leadSuitName = suitNames[trick[0].card.suit] || trick[0].card.suit;
          showToast(`Must follow suit (${leadSuitName})! | باید از خال بازی شده (${leadSuitName}) بازی کنید!`, 'error');
        } else {
          showToast(`Invalid play! Check the suit constraints | بازی نامعتبر است.`, 'error');
        }
        return;
      }

      setIsActionLoading(true);
      socket.emit('play_card', { roomId: room.id, card, fromPileIndex });
    }
  };

  const confirmDiscard = (hokm: Suit) => {
    if (isSpectator || isActionLoading) return;
    if (selectedCards.length === 4) {
      setIsActionLoading(true);
      socket.emit('select_hokm_and_discard', { roomId: room.id, hokm, discards: selectedCards });
      setSelectedCards([]);
    }
  };

  const handleSendMessage = (text: string) => {
    socket.emit('send_message', { roomId: room.id, text });
  };

  const sendReaction = (reaction: string) => {
    socket.emit('send_reaction', { roomId: room.id, reaction });
    playSound('turn');
  };

  const getRankValue = (rank: string): number => {
    const values: { [key: string]: number } = {
      '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
    };
    return values[rank] || 0;
  };

  const getCurrentWinner = () => {
    const trick = room.currentTrick;
    if (trick.length === 0) return null;
    
    let winnerId = trick[0].playerId;
    let bestCard = trick[0].card;
    const leadSuit = bestCard.suit;

    for (let i = 1; i < trick.length; i++) {
        const { playerId, card } = trick[i];
        const isBetter = 
            (card.suit === bestCard.suit && getRankValue(card.rank) > getRankValue(bestCard.rank)) ||
            (card.suit === room.hokm && bestCard.suit !== room.hokm);
            
        if (isBetter) {
            winnerId = playerId;
            bestCard = card;
        }
    }
    return winnerId;
  };

  const handleResign = () => {
    if (room.phase === 'LOBBY') {
        alert('You can only resign once the game has started.');
        return;
    }
    if (window.confirm('Are you sure you want to resign? Your team will lose this game.')) {
      socket.emit('request_resign', { roomId: room.id });
      setShowSettings(false);
    }
  };

  const handleResignResponse = (approved: boolean) => {
    socket.emit('respond_resign', { roomId: room.id, approved });
    setResignRequest(null);
  };

  const handleExit = () => {
    localStorage.removeItem('shelem_last_room');
    window.location.reload(); // Simple way to exit and return to lobby for now
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      localStorage.removeItem('deep_shelem_user');
      localStorage.removeItem('shelem_last_room');
      window.location.reload();
    }
  };

  const isMyTurn = !isSpectator && room.currentTurn === myIndex;

  const getPossiblePlays = () => {
    if (!isMyTurn || room.phase !== 'PLAYING') return [];
    
    const myCards = room.players[myIndex]?.cards || [];
    const trick = room.currentTrick;
    const piles = room.piles[room.players[myIndex]?.id];

    // Check if it's the very first trick lead of the round
    const totalCardsInRound = room.players.reduce((sum: number, p: any) => sum + p.cards.length, 0);
    const expectedTotal = room.players.length * (is2P ? 12 : 12);
    const isFirstTrickLead = totalCardsInRound === expectedTotal && trick.length === 0;

    // If first card of trick
    if (trick.length === 0) {
        // Hakam must lead with Hokm (trump) as the very first card of the round
        const isHakam = room.players[myIndex]?.id === room.highestBid.bidderId;
        
        if (isFirstTrickLead && isHakam) {
            const trumps = myCards.filter((c: any) => c.suit === room.hokm);
            if (trumps.length > 0) return trumps;
        }
        return myCards;
    }

    const leadSuit = trick[0].card.suit;
    
    if (is2P && room.subPhase === 'PILE') {
        const topCards = piles.filter((p: any) => p.length > 0).map((p: any) => p[p.length - 1]);
        const hasSuit = topCards.some((c: any) => c.suit === leadSuit);
        if (hasSuit) return topCards.filter((c: any) => c.suit === leadSuit);
        return topCards;
    }

    const hasSuit = myCards.some((c: any) => c.suit === leadSuit);
    if (hasSuit) return myCards.filter((c: any) => c.suit === leadSuit);
    return myCards;
  };

  const possiblePlays = showPossiblePlays ? getPossiblePlays() : [];

  // Sound effects
  const playSound = (type: 'play' | 'win' | 'turn' | 'click') => {
    if (!soundEnabled) return;
    try {
        const context = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (context.state === 'suspended') {
            context.resume();
        }
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(context.destination);

        if (type === 'play') {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(440, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(220, context.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.1);
        } else if (type === 'turn') {
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(880, context.currentTime);
            gainNode.gain.setValueAtTime(0.05, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.05);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.05);
        } else if (type === 'win') {
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(523.25, context.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(659.25, context.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.1, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.3);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.3);
        } else {
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(1000, context.currentTime);
            gainNode.gain.setValueAtTime(0.05, context.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.02);
            oscillator.start();
            oscillator.stop(context.currentTime + 0.02);
        }
    } catch (e) {
        console.warn('Audio not supported', e);
    }
  };

  useEffect(() => {
    if (isMyTurn && room.phase === 'PLAYING') {
        playSound('turn');
    }
  }, [room.currentTurn, room.phase, isMyTurn]);

  useEffect(() => {
    if (room.lastTrickWinnerId) {
        playSound('win');
    }
  }, [room.lastTrickWinnerId]);

  return (
    <div 
      className="flex flex-col h-screen overflow-hidden text-white transition-colors duration-500"
      style={{ 
        fontFamily: selectedFont,
        backgroundColor: 'var(--game-bg)'
      }}
    >
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md px-3 md:px-6 py-2 md:py-4 flex justify-between items-center border-b border-white/10 shrink-0 z-50">
        <div className="flex items-center gap-2 md:gap-4">
          <div>
            <h1 className="text-sm md:text-xl font-black tracking-tighter uppercase leading-none">Deep Shelem</h1>
            <p className="hidden md:block text-[10px] text-yellow-500 font-bold uppercase tracking-widest">Classic Iranian Card Game</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          <div className="bg-white/10 px-2.5 md:px-4 py-1 md:py-2 rounded-full border border-white/20 flex items-center gap-1.5 md:gap-2 group relative">
            <span className="hidden sm:block text-[8px] md:text-[10px] font-bold opacity-70 tracking-widest uppercase">Room:</span>
            <span className="text-xs md:text-lg font-mono font-bold tracking-widest text-yellow-400">{room.id}</span>
            <button 
                onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.writeText(room.id);
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = room.id;
                      document.body.appendChild(textArea);
                      textArea.select();
                      document.execCommand("copy");
                      document.body.removeChild(textArea);
                    }
                    const btn = document.activeElement as HTMLElement;
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<span class="text-emerald-400 text-[10px]">COPIED!</span>';
                    setTimeout(() => { btn.innerHTML = originalText; }, 2000);
                }}
                className="p-1 hover:bg-white/10 rounded-md transition-all text-white/20 hover:text-emerald-400"
                title="Copy Room ID"
            >
                <div className="scale-75"><Copy size={12} /></div>
            </button>
          </div>

          {room.spectators && room.spectators.length > 0 && (
            <div className="bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 md:px-3.5 py-1 md:py-2 rounded-full border border-emerald-500/20 flex items-center gap-1.5 text-emerald-400 select-none transition-all duration-300 shadow-[0_4px_12px_rgba(16,185,129,0.05)]" title={`${room.spectators.length} Spectator(s) watching`}>
              <Eye size={14} className="animate-pulse shrink-0" />
              <span className="text-xs font-black leading-none">{room.spectators.length}</span>
              <span className="hidden sm:inline text-[8px] font-black uppercase tracking-wider opacity-60">Spectating</span>
            </div>
          )}
          <div className="flex gap-1 md:gap-2">
            {isSpectator && (
              <button 
                onClick={() => setShowHistory(!showHistory)}
                className={`p-2.5 rounded-full transition-all border ${showHistory ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 hover:bg-white/10 text-emerald-400 border-white/10'}`}
                title="Match History"
              >
                <Info size={18} />
              </button>
            )}
            <button 
              onClick={() => setShowStats(!showStats)}
              className="lg:hidden p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-emerald-400"
              title="Stats"
            >
              <Users size={18} />
            </button>
            <button 
              onClick={() => setShowNews(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-yellow-500"
              title="What's New"
            >
              <Newspaper size={18} />
            </button>
            <button 
              onClick={() => setShowRules(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-emerald-400"
              title="Game Rules"
            >
              <HelpCircle size={18} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-white/60"
              title="Settings"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row p-3 md:p-6 gap-3 md:gap-6 relative overflow-hidden">
        {/* Game Area */}
        <div 
            className="flex-1 relative rounded-[30px] md:rounded-[60px] border-[6px] md:border-[12px] shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center overflow-hidden min-h-[300px] transition-colors duration-500"
            style={{ 
                backgroundColor: 'var(--game-felt)',
                borderColor: 'var(--game-bg)'
            }}
        >
          {/* Surface Textures */}
          {tableFinish === 'smooth' && (
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }} />
          )}
          {tableFinish === 'leather' && (
            <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/leather.png")' }} />
          )}
          {tableFinish === 'wood' && (
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png")' }} />
          )}
          {tableFinish === 'felt' && (
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")' }} />
          )}
          {tableFinish === 'granite' && (
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-matter.png")' }} />
          )}
          {tableFinish === 'carbon' && (
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
          )}
          
          {/* Decorative Felt Circle */}
          <div className="absolute w-[250px] h-[250px] md:w-[500px] md:h-[500px] rounded-full border border-white/5 opacity-20 pointer-events-none" />
          <div className="absolute w-[150px] h-[150px] md:w-[300px] md:h-[300px] rounded-full border border-white/10 opacity-10 pointer-events-none" />

          {/* Trick Area (Center) */}
          <div className="relative z-10 w-full aspect-square max-w-[200px] md:max-w-none md:w-96 md:h-96 flex items-center justify-center">
            {/* Table Surface Reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent rounded-full blur-3xl opacity-20 pointer-events-none" />
            
            <AnimatePresence>
              {room.currentTrick.map((trick: any, i: number) => {
                const pIdx = room.players.findIndex((p: any) => p.id === trick.playerId);
                // Normalize position
                let pos = 0;
                if (is2P) {
                  pos = pIdx === myIndex ? 0 : 2; // Bottom or Top
                } else {
                  pos = (pIdx - myIndex + 4) % 4; // 0: Bottom, 1: Right, 2: Top, 3: Left
                }
                
                const angles = [0, 90, 180, 270];
                
                // If the trick was recently resolved (lastTrickWinnerId is set), move cards to winner
                const winnerIndex = room.players.findIndex((p: any) => p.id === room.lastTrickWinnerId);
                let winnerPos = 0;
                if (is2P) {
                    winnerPos = winnerIndex === myIndex ? 0 : 2;
                } else {
                    winnerPos = (winnerIndex - myIndex + 4) % 4;
                }

                const exitPos = [
                    { x: 0, y: 300 }, // Bottom
                    { x: 300, y: 0 }, // Right
                    { x: 0, y: -300 }, // Top
                    { x: -300, y: 0 }, // Left
                ];

                const isFollowedPlayerCard = trick.playerId === room.players[myIndex]?.id;

                return (
                  <motion.div
                    key={`${trick.playerId}-${i}`}
                    initial={{ 
                        scale: 0.8, 
                        opacity: 0, 
                        y: pos === 0 ? 200 : pos === 2 ? -200 : 0,
                        x: pos === 3 ? -200 : pos === 1 ? 200 : 0,
                        rotate: angles[pos]
                    }}
                    animate={{ 
                      scale: 1.1, 
                      opacity: 1,
                      y: pos === 0 ? 60 : pos === 2 ? -60 : 0,
                      x: pos === 3 ? -60 : pos === 1 ? 60 : 0,
                      rotate: angles[pos] + (Math.random() * 8 - 4) + (trick.fromPile ? 5 : -5)
                    }}
                    transition={{ 
                        type: "spring", 
                        damping: 20, 
                        stiffness: 150,
                        mass: 0.8
                    }}
                    exit={{ 
                        scale: 0.2, 
                        opacity: 0, 
                        x: exitPos[winnerPos]?.x || 0, 
                        y: exitPos[winnerPos]?.y || 0, 
                        transition: { duration: 0.5, ease: "circIn" } 
                    }}
                    className="absolute z-[40]"
                  >
                    {isFollowedPlayerCard && (
                        <div className="absolute -inset-2 bg-emerald-500/30 rounded-2xl blur-xl animate-pulse" />
                    )}
                    <Card 
                        card={trick.card} 
                        layoutId={`card-${trick.card.suit}-${trick.card.rank}`} 
                        highlighted={isFollowedPlayerCard}
                        size={cardSize}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {room.phase === 'LOBBY' && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="p-6 bg-black/40 backdrop-blur-xl rounded-full border border-white/10">
                  <Users size={48} className="text-emerald-500 animate-pulse" />
                </div>
                <p className="text-emerald-400 font-black uppercase tracking-[0.2em] text-[10px]">
                  Waiting for { (is2P ? 2 : 4) - room.players.length} more players
                </p>
              </div>
            )}

            {/* Center Area (Empty) */}
            <div className="relative z-10 w-full aspect-square md:w-96 md:h-96 flex items-center justify-center pointer-events-none" />
             
            {/* Overlays (BIDDING, DISCARDING) */}
            <AnimatePresence>
                {room.phase === 'BIDDING' && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-10 pointer-events-auto bg-black/40 backdrop-blur-sm"
                    >
                        <BiddingOverlay 
                            room={room}
                            isMyTurn={isMyTurn}
                            onBid={handleBid}
                            isLoading={isActionLoading}
                        />
                    </motion.div>
                )}

                {room.phase === 'DISCARDING' && isMyTurn && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-10 pointer-events-auto bg-black/40 backdrop-blur-sm"
                    >
                        <DiscardOverlay 
                            selectedCards={selectedCards}
                            onConfirm={confirmDiscard}
                            isLoading={isActionLoading}
                        />
                    </motion.div>
                )}
            </AnimatePresence>


            {room.hokm && room.phase !== 'LOBBY' && (
              <div className="absolute top-[-140px] bg-black/50 px-6 py-2 rounded-full border border-white/10 flex items-center gap-3 backdrop-blur-sm">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Trump:</span>
                <SuitIcon suit={room.hokm} />
                <div className="w-px h-4 bg-white/10 mx-1" />
                <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Goal: {room.highestBid.value}</span>
              </div>
            )}
          </div>

          {/* Piles for 2-Player mode */}
          {is2P && room.phase !== 'LOBBY' && (
             <div className="absolute inset-x-0 inset-y-0 pointer-events-none flex flex-col justify-between py-16 md:py-[120px] items-center">
                {/* Opponent Piles (Top) */}
                <div className="flex flex-col items-center gap-1 md:gap-2 scale-75 md:scale-100">
                    <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Opponent Ground Piles</span>
                    <div className="flex gap-3 md:gap-6 rotate-180 pointer-events-auto bg-black/20 p-2 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-2xl relative">
                        <div className="absolute inset-0 bg-rose-500/5 rounded-[1.5rem] md:rounded-[2.5rem] pointer-events-none" />
                        {room.piles[room.players[(myIndex + 1) % 2]?.id]?.map((pile: any, pIdx: number) => (
                            <div key={pIdx} className="relative w-10 h-14 md:w-14 md:h-20 group">
                                {pile.length > 1 && (
                                    <div className="absolute inset-0 bg-black/40 rounded-lg shadow-sm -mt-2 -ml-1 border border-white/5 rotate-2" />
                                )}
                                {pile.length > 2 && (
                                    <div className="absolute inset-0 bg-black/40 rounded-lg shadow-sm -mt-1 -ml-0.5 border border-white/5 -rotate-1" />
                                )}
                                {pile.length > 0 && (
                                    <div className="relative h-full scale-90 md:scale-100">
                                        <div className="absolute -inset-1 bg-white/5 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <Card 
                                            card={pile[pile.length - 1]} 
                                            small 
                                            disabled
                                        />
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/80 px-1 md:px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black text-white/60 border border-white/10">
                                            {pile.length}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Piles (Bottom) */}
                <div className="flex flex-col items-center gap-1 md:gap-2 scale-75 md:scale-100">
                    <div className="flex gap-3 md:gap-6 pointer-events-auto bg-black/20 p-2 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] border border-white/5 backdrop-blur-md shadow-2xl relative">
                        <div className="absolute inset-0 bg-emerald-500/5 rounded-[1.5rem] md:rounded-[2.5rem] pointer-events-none" />
                        {room.piles[room.players[myIndex]?.id]?.map((pile: any, pIdx: number) => {
                            const topCard = pile[pile.length - 1];
                            const isPlayable = isMyTurn && room.subPhase === 'PILE' && topCard;
                            const isHighlighted = possiblePlays.some((p: any) => p.suit === topCard?.suit && p.rank === topCard?.rank);

                            return (
                                <div key={pIdx} className="relative w-10 h-14 md:w-14 md:h-20 group">
                                    {pile.length > 1 && (
                                        <div className="absolute inset-0 bg-black/40 rounded-lg shadow-sm -mt-2 -ml-1 border border-white/5 rotate-2" />
                                    )}
                                    {pile.length > 2 && (
                                        <div className="absolute inset-0 bg-black/40 rounded-lg shadow-sm -mt-1 -ml-0.5 border border-white/5 -rotate-1" />
                                    )}
                                    {pile.length > 0 && (
                                        <div className={`relative h-full transition-all duration-300 scale-90 md:scale-100 ${isPlayable ? 'hover:-translate-y-3 cursor-pointer' : ''}`}>
                                            {isHighlighted && (
                                                <motion.div 
                                                    layoutId={`pile-highlight-${pIdx}`}
                                                    className="absolute -inset-2 bg-yellow-500/30 rounded-2xl blur-md"
                                                    animate={{ opacity: [0.3, 0.8, 0.3], scale: [1, 1.1, 1] }}
                                                    transition={{ duration: 1, repeat: Infinity }}
                                                />
                                            )}
                                            <Card 
                                                card={topCard} 
                                                small 
                                                onClick={() => {
                                                    if (isPlayable) {
                                                        playSound('play');
                                                        handleAction(topCard, pIdx);
                                                    }
                                                }}
                                                highlighted={isHighlighted}
                                                layoutId={`card-${topCard.suit}-${topCard.rank}`}
                                                disabled={!isPlayable}
                                            />
                                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-black/80 px-1 md:px-1.5 py-0.5 rounded text-[7px] md:text-[8px] font-black text-white/60 border border-white/10">
                                                {pile.length}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <span className="text-[7px] md:text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Your Ground Piles</span>
                </div>
             </div>
          )}

          {/* Player Positions */}
          {orderedPlayers.map((player: any, i: number) => {
            if (!player) return null;
            let mdPosStyles = [
              'bottom-4 md:bottom-6 left-1/2 -translate-x-1/2', // Bottom (YOU)
              'right-2 md:right-8 top-1/2 -translate-y-1/2', // Right
              'top-4 md:top-8 left-1/2 -translate-x-1/2', // Top
              'left-2 md:left-8 top-1/2 -translate-y-1/2', // Left
            ];
            if (is2P) {
                mdPosStyles = [
                    'bottom-4 md:bottom-6 left-1/2 -translate-x-1/2', // YOU
                    'top-4 md:top-8 left-1/2 -translate-x-1/2', // OPPONENT
                ];
            }
            
            const pRealIdx = room.players.findIndex((p:any) => p.id === player.id);
            const isTurn = room.currentTurn === pRealIdx;
            const isDealer = room.dealerIndex === pRealIdx;

            return (
              <div key={player.id} className={`absolute ${mdPosStyles[i]} z-20 flex flex-col items-center scale-75 md:scale-100 transition-transform`}>
                <div className="relative">
                  {isTurn && (
                    <motion.div 
                      layoutId="turn-glow"
                      className="absolute -inset-4 bg-yellow-500/30 rounded-full blur-2xl scale-125"
                      animate={{ 
                        opacity: [0.4, 0.8, 0.4],
                        scale: [1.2, 1.4, 1.2]
                      }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    />
                  )}
                  {isTurn && (
                    <motion.div 
                      className="absolute -inset-1 rounded-full border-2 border-yellow-400 z-20"
                      animate={{ scale: [1, 1.1, 1], opacity: [1, 0, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
                  
                  {/* Reaction Bubble */}
                  <AnimatePresence>
                    {showReactions && reactions[player.id] && (
                        <motion.div
                            initial={{ scale: 0, y: 0, opacity: 0 }}
                            animate={{ scale: 1.2, y: -40, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="absolute -top-4 left-1/2 -translate-x-1/2 z-[60] bg-white rounded-2xl px-2 py-1 shadow-2xl"
                        >
                            <span className="text-xl">{reactions[player.id]}</span>
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white" />
                        </motion.div>
                    )}
                  </AnimatePresence>

                  <div className={`
                    w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-500 relative z-10 overflow-hidden
                    ${isTurn ? 'border-yellow-500 scale-110 shadow-[0_0_30px_rgba(234,179,8,0.6)]' : 'border-white/20'}
                  `}>
                    <PlayerAvatar avatar={player.avatar || '🧔'} />
                    {isTurn && (
                        <div className="absolute inset-0 rounded-full border-[6px] border-yellow-400/30 animate-ping pointer-events-none" />
                    )}
                    {isDealer && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#14452f] shadow-lg z-20">
                        <Crown size={12} className="text-black fill-black" />
                      </div>
                    )}
                  </div>
                </div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-2">
                <p className={`font-bold text-sm ${isTurn ? 'text-yellow-400' : 'text-white'}`}>
                  {player.name} {(!isSpectator && player.id === room.players[myIndex]?.id) ? '(YOU)' : ''}
                </p>
                {!hidePlayerIds && (
                  <span className="text-[8px] font-mono text-white/30 bg-black/30 px-1 rounded">#{player.id.slice(0, 4)}</span>
                )}
              </div>
            </div>
                <div className={`
                  px-2 py-0.5 rounded text-[10px] font-bold mt-1 uppercase transition-colors
                  ${isTurn ? 'bg-yellow-500 text-black' : 'bg-black/40 text-white/60'}
                `}>
                   {isTurn && room.mode === '2_PLAYER' ? (room.subPhase === 'HAND' ? 'PLAY FROM HAND' : 'PLAY FROM PILE') : `${player.cards.length} Cards Left`}
                </div>
              </div>
            );
          })}

          {/* My Hand at Bottom */}
          <div className="absolute bottom-[-10px] md:bottom-[-20px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto w-full max-w-7xl mx-auto overflow-hidden">
            {isSpectator && room.phase !== 'LOBBY' && (
                <div className="flex justify-center mb-1">
                    <span className="text-[10px] font-black text-yellow-500 bg-black/60 px-4 py-1.5 rounded-full border border-yellow-500/30 backdrop-blur-md uppercase tracking-[0.2em] shadow-xl">
                        Watching {room.players[myIndex]?.name}'s Hand
                    </span>
                </div>
            )}
            <div className={`flex justify-center -space-x-6 md:-space-x-10 lg:-space-x-6 px-4 pb-12 transition-all duration-300 scale-[0.7] sm:scale-[0.8] md:scale-90 lg:scale-100 origin-bottom`}>
                {room.players[myIndex]?.cards.map((c: CardData, i: number) => (
                  <Card 
                    key={`${c.suit}-${c.rank}`} 
                    card={c} 
                    size={cardSize}
                    onClick={() => {
                        if (!isSpectator) {
                            playSound('play');
                            handleAction(c);
                        }
                    }}
                    selected={selectedCards.some(sc => sc.suit === c.suit && sc.rank === c.rank)}
                    highlighted={possiblePlays.some((p: any) => p.suit === c.suit && p.rank === c.rank)}
                    layoutId={`card-${c.suit}-${c.rank}`}
                    disabled={isSpectator || (!isMyTurn && room.phase === 'PLAYING') || (room.phase === 'PLAYING' && is2P && room.subPhase === 'PILE') || (room.phase === 'DISCARDING' && !isMyTurn)}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className={`
          ${showStats ? 'fixed inset-0 z-50 bg-[#0a2e1f] p-4 flex flex-col lg:relative lg:inset-auto lg:z-0 lg:p-0' : 'hidden lg:flex'} 
          w-full lg:w-72 flex flex-col gap-4 animate-in slide-in-from-right duration-300
        `}>
          {showStats && (
            <>
              <div className="lg:hidden flex justify-between items-center mb-4">
                <h2 className="text-lg font-black uppercase text-emerald-400">Match Details</h2>
                <button onClick={() => setShowStats(false)} className="p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-2.5 bg-yellow-400/10 border border-yellow-400/20 rounded-2xl">
                 <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest text-center">Spectator Mode</p>
                 <div className="flex flex-col gap-2 mt-3">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-tighter ml-1">Follow Perspective:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                        {room.players.map((p: any, idx: number) => (
                            <button
                                key={p.id}
                                onClick={() => setSpectatorPerspective(idx)}
                                className={`py-1.5 px-2 rounded-xl text-[8px] font-black uppercase transition-all truncate border ${spectatorPerspective === idx ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                 </div>
              </div>
            </>
          )}

          {isSpectator && showHistory && (
            <div className="bg-black/40 border border-white/10 rounded-[32px] p-5 flex flex-col min-h-[300px] max-h-[400px] animate-in fade-in slide-in-from-top-4 duration-300">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Trick History</h3>
                  <button onClick={() => setShowHistory(false)} className="text-white/20 hover:text-white transition-colors">
                     <X size={14} />
                  </button>
               </div>
               
               <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {room.trickHistory.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-6">
                        <p className="text-[10px] font-bold text-white/20 italic uppercase tracking-widest leading-loose">No tricks played yet in this round</p>
                    </div>
                  ) : (
                    [...room.trickHistory].reverse().map((trick: any, i: number) => (
                        <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-2xl">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-tighter">Winner: {trick.winnerName}</span>
                                <span className="text-[8px] font-black text-yellow-500">+{trick.points} pts</span>
                            </div>
                            <div className="flex gap-1.5 justify-center">
                                {trick.cards.map((c: any, ci: number) => (
                                    <div key={ci} className="scale-75 origin-center">
                                        <Card card={c} small disabled />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                  )}
               </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 rounded-[32px] p-5 flex flex-col flex-1 min-h-0 backdrop-blur-md -webkit-backdrop-blur-md">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4 flex justify-between items-center">
              Room Analysis
              <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">v1.3.2</span>
            </h3>
            
            <div className={`grid grid-cols-2 gap-4 text-center border-b border-white/10 pb-6 mb-6`}>
              <div className="relative group p-1">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1 truncate opacity-70">
                  {is2P ? (room.players[0]?.name || 'P1') : 'TEAM RED'}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <motion.p 
                        key={room.scores[0]}
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-3xl font-black tabular-nums tracking-tighter"
                    >
                        {room.scores[0]}
                    </motion.p>
                    <span className="text-[10px] font-bold text-white/20">pts</span>
                </div>
                <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (room.scores[0] / (room.mode === '2_PLAYER' ? 1200 : 660)) * 100)}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                        transition={{ type: 'spring', damping: 15 }}
                    />
                </div>
              </div>
              <div className="relative group p-1">
                <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1 truncate opacity-70">
                   {is2P ? (room.players[1]?.name || 'P2') : 'TEAM BLUE'}
                </p>
                <div className="flex items-baseline justify-center gap-1">
                    <motion.p 
                        key={room.scores[1]}
                        initial={{ y: 5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-3xl font-black tabular-nums tracking-tighter"
                    >
                        {room.scores[1]}
                    </motion.p>
                    <span className="text-[10px] font-bold text-white/20">pts</span>
                </div>
                <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (room.scores[1] / (room.mode === '2_PLAYER' ? 1200 : 660)) * 100)}%` }}
                        className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]"
                        transition={{ type: 'spring', damping: 15 }}
                    />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-5 pr-1 custom-scrollbar">
                {/* Round Performance Card */}
                {room.phase !== 'LOBBY' && (
                    <div className="bg-black/30 rounded-2xl p-4 border border-white/5 space-y-4">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Round Points</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-1.5 h-1.5 rounded-full ${room.phase === 'PLAYING' ? 'bg-emerald-500 animate-pulse' : 'bg-white/20'}`} />
                                <span className="text-[8px] font-black text-white/30 uppercase">LIVE</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Team 0 Round Score */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-emerald-500 opacity-60 truncate max-w-[80px]">
                                        {is2P ? (room.players[0]?.name || 'P1') : 'Team Red'}
                                    </span>
                                    <span className="text-white tabular-nums">{room.pointsThisRound[0]} / 165</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[1px]">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(room.pointsThisRound[0] / 165) * 100}%` }}
                                        className="h-full bg-emerald-500 rounded-full"
                                    />
                                </div>
                            </div>

                            {/* Team 1 Round Score */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-[10px] font-black uppercase">
                                    <span className="text-orange-500 opacity-60 truncate max-w-[80px]">
                                        {is2P ? (room.players[1]?.name || 'P2') : 'Team Blue'}
                                    </span>
                                    <span className="text-white tabular-nums">{room.pointsThisRound[1]} / 165</span>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[1px]">
                                    <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(room.pointsThisRound[1] / 165) * 100}%` }}
                                        className="h-full bg-orange-500 rounded-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Bid Progress (Specific to bidder) */}
                        {room.highestBid.bidderId && (
                            <div className="pt-2 border-t border-white/5">
                                <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-white/20">
                                    <span>Bidder Goal ({room.highestBid.value})</span>
                                    {(() => {
                                        const bidderTeam = room.players.find((p:any) => p.id === room.highestBid.bidderId)?.team;
                                        const progress = room.pointsThisRound[bidderTeam];
                                        const isMet = progress >= room.highestBid.value;
                                        return <span className={isMet ? 'text-emerald-400' : 'text-rose-400'}>{isMet ? 'GOAL MET' : `${room.highestBid.value - progress} LEFT`}</span>;
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Individual Player Stats Card */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1 mb-2">
                    <p className="text-[10px] font-black uppercase text-white/20 tracking-widest italic">Performance Metrics</p>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  {room.players.map((p: any) => {
                    const winRate = p.stats?.games > 0 ? ((p.stats.wins / p.stats.games) * 100).toFixed(0) : 0;
                    const isTurn = room.players.findIndex((player: any) => player.id === p.id) === room.currentTurn;
                    return (
                      <div key={p.id} className={`bg-white/5 rounded-2xl p-3 border transition-all ${isTurn ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-white/5 hover:bg-white/10'}`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full overflow-hidden border ${isTurn ? 'border-emerald-500' : 'border-white/10'}`}>
                                    <PlayerAvatar avatar={p.avatar || '🧔'} />
                                </div>
                                <div>
                                    <p className={`text-[10px] font-bold leading-none mb-1 ${isTurn ? 'text-emerald-400' : 'text-white'}`}>{p.name}</p>
                                    <p className="text-[8px] font-mono text-white/20">Hand: {p.cards.length} cards</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-emerald-400">{winRate}%</p>
                                <p className="text-[8px] uppercase font-black text-white/20">Wins</p>
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Round Info Header */}
                {room.hokm && (
                   <div className="bg-black/40 rounded-2xl p-4 border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <SuitIcon suit={room.hokm} size={18} />
                         <span className="text-[10px] font-black uppercase text-emerald-400">TRUMP</span>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] text-white/40 uppercase font-bold">Goal Bid</p>
                         <p className="text-sm font-black text-white">{room.highestBid.value}</p>
                      </div>
                   </div>
                )}

                {/* Scoreboard Idea: Visual Progress Bar */}
                <div className="bg-black/20 rounded-2xl p-4 border border-white/5">
                   <div className="flex justify-between text-[8px] font-black text-white/30 uppercase mb-2">
                      <span>Team Red</span>
                      <span>Team Blue</span>
                   </div>
                   <div className="h-3 bg-white/5 rounded-full overflow-hidden flex border border-white/5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(room.scores[0] / (room.mode === '2_PLAYER' ? 1200 : 660)) * 100}%` }}
                        className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      />
                      <div className="w-px bg-white/20 h-full" />
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(room.scores[1] / (room.mode === '2_PLAYER' ? 1200 : 660)) * 100}%` }}
                        className="h-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)] ml-auto"
                      />
                   </div>
                </div>

                {/* Round Points */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-500/5 rounded-2xl p-3 border border-emerald-500/10 text-center">
                    <p className="text-[8px] font-black text-emerald-500/60 uppercase mb-1">Round Pts</p>
                    <p className="text-xl font-black text-emerald-400">{room.pointsThisRound[0]}</p>
                  </div>
                  <div className="bg-orange-500/5 rounded-2xl p-3 border border-orange-500/10 text-center">
                    <p className="text-[8px] font-black text-orange-500/60 uppercase mb-1">Round Pts</p>
                    <p className="text-xl font-black text-orange-400">{room.pointsThisRound[1]}</p>
                  </div>
                </div>

                {/* Trick History (New Idea) */}
                {room.trickHistory && room.trickHistory.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/5">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-4">Round History</p>
                    <div className="space-y-2">
                      {room.trickHistory.map((trick: any, idx: number) => (
                        <motion.div 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          key={idx} 
                          className="flex items-center justify-between p-2.5 bg-black/30 rounded-xl border border-white/5 group"
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex -space-x-1.5 scale-75 origin-left">
                              {trick.cards.map((c: any, cIdx: number) => (
                                <div key={cIdx} className="w-6 h-8 bg-white/10 rounded-sm border border-white/20 flex items-center justify-center overflow-hidden">
                                  <SuitIcon suit={c.suit} size={10} />
                                </div>
                              ))}
                            </div>
                            <span className="text-[10px] font-bold text-white/60 truncate max-w-[80px]">{trick.winnerName}</span>
                          </div>
                          <span className="text-[10px] font-black text-yellow-500">+{trick.points}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-[8px] text-white/40 font-black">TOTAL SCORE</span>
                    <span className="text-2xl font-black text-emerald-400">{room.scores[0]}</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10">
                    <span className="text-[8px] text-white/40 font-black">TOTAL SCORE</span>
                    <span className="text-2xl font-black text-orange-400">{room.scores[1]}</span>
                  </div>
                </div>
            </div>
          </div>

          <div className="bg-black/40 rounded-[32px] p-5 border border-white/5">
            <h4 className="text-[9px] font-black uppercase tracking-widest text-white/40 mb-3">Live Session</h4>
            <div className="grid grid-cols-2 gap-3">
               <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-white/30 uppercase mb-1">Round</p>
                  <p className="text-sm font-bold text-emerald-400">#{room.roundCount}</p>
               </div>
               <div className="p-3 bg-white/5 rounded-xl border border-white/5 text-center">
                  <p className="text-[8px] font-black text-white/30 uppercase mb-1">Mode</p>
                  <p className="text-sm font-bold">{room.mode.split('_')[0]}P</p>
               </div>
            </div>
          </div>
        </div>
      </main>

      {showChat && (
        <Chat 
          messages={room.messages || []} 
          playerName={playerName} 
          onSendMessage={handleSendMessage} 
        />
      )}

      {/* Quick Reactions Bar */}
      {!isSpectator && showEmojiBar && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/60 backdrop-blur-xl px-5 py-3 rounded-full border border-white/20 flex gap-4 shadow-2xl shadow-black/40">
            {['👋', '😂', '🔥', '🤔', '👍', '👎', '🤞'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className="hover:scale-125 transition-transform text-xl"
                >
                    {emoji}
                </button>
            ))}
        </div>
      )}

      <AnimatePresence>
        {resignRequest && (
            <Modal title="Resign Request" onClose={() => setResignRequest(null)}>
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto border-2 border-rose-500/20 text-rose-500">
                        <Flag size={40} />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-white">{resignRequest.requesterName} wants to resign.</h3>
                        <p className="text-sm text-white/40 mt-1">If you accept, your team will lose this game.</p>
                    </div>
                    <div className="flex gap-4">
                        <button 
                            onClick={() => handleResignResponse(false)}
                            className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-black uppercase tracking-widest transition-all"
                        >
                            Decline
                        </button>
                        <button 
                            onClick={() => handleResignResponse(true)}
                            className="flex-1 py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-500/20 transition-all"
                        >
                            Accept
                        </button>
                    </div>
                </div>
            </Modal>
        )}
      </AnimatePresence>

      {/* Overlays */}
      <AnimatePresence>
        {showNews && (
            <Modal title="Deep Shelem Chronicle" onClose={() => setShowNews(false)} density="COMPACT">
                <div className="space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
                    {/* Latest Release */}
                    <div className="space-y-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
                        <div className="flex items-center justify-between relative z-10">
                            <span className="bg-emerald-500 text-black text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest leading-none shadow-md">v1.4.0 Stable</span>
                            <span className="text-[10px] font-bold text-emerald-400">LATEST RELEASE</span>
                        </div>
                        <h3 className="text-white font-black text-base relative z-10 uppercase tracking-wide">Client Guardians & Spectators</h3>
                        <div className="space-y-3 text-xs text-white/75 leading-relaxed relative z-10">
                            <div className="flex gap-3">
                                <div className="p-1 rounded bg-rose-500/20 text-rose-300 font-black text-[8px] h-fit uppercase tracking-wider shrink-0">BUG FIX</div>
                                <p><span className="text-white font-bold">Active Shield for Follow-Suit:</span> Select cards freely again after choosing an invalid card. Re-selection is instantly unlocked with a friendly banner reminder, preventing any turn lockups.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="p-1 rounded bg-emerald-500/20 text-emerald-300 font-black text-[8px] h-fit uppercase tracking-wider shrink-0">NEW</div>
                                <p><span className="text-white font-bold">Live Spectator Badge:</span> Real-time viewer count is now broadcast right next to the Room Code in the workspace header!</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="p-1 rounded bg-teal-500/20 text-teal-300 font-black text-[8px] h-fit uppercase tracking-wider shrink-0">NEW</div>
                                <p><span className="text-white font-bold">Privacy Toggle:</span> Added a new option to settings allowing players to hide or reveal Player hash IDs on the board layout.</p>
                            </div>
                        </div>
                    </div>

                    {/* Previous Release */}
                    <div className="space-y-3 p-4 bg-white/5 border border-white/5 rounded-3xl relative overflow-hidden">
                        <div className="flex items-center justify-between">
                            <span className="bg-white/10 text-white/60 text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest leading-none">v1.3.2</span>
                            <span className="text-[10px] font-bold text-white/30">PREVIOUS RELEASE</span>
                        </div>
                        <h3 className="text-white/80 font-black text-sm uppercase tracking-wide">Spectator Lens & Scaling</h3>
                        <div className="space-y-2 text-xs text-white/50 leading-relaxed">
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30 mt-1.5 shrink-0" />
                                <p><span className="text-white/70 font-bold">Spectator Cameras:</span> Choose any active player's perspective from the sidebar control panel.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30 mt-1.5 shrink-0" />
                                <p><span className="text-white/70 font-bold">Trick Log History:</span> Real-time scoreboard log showing exact plays of the previous 5 tricks.</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/30 mt-1.5 shrink-0" />
                                <p><span className="text-white/70 font-bold">Responsive Card Scaling:</span> Configure card dimensions (Small, Medium, Large) directly from settings.</p>
                            </div>
                        </div>
                    </div>

                    {/* Upcoming */}
                    <div className="p-4 bg-yellow-500/5 border border-yellow-500/10 rounded-2xl flex gap-3 items-center">
                        <span className="text-xl">🚀</span>
                        <div>
                            <p className="text-[9px] font-black text-yellow-500 uppercase tracking-widest leading-none mb-1">Coming Next</p>
                            <p className="text-[11px] text-white/40 leading-normal font-medium leading-tight">Ranked multiplayer leagues, custom profile cards, and team voice communication are coming up!</p>
                        </div>
                    </div>

                    <button 
                        onClick={() => setShowNews(false)}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-lg transition-all uppercase tracking-[0.2em] text-[10px] shrink-0"
                    >
                        Acknowledge & Play
                    </button>
                </div>
            </Modal>
        )}
        {showRules && (
            <Modal title="Game Rules" onClose={() => setShowRules(false)} density="COMPACT">
                <div className="grid grid-cols-2 gap-4 md:gap-6 text-[10px] md:text-sm leading-relaxed text-white/80">
                    <div className="space-y-4">
                      <section>
                          <h3 className="text-emerald-400 font-black uppercase text-[10px] mb-1">Intro</h3>
                          <p>Goal: Reach {room.mode === '2_PLAYER' ? '1200' : '660'} points by winning tricks with point-cards (5, 10, Ace).</p>
                      </section>

                      <section>
                          <h3 className="text-yellow-500 font-black uppercase text-[10px] mb-1">Bidding</h3>
                          <p>Starts at 100. Highest bidder (Hakam) picks Trump suit and gets 4 center cards.</p>
                      </section>

                      <section>
                          <h3 className="text-rose-400 font-black uppercase text-[10px] mb-1">Penalties</h3>
                          <p>Failing bid costs double the bid value. Opponents gain their own points.</p>
                      </section>
                    </div>

                    <div className="space-y-4">
                      <section>
                          <h3 className="text-emerald-400 font-black uppercase text-[10px] mb-1">Cards</h3>
                          <ul className="space-y-1">
                              <li><span className="text-yellow-500 font-bold">5</span> = 5 Pts • <span className="text-yellow-500 font-bold">10/A</span> = 10 Pts</li>
                              <li>Total per round: <span className="text-emerald-400 font-bold">165</span></li>
                          </ul>
                      </section>

                      <section>
                          <h3 className="text-yellow-500 font-black uppercase text-[10px] mb-1">Shelem</h3>
                          <p>Winning all 165 points in a round awards double bonus points (330).</p>
                      </section>

                      <section>
                          <h3 className="text-blue-400 font-black uppercase text-[10px] mb-1">2-Player</h3>
                          <p>Each has 3 piles of 4 cards on the ground. You must follow suit from hand and visible piles.</p>
                      </section>
                    </div>
                </div>
            </Modal>
        )}
        {showSettings && (
            <Modal title="Game Options" onClose={() => setShowSettings(false)} density="COMPACT">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start">
                    <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase text-white/40 italic tracking-widest">Theme & Colors</label>
                            <div className="flex gap-1">
                                {[
                                    { id: 'emerald', color: '#10b981' },
                                    { id: 'rose', color: '#f43f5e' },
                                    { id: 'amber', color: '#f59e0b' },
                                    { id: 'midnight', color: '#818cf8' },
                                    { id: 'purple', color: '#a855f7' },
                                    { id: 'teal', color: '#14b8a6' },
                                ].map(theme => (
                                    <button
                                        key={theme.id}
                                        onClick={() => setSelectedTheme(theme.id)}
                                        className={`w-4 h-4 rounded-full border border-white/20 transition-all ${selectedTheme === theme.id ? 'scale-125 border-white ring-2 ring-white/20' : 'opacity-40 hover:opacity-100'}`}
                                        style={{ backgroundColor: theme.color }}
                                    />
                                ))}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                             <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Table Surface Finish</p>
                             <div className="grid grid-cols-3 gap-1.5">
                                {[
                                    { id: 'smooth', name: 'Smooth' },
                                    { id: 'felt', name: 'Royal' },
                                    { id: 'leather', name: 'Leather' },
                                    { id: 'wood', name: 'Wood' },
                                    { id: 'granite', name: 'Granite' },
                                    { id: 'carbon', name: 'Carbon' }
                                ].map(finish => (
                                    <button 
                                        key={finish.id}
                                        onClick={() => setTableFinish(finish.id)}
                                        className={`py-1.5 rounded-lg border transition-all font-bold text-[7px] uppercase tracking-tighter ${tableFinish === finish.id ? 'border-white bg-white/20 text-white' : 'border-white/5 bg-black/20 text-white/40'}`}
                                    >
                                        {finish.name}
                                    </button>
                                ))}
                             </div>
                          </div>

                          <div className="space-y-2">
                             <p className="text-[8px] font-black uppercase text-white/20 tracking-widest">Card Back Pattern</p>
                             <div className="flex gap-2">
                                {[
                                    { id: 'classic', color: 'bg-blue-900' },
                                    { id: 'modern', color: 'bg-zinc-900' },
                                    { id: 'royal', color: 'bg-yellow-900' }
                                ].map(back => (
                                    <button 
                                        key={back.id}
                                        onClick={() => setCardBack(back.id)}
                                        className={`flex-1 h-6 rounded-lg border-2 transition-all ${cardBack === back.id ? 'border-white bg-white/10' : 'border-transparent bg-black/20'} ${back.color}`}
                                    />
                                ))}
                             </div>
                          </div>
                      </div>

                      <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                          <label className="block text-[10px] font-black uppercase text-white/40 mb-1 italics tracking-widest">Display</label>
                          <div className="space-y-1">
                              <p className="text-[8px] font-black uppercase text-white/20 tracking-widest ml-1">Card Dimensions</p>
                              <div className="grid grid-cols-3 gap-1.5">
                                 {(['small', 'medium', 'large'] as const).map(size => (
                                     <button 
                                         key={size}
                                         onClick={() => setCardSize(size)}
                                         className={`py-1.5 rounded-lg border transition-all font-bold text-[7px] uppercase tracking-tighter ${cardSize === size ? 'border-white bg-white/20 text-white' : 'border-white/5 bg-black/20 text-white/40'}`}
                                     >
                                         {size}
                                     </button>
                                 ))}
                              </div>
                          </div>
                          <div className="h-px bg-white/5 my-2" />
                          <label className="block text-[10px] font-black uppercase text-white/40 mb-1 italics tracking-widest">Toggles</label>
                          <Toggle label="Sound" value={soundEnabled} onChange={setSoundEnabled} icon={<Volume2 size={12} />} />
                          <Toggle label="Hints" value={showPossiblePlays} onChange={setShowPossiblePlays} icon={<Eye size={12} />} />
                          <Toggle label="Chat" value={showChat} onChange={setShowChat} icon={<span className="text-[10px]">💬</span>} />
                          <Toggle label="Hide Player IDs" value={hidePlayerIds} onChange={setHidePlayerIds} icon={<span className="text-xs font-mono">#</span>} />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[8px] font-black text-white/30 uppercase">Build Info</span>
                            <span className="text-[8px] font-black text-emerald-400 uppercase">v1.4.0 Stable</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black text-white/30 uppercase">Region</span>
                            <span className="text-[8px] font-black text-white/60 uppercase">Global (SSL)</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                         <button 
                            onClick={toggleFullscreen}
                            className={`w-full py-2.5 rounded-xl font-black uppercase tracking-widest transition-all border text-[9px] flex items-center justify-center gap-2 ${isFullscreen ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
                         >
                            {isFullscreen ? 'Exit Full Screen' : 'Go Full Screen'}
                         </button>
                      </div>

                      <div className="flex flex-col gap-2">
                          <button 
                              onClick={handleResign}
                              disabled={isSpectator || room.phase === 'LOBBY' || room.phase === 'GAME_OVER'}
                              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl font-black uppercase tracking-widest transition-all border border-rose-500/20 disabled:opacity-30 text-[9px]"
                          >
                              Resign Match
                          </button>
                          <div className="grid grid-cols-2 gap-2">
                              <button 
                                  onClick={handleExit}
                                  className="py-2.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl font-black uppercase tracking-widest transition-all border border-white/10 text-[9px]"
                              >
                                  Exit Room
                              </button>
                              <button 
                                  onClick={handleLogout}
                                  className="py-2.5 bg-white/5 hover:bg-white/10 text-rose-400 rounded-xl font-black uppercase tracking-widest transition-all border border-white/10 text-[9px]"
                              >
                                  Log out
                              </button>
                          </div>
                      </div>
                      
                      <div className="p-3 bg-yellow-500/5 rounded-xl border border-yellow-500/10">
                          <p className="text-[8px] font-bold text-yellow-500/60 leading-tight italic">Your game ID is permanently linked to your stats.</p>
                      </div>
                    </div>
                </div>
            </Modal>
        )}
      </AnimatePresence>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none"
          >
            <div className={`
              px-6 py-3.5 rounded-full border backdrop-blur-md shadow-2xl flex items-center gap-3 active:scale-95 transition-transform duration-100 pointer-events-auto cursor-pointer
              ${toast.type === 'error' ? 'bg-red-950/95 border-red-500/30 text-red-100 shadow-red-500/10' : ''}
              ${toast.type === 'success' ? 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100 shadow-emerald-500/10' : ''}
              ${toast.type === 'info' ? 'bg-zinc-950/95 border-white/10 text-zinc-100 shadow-white/5' : ''}
            `}
              onClick={() => setToast(null)}
            >
              <div className={`
                w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0
                ${toast.type === 'error' ? 'bg-red-500/20 text-red-400' : ''}
                ${toast.type === 'success' ? 'bg-emerald-500/20 text-emerald-400' : ''}
                ${toast.type === 'info' ? 'bg-white/10 text-white/60' : ''}
              `}>
                {toast.type === 'error' && '✕'}
                {toast.type === 'success' && '✓'}
                {toast.type === 'info' && 'i'}
              </div>
              <p className="text-xs md:text-sm font-black tracking-wide leading-none select-none">
                {toast.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/10 px-4 md:px-8 py-2 md:py-3 shrink-0 flex justify-between items-center text-white/40">
        <div className="flex gap-4 md:gap-8">
           <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest">Live</span>
           </div>
           <div className="hidden xs:flex items-center gap-2">
              <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-widest opacity-60">Mode:</span>
              <span className="text-[8px] md:text-[10px] font-black text-white/60 uppercase">{room.mode.replace('_', ' ')}</span>
           </div>
        </div>
        <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.1em] md:tracking-[0.2em] opacity-60">
          Deep Shelem v1.3.2
        </div>
      </footer>
    </div>
  );
}

function Modal({ title, children, onClose, density = "COMFORT" }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm -webkit-backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className={`relative bg-[#14452f] border border-white/10 rounded-[30px] md:rounded-[40px] shadow-2xl w-full ${density === 'COMPACT' ? 'max-w-2xl' : 'max-w-xl'} max-h-[90vh] flex flex-col overflow-hidden`}
            >
                <div className="px-6 md:px-8 py-4 md:py-6 border-b border-white/5 flex justify-between items-center shrink-0">
                    <h2 className="text-lg md:text-xl font-black uppercase tracking-widest text-yellow-500">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-white/40">
                        <X size={20} md:size={24} />
                    </button>
                </div>
                <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
}

function Toggle({ label, value, onChange, icon }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className={`${value ? 'text-emerald-400' : 'text-white/40'} transition-colors`}>{icon}</div>
                <span className="text-xs md:text-sm font-bold">{label}</span>
            </div>
            <button 
                onClick={() => onChange(!value)}
                className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors ${value ? 'bg-emerald-500' : 'bg-white/10'}`}
            >
                <motion.div 
                    animate={{ x: value ? (window.innerWidth < 768 ? 20 : 24) : 4 }}
                    className="absolute top-1 w-3 h-3 md:w-4 md:h-4 bg-white rounded-full" 
                />
            </button>
        </div>
    );
}

function SuitIcon({ suit, size = 14 }: { suit: Suit; size?: number }) {
  const icons = {
    SPADES: <Spade size={size} className="fill-slate-900 text-slate-900" />,
    HEARTS: <Heart size={size} className="fill-rose-600 text-rose-600 shadow-sm" />,
    DIAMONDS: <Diamond size={size} className="fill-rose-600 text-rose-600 shadow-sm" />,
    CLUBS: <Club size={size} className="fill-slate-900 text-slate-900" />,
  };
  return <div className="inline-flex items-center justify-center p-0.5 rounded-sm overflow-visible">{icons[suit]}</div>;
}

function BiddingOverlay({ room, isMyTurn, onBid, isLoading }: any) {
    const bids = [];
    for(let i=100; i<=165; i+=5) bids.push(i);

    const lastBidderId = room.highestBid.bidderId;
    const lastBidderName = lastBidderId ? room.players.find((p:any) => p.id === lastBidderId)?.name : 'No one';

    return (
        <div className="bg-[#14452f]/95 backdrop-blur-2xl -webkit-backdrop-blur-2xl p-6 md:p-8 rounded-[30px] md:rounded-[40px] border border-white/10 shadow-2xl w-full max-w-[480px]">
            <h2 className="text-center text-[10px] font-black uppercase tracking-[0.2em] mb-4 md:mb-6 text-white/40">
                {isMyTurn ? 'YOUR TURN TO BID' : 'WAITING FOR BIDS...'}
            </h2>
            
            <div className="grid grid-cols-[1.5fr_1fr] gap-8">
                {/* Left Side: Bid History */}
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Player Bids</p>
                    <div className="space-y-2">
                        {room.players.map((p: any) => {
                            const bid = room.bids[p.id];
                            const isCurrent = room.currentTurn === room.players.indexOf(p);
                            return (
                                <div key={p.id} className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${isCurrent ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-black/20 border-white/5 text-white/40'}`}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-black/40 text-[10px]">
                                            <PlayerAvatar avatar={p.avatar || '🧔'} />
                                        </div>
                                        <span className={`text-[10px] font-black uppercase tracking-widest truncate max-w-[80px]`}>{p.name}</span>
                                    </div>
                                    <span className={`text-xs font-black ${bid === 'PASS' ? 'text-red-500/50' : bid ? 'text-yellow-500' : 'opacity-20'}`}>
                                        {bid === 'PASS' ? 'PASSED' : bid ? bid : '...'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    {lastBidderId && (
                         <div className="mt-4 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-center">
                            <p className="text-[9px] font-black text-yellow-500/40 uppercase tracking-[0.2em] mb-1">Current Highest</p>
                            <p className="text-2xl font-black text-yellow-500">{room.highestBid.value}</p>
                            <p className="text-[9px] font-bold text-white/30 uppercase mt-1">By {lastBidderName}</p>
                         </div>
                    )}
                </div>

                {/* Right Side: Bid selection */}
                <div className="flex flex-col gap-3">
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest px-1">Select Bid</p>
                    <div className="h-[280px] overflow-y-auto custom-scrollbar pr-2 flex flex-col gap-2">
                        {bids.filter(b => b > room.highestBid.value).map(b => (
                                <button
                                    key={b}
                                    disabled={!isMyTurn || isLoading}
                                    onClick={() => onBid(b)}
                                    className={`
                                        w-full py-3 rounded-xl border-2 transition-all font-black text-sm relative overflow-hidden
                                        ${isMyTurn ? 'bg-white/5 border-white/5 text-white hover:bg-emerald-500 hover:border-emerald-400 hover:text-black hover:scale-105 active:scale-95' : 'bg-white/5 border-transparent text-white/10 opacity-50 cursor-not-allowed'}
                                        ${isLoading ? 'opacity-70' : ''}
                                    `}
                                >
                                    {b}
                                    {isLoading && (
                                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        </div>
                                    )}
                                </button>
                            ))}
                            {isMyTurn && bids.filter(b => b > room.highestBid.value).length === 0 && (
                                <p className="text-[10px] text-white/40 text-center italic mt-4">Highest possible bid reached</p>
                            )}
                        </div>
    
                        <button
                            disabled={!isMyTurn || isLoading}
                            onClick={() => onBid('PASS')}
                            className={`
                                w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-widest transition-all border-2 relative overflow-hidden
                                ${isMyTurn ? 'bg-red-500/10 border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white/5 border-transparent text-white/10 opacity-50 cursor-not-allowed'}
                            `}
                        >
                            {isLoading ? '...' : 'Pass'}
                        </button>
                </div>
            </div>
        </div>
    );
}

function DiscardOverlay({ selectedCards, onConfirm, isLoading }: any) {
    const [suit, setSuit] = useState<Suit | null>(null);
    const selectedCount = selectedCards.length;
    
    return (
        <div className="bg-[#14452f]/95 backdrop-blur-2xl -webkit-backdrop-blur-2xl p-6 md:p-8 rounded-[30px] md:rounded-[40px] border border-white/10 shadow-2xl w-full max-w-[440px]">
             <h2 className="text-center text-[10px] font-black uppercase tracking-[0.2em] mb-4 md:mb-6 text-yellow-500">
                PICK TRUMP & DISCARD 4
            </h2>

            <div className="flex flex-col gap-8">
                <div>
                     <p className="text-center text-[10px] uppercase font-bold text-white/40 mb-4">Choose Trump Suit</p>
                     <div className="grid grid-cols-4 gap-4">
                        {(['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'] as Suit[]).map(s => (
                            <button
                                key={s}
                                disabled={isLoading}
                                onClick={() => setSuit(s)}
                                className={`
                                    aspect-square rounded-2xl flex items-center justify-center transition-all border-2
                                    ${suit === s ? 'bg-emerald-500 border-white text-black rotate-12 scale-110 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}
                                `}
                            >
                                <SuitIcon suit={s} size={20} />
                            </button>
                        ))}
                     </div>
                </div>

                <div className="bg-black/20 p-6 rounded-3xl border border-white/5">
                    <p className="text-center text-[10px] uppercase font-bold text-white/30 mb-4">Cards to Discard ({selectedCount}/4)</p>
                    <div className="flex justify-center gap-2 h-16 items-center">
                        {selectedCards.map((c: any, i: number) => (
                            <motion.div 
                                key={`${c.suit}-${c.rank}`}
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                className="relative"
                            >
                                <Card card={c} small disabled />
                            </motion.div>
                        ))}
                        {Array.from({ length: 4 - selectedCount }).map((_, i) => (
                            <div key={`empty-${i}`} className="w-10 h-16 rounded-lg border-2 border-dashed border-white/10 flex items-center justify-center">
                                <span className="text-white/10 text-[8px] font-black">?</span>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    disabled={selectedCount !== 4 || !suit || isLoading}
                    onClick={() => onConfirm(suit!)}
                    className={`
                        w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 relative overflow-hidden
                        ${selectedCount === 4 && suit ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 hover:scale-[1.02] active:scale-95' : 'bg-white/5 text-white/10 cursor-not-allowed'}
                    `}
                >
                    {isLoading ? (
                        <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                        <>
                            <CheckCircle2 size={20} />
                            Confirm Discard
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}

function Spade({ size, className }: any) {
    return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><path d="M12 2C9.5 2 7 5.5 7 9c0 2.5 1.5 4.5 4 5l-1 4h-2v2h8v-2h-2l-1-4c2.5-.5 4-2.5 4-5 0-3.5-2.5-7-5-7z"/></svg>;
}
function Club({ size, className }: any) {
    return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><path d="M12 2a4 4 0 0 0-4 4 4 4 0 0 0 1 2.65A4 4 0 0 0 6 12a4 4 0 0 0 4 4 4 4 0 0 0 1-0.13V20H9v2h6v-2h-2v-4.13A4 4 0 0 0 14 16a4 4 0 0 0 4-4 4 4 0 0 0-3-3.35A4 4 0 0 0 16 6a4 4 0 0 0-4-4z"/></svg>;
}
function Heart({ size, className }: any) {
    return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
}
function Diamond({ size, className }: any) {
    return <svg width={size} height={size} viewBox="0 0 24 24" className={className}><path d="M12 2L3 12l9 10 9-10-9-10z"/></svg>;
}
