import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Club, Diamond, Heart, Spade, Users, Play } from 'lucide-react';

interface LobbyProps {
  onCreate: (name: string, mode: '2_PLAYER' | '4_PLAYER', avatar: string) => void;
  onJoin: (name: string, roomId: string, avatar: string, asSpectator?: boolean) => void;
  error: string;
  lastRoomId?: string | null;
}

const AVATARS = ['🧔', '👨', '👩', '👴', '👵', '👸', '🤴', '🥷', '🧙', '🧛', '🧟', '🤖', '🦊', '🐱', '🐶', '🦁'];

export default function Lobby({ onCreate, onJoin, error, lastRoomId }: LobbyProps) {
  const [name, setName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [mode, setMode] = useState<'INITIAL' | 'CREATE' | 'JOIN'>('INITIAL');
  const [gameMode, setGameMode] = useState<'2_PLAYER' | '4_PLAYER'>('4_PLAYER');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    if (mode === 'CREATE') onCreate(name, gameMode, selectedAvatar);
    else if (mode === 'JOIN' && roomId) onJoin(name, roomId, selectedAvatar);
  };

  return (
    <div className="w-full max-w-md bg-[#14452f] backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-2xl overflow-hidden relative">
      {/* Decorative Icons */}
      <div className="absolute top-4 right-4 opacity-10 flex gap-2 text-yellow-500">
        <Spade size={32} />
        <Heart size={32} />
        <Diamond size={32} />
        <Club size={32} />
      </div>

      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center font-black text-black text-3xl mx-auto mb-4 shadow-lg shadow-yellow-500/20">S</div>
        <h1 className="text-4xl font-black tracking-tighter mb-2 text-white uppercase">
          SHELEM ONLINE
        </h1>
        <p className="text-yellow-500 text-xs font-bold uppercase tracking-[0.2em]">Iranian Classic Strategy</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2 px-1">
            Display Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ENTER YOUR NAME"
            className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all placeholder:text-white/20 font-bold"
            required
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2 px-1">
            Choose Avatar
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {AVATARS.map((avatar) => (
              <button
                key={avatar}
                type="button"
                onClick={() => setSelectedAvatar(avatar)}
                className={`text-2xl p-2 rounded-xl transition-all border-2 ${
                  selectedAvatar === avatar
                    ? "bg-white/10 border-emerald-500 scale-110"
                    : "bg-white/5 border-transparent opacity-40 hover:opacity-100"
                }`}
              >
                {avatar}
              </button>
            ))}
          </div>
        </div>

        {mode === 'INITIAL' && (
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('CREATE')}
              className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all group"
            >
              <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Play size={24} />
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">Create Game</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('JOIN')}
              className="flex flex-col items-center gap-3 p-6 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all group"
            >
              <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center text-yellow-500 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <span className="font-bold text-sm uppercase tracking-wide">Join Room</span>
            </button>
            
            {lastRoomId && (
                <button
                    type="button"
                    onClick={() => {
                        const savedName = localStorage.getItem('shelem_last_name') || '';
                        const savedAvatar = localStorage.getItem('shelem_last_avatar') || AVATARS[0];
                        if (savedName) onJoin(savedName, lastRoomId, savedAvatar);
                        else {
                            setRoomId(lastRoomId);
                            setMode('JOIN');
                        }
                    }}
                    className="col-span-2 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/20 flex items-center justify-center gap-3 transition-all animate-pulse"
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-black uppercase tracking-widest text-xs">Rejoin Active Game ({lastRoomId})</span>
                </button>
            )}
          </div>
        )}

        {mode === 'CREATE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2 px-1">
              Select Game Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
                 <button 
                    type="button"
                    onClick={() => setGameMode('4_PLAYER')}
                    className={`p-4 rounded-2xl border-2 transition-all font-bold ${gameMode === '4_PLAYER' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-white/5 text-white/40'}`}
                 >
                    Standard (4P)
                 </button>
                 <button 
                    type="button"
                    onClick={() => setGameMode('2_PLAYER')}
                    className={`p-4 rounded-2xl border-2 transition-all font-bold ${gameMode === '2_PLAYER' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-white/5 text-white/40'}`}
                 >
                    Head-to-Head (2P)
                 </button>
            </div>
          </motion.div>
        )}

        {mode === 'JOIN' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2 px-1">
              Room Code
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="4-LETTER CODE"
              maxLength={4}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-yellow-500/50 outline-none transition-all placeholder:text-white/20 text-center text-2xl font-mono tracking-[0.3em] font-black text-yellow-400"
              required
            />
          </motion.div>
        )}

        {mode !== 'INITIAL' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setMode('INITIAL')}
                className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-bold transition-all uppercase text-xs tracking-widest"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-[2] py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all uppercase tracking-widest"
              >
                {mode === 'CREATE' ? 'Create Game' : 'Join Game'}
              </button>
            </div>
            {mode === 'JOIN' && (
              <button
                type="button"
                onClick={() => onJoin(name, roomId, selectedAvatar, true)}
                className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 font-bold transition-all uppercase text-[10px] tracking-widest border border-white/5"
              >
                Watch Only (Spectator)
              </button>
            )}
          </div>
        )}
      </form>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 text-sm text-center text-rose-400 font-medium"
        >
          {error}
        </motion.p>
      )}

      <div className="mt-8 text-center pt-6 border-t border-white/5">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Team Red vs Team Blue • 660 Points to Win
        </p>
        <p className="text-[10px] text-emerald-500/30 uppercase tracking-[0.2em] font-black mt-4">
          Designed by DeepInk Team
        </p>
      </div>
    </div>
  );
}
