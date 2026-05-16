import React, { useState, useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'motion/react';
import Card, { CardData, Suit } from './Card';
import Chat from './Chat';
import { Users, Info, Settings, HelpCircle, CheckCircle2, X, Volume2, VolumeX, Eye, LogOut, Flag, Crown } from 'lucide-react';

interface GameBoardProps {
  room: any;
  socket: any;
  playerName: string;
}

export default function GameBoard({ room, socket, playerName }: GameBoardProps) {
  const [selectedCards, setSelectedCards] = useState<CardData[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showPossiblePlays, setShowPossiblePlays] = useState(true);
  const [resignRequest, setResignRequest] = useState<any>(null);
  const [reactions, setReactions] = useState<{ [playerId: string]: string }>({});

  useEffect(() => {
    socket.on('resign_requested', (data: any) => {
      setResignRequest(data);
    });

    socket.on('resign_rejected', () => {
      alert('Your teammate rejected the resignation.');
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
    }, [room.phase === 'GAME_OVER']);

  const is2P = room.mode === '2_PLAYER';
  const isSpectator = !room.players.some((p: any) => p.name === playerName);

  // Normalize positions
  let myIndex = room.players.findIndex((p: any) => p.name === playerName);
  if (myIndex === -1) myIndex = 0; // Default view for spectator
  
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
    if (isSpectator) return;
    socket.emit('place_bid', { roomId: room.id, bid: value });
  };

  const handleAction = (card: CardData, fromPileIndex?: number) => {
    if (isSpectator) return;
    if (room.phase === 'DISCARDING') {
      if (selectedCards.some(c => c.suit === card.suit && c.rank === card.rank)) {
        setSelectedCards(selectedCards.filter(c => !(c.suit === card.suit && c.rank === card.rank)));
      } else if (selectedCards.length < 4) {
        setSelectedCards([...selectedCards, card]);
      }
    } else if (room.phase === 'PLAYING') {
      socket.emit('play_card', { roomId: room.id, card, fromPileIndex });
    }
  };

  const confirmDiscard = (hokm: Suit) => {
    if (isSpectator) return;
    if (selectedCards.length === 4) {
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#0a2e1f] text-white">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-md px-6 py-4 flex justify-between items-center border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center font-bold text-black text-2xl shadow-lg shadow-yellow-500/20">S</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">Shelem Online</h1>
            <p className="text-xs text-yellow-500 font-bold uppercase tracking-widest">Classic Iranian Card Game</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-white/10 px-4 py-2 rounded-full border border-white/20 flex items-center gap-2">
            <span className="text-[10px] font-bold opacity-70 tracking-widest uppercase">Room:</span>
            <span className="text-lg font-mono font-bold tracking-widest text-yellow-400">{room.id}</span>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowRules(true)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-emerald-400"
              title="Game Rules"
            >
              <HelpCircle size={20} />
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-white/60"
              title="Settings"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex p-6 gap-6 relative overflow-hidden">
        {/* Game Area */}
        <div className="flex-1 relative bg-[#14452f] rounded-[40px] border-[8px] border-[#0d3322] shadow-inner flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          {/* Trick Area (Center) */}
          <div className="relative z-10 w-80 h-80 flex items-center justify-center">
            {/* Current Trick Indicators */}
            {room.currentTrick.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[45]">
                <div className="bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 flex items-center gap-3 animate-in fade-in zoom-in duration-300">
                  <div className="flex flex-col items-center">
                    <span className="text-[6px] text-white/30 uppercase font-black tracking-tighter">Lead</span>
                    <SuitIcon suit={room.currentTrick[0].card.suit} />
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex flex-col items-center">
                    <span className="text-[6px] text-white/30 uppercase font-black tracking-tighter">Winning</span>
                    <span className="text-[10px] font-black text-emerald-400 truncate max-w-[60px]">
                      {room.players.find((p:any) => p.id === getCurrentWinner())?.name || '...'}
                    </span>
                  </div>
                </div>
              </div>
            )}

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

                return (
                  <motion.div
                    key={`${trick.playerId}-${i}`}
                    initial={{ scale: 0, opacity: 0, y: 100 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1,
                      y: pos === 0 ? 40 : pos === 2 ? -40 : 0,
                      x: pos === 3 ? -40 : pos === 1 ? 40 : 0,
                      rotate: angles[pos] + (Math.random() * 10 - 5) + (trick.fromPile ? 5 : -5)
                    }}
                    exit={{ 
                        scale: 0.2, 
                        opacity: 0, 
                        x: exitPos[winnerPos]?.x || 0, 
                        y: exitPos[winnerPos]?.y || 0, 
                        transition: { duration: 0.4, ease: "circIn" } 
                    }}
                    className="absolute"
                  >
                    <Card card={trick.card} small layoutId={`card-${trick.card.suit}-${trick.card.rank}`} />
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

            {room.phase === 'BIDDING' && (
              <BiddingOverlay 
                  room={room}
                  isMyTurn={isMyTurn}
                  onBid={handleBid}
              />
            )}

            {room.phase === 'DISCARDING' && isMyTurn && (
              <DiscardOverlay 
                  selectedCount={selectedCards.length}
                  onConfirm={confirmDiscard}
              />
            )}

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
             <>
                {/* My Piles (Bottom) */}
                <div className="absolute bottom-[200px] flex gap-4">
                    {room.piles[room.players[myIndex]?.id]?.map((pile: any, pIdx: number) => (
                        <div key={pIdx} className="relative w-12 h-16">
                            {pile.length > 0 && (
                                <div className="absolute inset-0 bg-black/40 rounded-lg shadow-sm -mt-1 -ml-1 border border-white/5" />
                            )}
                            {pile.length > 0 && (
                                <Card 
                                    card={pile[pile.length - 1]} 
                                    small 
                                    onClick={() => {
                                        playSound('play');
                                        isMyTurn && room.subPhase === 'PILE' && handleAction(pile[pile.length - 1], pIdx);
                                    }}
                                    highlighted={possiblePlays.some((p: any) => p.suit === pile[pile.length - 1].suit && p.rank === pile[pile.length - 1].rank)}
                                    layoutId={`card-${pile[pile.length - 1].suit}-${pile[pile.length - 1].rank}`}
                                    disabled={!isMyTurn || room.subPhase !== 'PILE'}
                                />
                            )}
                            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] font-black text-white/30 uppercase">
                                Pile {pIdx + 1}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Opponent Piles (Top) */}
                <div className="absolute top-[200px] flex gap-4 rotate-180">
                    {room.piles[room.players[(myIndex + 1) % 2]?.id]?.map((pile: any, pIdx: number) => (
                        <div key={pIdx} className="relative w-12 h-16">
                             {pile.length > 0 && (
                                <div className="absolute inset-0 bg-black/40 rounded-lg shadow-sm -mt-1 -ml-1 border border-white/5" />
                            )}
                            {pile.length > 0 && (
                                <Card 
                                    card={pile[pile.length - 1]} 
                                    small 
                                    disabled
                                />
                            )}
                        </div>
                    ))}
                </div>
             </>
          )}

          {/* Player Positions */}
          {orderedPlayers.map((player: any, i: number) => {
            if (!player) return null;
            let posStyles = [
              'bottom-6 left-1/2 -translate-x-1/2', // Bottom (YOU)
              'right-8 top-1/2 -translate-y-1/2', // Right
              'top-8 left-1/2 -translate-x-1/2', // Top
              'left-8 top-1/2 -translate-y-1/2', // Left
            ];
            if (is2P) {
                posStyles = [
                    'bottom-6 left-1/2 -translate-x-1/2', // YOU
                    'top-8 left-1/2 -translate-x-1/2', // OPPONENT
                ];
            }
            
            const pRealIdx = room.players.findIndex((p:any) => p.id === player.id);
            const isTurn = room.currentTurn === pRealIdx;
            const isDealer = room.dealerIndex === pRealIdx;

            return (
              <div key={player.id} className={`absolute ${posStyles[i]} z-20 flex flex-col items-center`}>
                <div className="relative">
                  {isTurn && (
                    <motion.div 
                      layoutId="turn-glow"
                      className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl scale-150"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                  
                  {/* Reaction Bubble */}
                  <AnimatePresence>
                    {reactions[player.id] && (
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
                    w-16 h-16 rounded-full border-4 flex items-center justify-center text-2xl transition-all duration-500 relative z-10
                    ${isTurn ? 'border-yellow-500 bg-emerald-600 scale-110 shadow-lg shadow-yellow-500/40' : 'border-white/20 bg-emerald-800'}
                  `}>
                    {player.avatar || '🧔'}
                    {isDealer && (
                      <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center border-2 border-[#14452f] shadow-lg">
                        <Crown size={12} className="text-black fill-black" />
                      </div>
                    )}
                  </div>
                </div>
                <p className={`mt-2 font-bold text-sm ${isTurn ? 'text-yellow-400' : 'text-white'}`}>
                  {player.name} {(!isSpectator && player.id === room.players[myIndex]?.id) ? '(YOU)' : ''}
                </p>
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
          <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
            <div className="flex justify-center -space-x-2 md:-space-x-4 lg:space-x-1 px-10 pb-12 hover:space-x-2 transition-all duration-300">
                {!isSpectator && room.players[myIndex]?.cards.map((c: CardData, i: number) => (
                  <Card 
                    key={`${c.suit}-${c.rank}`} 
                    card={c} 
                    onClick={() => {
                        playSound('play');
                        handleAction(c);
                    }}
                    selected={selectedCards.some(sc => sc.suit === c.suit && sc.rank === c.rank)}
                    highlighted={possiblePlays.some((p: any) => p.suit === c.suit && p.rank === c.rank)}
                    layoutId={`card-${c.suit}-${c.rank}`}
                    disabled={(!isMyTurn && room.phase === 'PLAYING') || (room.phase === 'PLAYING' && is2P && room.subPhase === 'PILE') || (room.phase === 'DISCARDING' && !isMyTurn)}
                  />
                ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-72 flex flex-col gap-4">
          <div className="bg-white/5 border border-white/10 rounded-[32px] p-5 flex flex-col h-full">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-4">Match Progress</h3>
            
            <div className={`grid ${is2P ? 'grid-cols-2' : 'grid-cols-2'} text-center border-b border-white/10 pb-2 mb-4`}>
              <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{is2P ? (room.players[0]?.name || 'P1') : 'TEAM RED'}</div>
              <div className="text-[10px] font-black text-orange-400 uppercase tracking-widest">{is2P ? (room.players[1]?.name || 'P2') : 'TEAM BLUE'}</div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {/* Current Round Points */}
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                   <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3 text-center">Round Points</p>
                   <div className="grid grid-cols-2 text-center text-xl font-mono font-black">
                      <div className="text-emerald-400">{room.pointsThisRound[0]}</div>
                      <div className="text-orange-400">{room.pointsThisRound[1]}</div>
                   </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 text-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-white/40 font-black">TOTAL SCORE</span>
                    <span className="text-3xl font-black text-emerald-400">{room.scores[0]}</span>
                  </div>
                  <div className="flex flex-col border-l border-white/10">
                    <span className="text-[10px] text-white/40 font-black">TOTAL SCORE</span>
                    <span className="text-3xl font-black text-orange-400">{room.scores[1]}</span>
                  </div>
                </div>

                <div className="mt-6 bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Target Score</p>
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-black">{room.mode === '2_PLAYER' ? 1200 : 660}</span>
                    <span className="text-[10px] text-white/60 font-bold uppercase mb-1">To win</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                   <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-3">Session Stats</p>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                         <p className="text-[9px] font-bold text-white/40 uppercase">Rounds</p>
                         <p className="text-lg font-black">{room.roundCount}</p>
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-white/40 uppercase">Mode</p>
                         <p className="text-sm font-black">{room.mode.split('_')[0]}P</p>
                      </div>
                   </div>
                </div>

                {room.spectators && room.spectators.length > 0 && (
                   <div className="mt-6">
                      <p className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 px-1">Spectators ({room.spectators.length})</p>
                      <div className="flex flex-wrap gap-2 px-1">
                         {room.spectators.map((s: any) => (
                            <div key={s.id} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-lg" title={s.name}>
                               {s.avatar || '🧔'}
                            </div>
                         ))}
                      </div>
                   </div>
                )}
            </div>
          </div>

          <div className="bg-black/40 rounded-[32px] p-5 border border-white/5">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-3">Live Status</h4>
            <div className="space-y-3">
               <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/70 uppercase">Round {room.roundCount} in progress</span>
               </div>
               <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                  <p className="text-[9px] font-black text-white/30 uppercase mb-1">Dealer Pos</p>
                  <p className="text-xs font-bold">{room.players[room.dealerIndex]?.name || '...'}</p>
               </div>
            </div>
          </div>
        </div>
      </main>

      <Chat 
        messages={room.messages || []} 
        playerName={playerName} 
        onSendMessage={handleSendMessage} 
      />

      {/* Quick Reactions Bar */}
      {!isSpectator && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex gap-2">
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
        {showRules && (
            <Modal title="Game Rules" onClose={() => setShowRules(false)}>
                <div className="space-y-6 text-sm leading-relaxed text-white/80 h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    <section>
                        <h3 className="text-emerald-400 font-black uppercase text-xs mb-2">Introduction</h3>
                        <p>
                            Shelem is a popular trick-taking card game. The goal is to reach a target score (660 for 4P, 1200 for 2P) by bidding and winning tricks containing point-cards.
                        </p>
                    </section>

                    <section>
                        <h3 className="text-yellow-500 font-black uppercase text-xs mb-2">Point Values</h3>
                        <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold">Card Ranks</p>
                                <ul className="mt-1 space-y-1">
                                    <li><span className="text-yellow-500 font-bold">5</span> = 5 Points</li>
                                    <li><span className="text-yellow-500 font-bold">10</span> = 10 Points</li>
                                    <li><span className="text-yellow-500 font-bold">Ace</span> = 10 Points</li>
                                </ul>
                            </div>
                            <div>
                                <p className="text-[10px] text-white/40 uppercase font-bold">Total Points</p>
                                <p className="mt-1">Total points in a deck: <span className="text-emerald-400 font-bold">165</span></p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-emerald-400 font-black uppercase text-xs mb-2">Head-to-Head (2-Player Mode)</h3>
                        <p>
                            In 2-player mode, the "Ground" acts as a silent partner for both players.
                        </p>
                        <ul className="list-disc list-inside space-y-2 mt-2 ml-2">
                            <li>Each player receives <span className="text-white font-bold">12 cards</span> in hand.</li>
                            <li><span className="text-white font-bold">3 piles</span> of 4 cards are placed in front of each player.</li>
                            <li>A trick consists of <span className="text-white font-bold">4 cards</span>: 2 from hands and 2 from the ground piles.</li>
                            <li>Initially, players play from their hands. Once hands are played, the top card of a corresponding ground pile is revealed and must be played.</li>
                            <li>Players must follow suit from both their hand and the visible ground cards.</li>
                        </ul>
                    </section>

                    <section>
                        <h3 className="text-emerald-400 font-black uppercase text-xs mb-2">Bidding & "Shelem"</h3>
                        <ul className="list-disc list-inside space-y-2 mt-2 ml-2">
                            <li>Bidding starts from 100 and increases in increments of 5.</li>
                            <li>The highest bidder becomes the <span className="text-yellow-500 font-bold">Hakam</span>, picks the Trump suit, and gets the 4 center cards.</li>
                            <li>If the Hakam's team fails to reach their bid, they lose double the points bid.</li>
                            <li>Winning all 165 points in a round is a <span className="text-emerald-400 font-bold">Shelem</span>, awarding massive bonus points.</li>
                        </ul>
                    </section>
                </div>
            </Modal>
        )}
        {showSettings && (
            <Modal title="Game Options" onClose={() => setShowSettings(false)}>
                <div className="space-y-6">
                    {/* Profile Stats Section */}
                    {(() => {
                        const stats = JSON.parse(localStorage.getItem('shelem_stats') || '{"wins": 0, "losses": 0, "games": 0}');
                        const winRate = stats.games > 0 ? ((stats.wins / stats.games) * 100).toFixed(1) : 0;
                        return (
                            <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-black text-xl">
                                        {room.players.find((p:any) => p.name === playerName)?.avatar || '🧔'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-widest text-emerald-500">Player Profile</p>
                                        <p className="font-bold text-white">{playerName}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="bg-black/20 p-3 rounded-2xl text-center">
                                        <p className="text-[10px] text-white/40 uppercase font-black">Games</p>
                                        <p className="text-xl font-black text-white">{stats.games}</p>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-2xl text-center">
                                        <p className="text-[10px] text-white/40 uppercase font-black">Wins</p>
                                        <p className="text-xl font-black text-emerald-400">{stats.wins}</p>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-2xl text-center">
                                        <p className="text-[10px] text-white/40 uppercase font-black">Rate</p>
                                        <p className="text-xl font-black text-yellow-500">{winRate}%</p>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {soundEnabled ? <Volume2 size={18} className="text-emerald-500" /> : <VolumeX size={18} className="text-white/40" />}
                                <span className="text-sm font-bold">Sound Effects</span>
                            </div>
                            <button 
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`w-12 h-6 rounded-full relative transition-colors ${soundEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}
                            >
                                <motion.div 
                                    animate={{ x: soundEnabled ? 24 : 4 }}
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full" 
                                />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Eye size={18} className={showPossiblePlays ? "text-yellow-500" : "text-white/40"} />
                                <span className="text-sm font-bold">Show Possible Plays</span>
                            </div>
                            <button 
                                onClick={() => setShowPossiblePlays(!showPossiblePlays)}
                                className={`w-12 h-6 rounded-full relative transition-colors ${showPossiblePlays ? 'bg-emerald-500' : 'bg-white/10'}`}
                            >
                                <motion.div 
                                    animate={{ x: showPossiblePlays ? 24 : 4 }}
                                    className="absolute top-1 w-4 h-4 bg-white rounded-full" 
                                />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={handleResign}
                            disabled={isSpectator || room.phase === 'LOBBY' || room.phase === 'GAME_OVER'}
                            className="flex items-center justify-center gap-3 py-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl font-black uppercase tracking-widest transition-all border border-rose-500/20 disabled:opacity-30"
                        >
                            <Flag size={18} />
                            Resign
                        </button>
                        <button 
                            onClick={handleExit}
                            className="flex items-center justify-center gap-3 py-4 bg-white/5 hover:bg-white/10 text-white/60 rounded-2xl font-black uppercase tracking-widest transition-all border border-white/10"
                        >
                            <LogOut size={18} />
                            Exit
                        </button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                        <label className="block text-[10px] font-black uppercase text-white/40 mb-3 ml-1">Session Info</label>
                        <div className="space-y-2">
                             <div className="flex justify-between text-xs">
                                <span className="text-white/40">Room ID</span>
                                <span className="font-mono text-emerald-400 font-bold">{room.id}</span>
                             </div>
                             <div className="flex justify-between text-xs">
                                <span className="text-white/40">Game Mode</span>
                                <span className="font-bold">{room.mode.replace('_', ' ')}</span>
                             </div>
                        </div>
                    </div>

                    <div className="p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-center">
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">Developer Info</p>
                        <p className="text-xs font-bold text-white/80">Shelem Online v1.2.0 • DeepInk Team</p>
                    </div>
                </div>
            </Modal>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-black/50 border-t border-white/10 px-8 py-3 shrink-0 flex justify-between items-center text-white/40">
        <div className="flex gap-8">
           <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
              <span className="text-[10px] font-black uppercase tracking-widest">Server Connected</span>
           </div>
           <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest">Active Playing:</span>
              <span className="text-[10px] font-black text-white/60 uppercase">{room.mode.replace('_', ' ')} SHELEM</span>
           </div>
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.2em]">
          Shelem Online v1.0.0 • Built with ❤️
        </div>
      </footer>
    </div>
  );
}

function Modal({ title, children, onClose }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="relative bg-[#14452f] border border-white/10 rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden"
            >
                <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-black uppercase tracking-widest text-emerald-400">{title}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-all text-white/40">
                        <X size={24} />
                    </button>
                </div>
                <div className="p-8">
                    {children}
                </div>
            </motion.div>
        </motion.div>
    );
}

function SuitIcon({ suit }: { suit: Suit }) {
    const icons = {
        SPADES: <Spade size={14} className="fill-slate-900" />,
        HEARTS: <Heart size={14} className="fill-rose-600 border-none text-rose-600" />,
        DIAMONDS: <Diamond size={14} className="fill-rose-600 border-none text-rose-600" />,
        CLUBS: <Club size={14} className="fill-slate-900" />,
      };
      return <span>{icons[suit]}</span>;
}

function BiddingOverlay({ room, isMyTurn, onBid }: any) {
    const bids = [];
    for(let i=100; i<=165; i+=5) bids.push(i);

    const lastBidderId = room.highestBid.bidderId;
    const lastBidderName = lastBidderId ? room.players.find((p:any) => p.id === lastBidderId)?.name : 'No one';

    return (
        <div className="bg-[#14452f]/95 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl w-[480px]">
            <h2 className="text-center text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-white/40">
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
                                        <span className="text-sm">{p.avatar || '🧔'}</span>
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
                                disabled={!isMyTurn}
                                onClick={() => onBid(b)}
                                className={`
                                    w-full py-3 rounded-xl border-2 transition-all font-black text-sm
                                    ${isMyTurn ? 'bg-white/5 border-white/5 text-white hover:bg-emerald-500 hover:border-emerald-400 hover:text-black hover:scale-105 active:scale-95' : 'bg-white/5 border-transparent text-white/10 opacity-50 cursor-not-allowed'}
                                `}
                            >
                                {b}
                            </button>
                        ))}
                        {isMyTurn && bids.filter(b => b > room.highestBid.value).length === 0 && (
                            <p className="text-[10px] text-white/40 text-center italic mt-4">Highest possible bid reached</p>
                        )}
                    </div>

                    <button
                        disabled={!isMyTurn}
                        onClick={() => onBid('PASS')}
                        className={`
                            w-full py-4 mt-2 rounded-2xl font-black uppercase tracking-widest transition-all border-2
                            ${isMyTurn ? 'bg-red-500/10 border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white' : 'bg-white/5 border-transparent text-white/10 opacity-50 cursor-not-allowed'}
                        `}
                    >
                        Pass
                    </button>
                </div>
            </div>
        </div>
    );
}

function DiscardOverlay({ selectedCount, onConfirm }: any) {
    const [suit, setSuit] = useState<Suit | null>(null);
    return (
        <div className="bg-[#14452f]/95 backdrop-blur-2xl p-8 rounded-[40px] border border-white/10 shadow-2xl w-[400px]">
             <h2 className="text-center text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-yellow-500">
                PICK TRUMP & DISCARD 4
            </h2>

            <div className="flex flex-col gap-8">
                <div>
                     <p className="text-center text-[10px] uppercase font-bold text-white/40 mb-4">Choose Trump Suit</p>
                     <div className="grid grid-cols-4 gap-4">
                        {(['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'] as Suit[]).map(s => (
                            <button
                                key={s}
                                onClick={() => setSuit(s)}
                                className={`
                                    aspect-square rounded-2xl flex items-center justify-center transition-all border-2
                                    ${suit === s ? 'bg-emerald-500 border-white text-black rotate-12 scale-110 shadow-lg shadow-emerald-500/20' : 'bg-white/5 border-transparent text-white/40 hover:bg-white/10'}
                                `}
                            >
                                <SuitIcon suit={s} />
                            </button>
                        ))}
                     </div>
                </div>

                <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-white/30 mb-2">Selected Cards</p>
                    <div className="flex justify-center gap-1">
                        {[1,2,3,4].map(i => (
                            <div key={i} className={`w-8 h-1.5 rounded-full ${selectedCount >= i ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]' : 'bg-black/20'}`} />
                        ))}
                    </div>
                </div>

                <button
                    disabled={selectedCount !== 4 || !suit}
                    onClick={() => onConfirm(suit)}
                    className={`
                        w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                        ${selectedCount === 4 && suit ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'bg-white/5 text-white/10 cursor-not-allowed'}
                    `}
                >
                    <CheckCircle2 size={20} />
                    Confirm Action
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
