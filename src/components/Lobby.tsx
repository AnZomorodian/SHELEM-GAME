import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Club, Diamond, Heart, Spade, Users, Play, Upload, User, Lock, LogIn, UserPlus } from 'lucide-react';

interface LobbyProps {
  onCreate: (name: string, mode: '2_PLAYER' | '4_PLAYER', avatar: string) => void;
  onJoin: (name: string, roomId: string, avatar: string, asSpectator?: boolean) => void;
  error: string;
  lastRoomId?: string | null;
}

export default function Lobby({ onCreate, onJoin, error, lastRoomId }: LobbyProps) {
  const [user, setUser] = useState<any>(() => {
    const saved = localStorage.getItem('deep_shelem_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [roomId, setRoomId] = useState('');
  const [mode, setMode] = useState<'INITIAL' | 'CREATE' | 'JOIN'>('INITIAL');
  const [gameMode, setGameMode] = useState<'2_PLAYER' | '4_PLAYER'>('4_PLAYER');

  const selectedFont = localStorage.getItem('shelem_font') || '"Inter", sans-serif';
  const selectedTheme = localStorage.getItem('shelem_theme') || 'emerald';

  useEffect(() => {
    document.body.setAttribute('data-theme', selectedTheme);
  }, [selectedTheme]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'LOGIN' ? '/api/login' : '/api/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (res.ok) {
        if (authMode === 'REGISTER') {
          // After registration, auto-login or just switch to login
          setAuthMode('LOGIN');
          setAuthError('Registration successful! Please login.');
        } else {
          setUser(data);
          localStorage.setItem('deep_shelem_user', JSON.stringify(data));
        }
      } else {
        setAuthError(data.error);
      }
    } catch (err) {
      setAuthError('Connection error');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('userId', user.id);

    try {
      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        const updatedUser = { ...user, avatar: data.avatar };
        setUser(updatedUser);
        localStorage.setItem('deep_shelem_user', JSON.stringify(updatedUser));
      } else {
        setAuthError(data.error);
      }
    } catch (err) {
      setAuthError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const displayName = user.username;
    const avatar = user.avatar || '🧔'; // Fallback if no upload
    if (mode === 'CREATE') onCreate(displayName, gameMode, avatar);
    else if (mode === 'JOIN' && roomId) onJoin(displayName, roomId, avatar);
  };

  if (!user) {
    return (
      <div 
        className="w-full max-w-md backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-2xl overflow-hidden relative transition-colors duration-500"
        style={{ 
          fontFamily: selectedFont,
          backgroundColor: 'var(--game-felt)'
        }}
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center font-black text-black text-3xl mx-auto mb-4 shadow-lg shadow-yellow-500/20">S</div>
          <h1 className="text-4xl font-black tracking-tighter mb-2 text-white uppercase">DEEP SHELEM</h1>
          <p className="text-yellow-500 text-xs font-bold uppercase tracking-[0.2em]">{authMode === 'LOGIN' ? 'Welcome Back' : 'Create Account'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-black text-white/40 px-1 italic tracking-widest">Username</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold"
                placeholder="Username"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-black text-white/40 px-1 italic tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          {authError && <p className="text-xs text-rose-400 font-bold px-1">{authError}</p>}

          <button
            type="submit"
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
          >
            {authMode === 'LOGIN' ? <LogIn size={20} /> : <UserPlus size={20} />}
            {authMode === 'LOGIN' ? 'Sign In' : 'Join Now'}
          </button>

          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'LOGIN' ? 'REGISTER' : 'LOGIN')}
            className="w-full py-2 text-white/40 hover:text-white/60 text-xs font-bold transition-all"
          >
            {authMode === 'LOGIN' ? "Don't have an account? Register" : "Already have an account? Login"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div 
        className="w-full max-w-md backdrop-blur-xl border border-white/10 p-8 rounded-[40px] shadow-2xl overflow-hidden relative transition-colors duration-500"
        style={{ 
            fontFamily: selectedFont,
            backgroundColor: 'var(--game-felt)'
        }}
    >
      <div className="absolute top-4 right-4 opacity-10 flex gap-2 text-yellow-500">
        <Spade size={32} />
        <Heart size={32} />
      </div>

      <div className="text-center mb-8 flex flex-col items-center">
        <div className="relative group cursor-pointer mb-4" onClick={() => fileInputRef.current?.click()}>
          <div className="w-24 h-24 rounded-[2rem] border-4 border-emerald-500/50 overflow-hidden bg-black/40 flex items-center justify-center group-hover:border-yellow-500 transition-all">
            {user.avatar || avatarPreview ? (
              <img src={avatarPreview || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white/20" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[2rem]">
              <Upload size={24} className="text-white" />
            </div>
          </div>
          {uploading && (
             <div className="absolute inset-x-0 -bottom-1">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <motion.div animate={{ x: [-40, 100] }} transition={{ repeat: Infinity, duration: 1 }} className="h-full bg-emerald-500 w-10" />
                </div>
             </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        
        <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Hi, {user.username}!</h1>
        <button onClick={() => { setUser(null); localStorage.removeItem('deep_shelem_user'); }} className="text-[10px] text-white/20 font-bold uppercase tracking-widest mt-1 hover:text-rose-400 transition-colors">Logout</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
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
              <span className="font-bold text-sm uppercase tracking-wide">New Game</span>
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
                    onClick={() => onJoin(user.username, lastRoomId, user.avatar || '🧔')}
                    className="col-span-2 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/20 flex items-center justify-center gap-3 transition-all"
                >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-black uppercase tracking-widest text-xs text-yellow-500">Rejoin active game</span>
                </button>
            )}
          </div>
        )}

        {mode === 'CREATE' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
             <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2 px-1">Game Mode</label>
             <div className="grid grid-cols-2 gap-2">
                 <button type="button" onClick={() => setGameMode('4_PLAYER')} className={`p-4 rounded-2xl border-2 transition-all font-bold ${gameMode === '4_PLAYER' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-white/5 text-white/40'}`}>Standard (4P)</button>
                 <button type="button" onClick={() => setGameMode('2_PLAYER')} className={`p-4 rounded-2xl border-2 transition-all font-bold ${gameMode === '2_PLAYER' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-white/5 bg-white/5 text-white/40'}`}>Head-to-Head (2P)</button>
             </div>
          </motion.div>
        )}

        {mode === 'JOIN' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <label className="block text-[10px] uppercase tracking-widest font-black text-white/40 mb-2 px-1 text-center">Enter Room Code</label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              placeholder="0000"
              maxLength={4}
              className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-yellow-500/50 outline-none text-center text-3xl font-mono tracking-[0.5em] font-black text-yellow-400"
              required
            />
          </motion.div>
        )}

        {mode !== 'INITIAL' && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <button type="button" onClick={() => setMode('INITIAL')} className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/60 font-bold uppercase text-[10px] tracking-widest transition-all">Back</button>
              <button type="submit" className="flex-[2] py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-black font-black shadow-lg transition-all uppercase tracking-widest">
                {mode === 'CREATE' ? 'Launch Game' : 'Join Room'}
              </button>
            </div>
            {mode === 'JOIN' && (
              <button type="button" onClick={() => onJoin(user.username, roomId, user.avatar || '🧔', true)} className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 font-bold uppercase text-[9px] tracking-widest border border-white/5">Spectate Game</button>
            )}
          </div>
        )}
      </form>

      {error && <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-sm text-center text-rose-400 font-bold">{error}</motion.p>}

      <div className="mt-8 text-center pt-6 border-t border-white/5">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          Team Red vs Team Blue • Classic Card Game
        </p>
        <p className="text-[10px] text-emerald-500 font-black mt-4 uppercase tracking-[0.2em]">
          Deep Shelem v1.2.6 • DeepInk Team
        </p>
      </div>
    </div>
  );
}
