import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Club, Diamond, Heart, Spade, Users, Play, Upload, User, Lock, LogIn, UserPlus } from 'lucide-react';

export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg 
      className="inline-block shrink-0 animate-in zoom-in duration-300" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24"
      fill="none"
    >
      <path 
        d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.99-3.818-3.99-.47 0-.915.085-1.328.235C14.79 2.5 13.518 1.5 12 1.5c-1.517 0-2.79 1-3.442 2.245-.413-.15-.858-.235-1.328-.235C5.12 3.51 3.41 5.29 3.41 7.5c0 .495.084.965.238 1.4C2.375 9.55 1.5 10.92 1.5 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.71 3.99 3.818 3.99.47 0 .915-.085 1.328-.235C9.21 22.5 10.482 23.5 12 23.5c1.517 0 2.79-1 3.442-2.245.413.15.858.235 1.328.235 2.108 0 3.818-1.78 3.818-3.99 0-.495-.084-.965-.238-1.4 1.273-.65 2.148-2.02 2.148-3.6z" 
        fill="#3b82f6" 
      />
      <path 
        d="M9.707 14.293L7.414 12a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 00-1.414-1.414l-6.293 6.293z" 
        fill="white" 
      />
    </svg>
  );
}

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
  const [email, setEmail] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [authError, setAuthError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [promoPass, setPromoPass] = useState('');
  const [isVerifyingPromo, setIsVerifyingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState(false);

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
        body: JSON.stringify({ username, password, email })
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

  useEffect(() => {
    if (showProfile && user) {
        setProfileEmail(user.email || '');
    }
  }, [showProfile, user]);

  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Experience & Level Calculation logic
  const calculateLevel = (stats: any) => {
    const games = stats?.games || 0;
    const wins = stats?.wins || 0;
    const xp = (games * 10) + (wins * 50);
    const level = Math.floor(Math.sqrt(xp / 100)) + 1;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const progress = (xp % nextLevelXP) / nextLevelXP * 100;
    return { level, progress, xp };
  };

  const getRank = (level: number) => {
    if (level >= 20) return { name: 'GRANDMASTER', color: 'text-amber-400' };
    if (level >= 15) return { name: 'MASTER', color: 'text-purple-400' };
    if (level >= 10) return { name: 'PRO', color: 'text-blue-400' };
    if (level >= 5) return { name: 'VETERAN', color: 'text-emerald-400' };
    return { name: 'ROOKIE', color: 'text-white/40' };
  };

  const levelData = calculateLevel(user?.stats);
  const rank = getRank(levelData.level);

  const updateProfile = async () => {
    if (!user) return;
    setIsUpdatingProfile(true);
    try {
      const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: profileEmail })
      });
      const data = await res.json();
      if (data.success) {
        const updatedUser = { ...user, email: profileEmail };
        setUser(updatedUser);
        localStorage.setItem('deep_shelem_user', JSON.stringify(updatedUser));
        alert('Profile updated successfully!');
      } else {
        alert('Error: ' + (data.error || 'Failed to update profile'));
      }
    } catch (err) {
      console.error('Update profile error:', err);
      alert('Connection error. Please try again.');
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handlePromotionVerify = async () => {
    if (!user) return;
    setIsVerifyingPromo(true);
    setPromoError('');
    setPromoSuccess(false);
    try {
      const res = await fetch('/api/verify-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, password: promoPass })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPromoSuccess(true);
        const updatedUser = { ...user, isVerified: true };
        setUser(updatedUser);
        localStorage.setItem('deep_shelem_user', JSON.stringify(updatedUser));
        setPromoPass('');
      } else {
        setPromoError(data.error || 'Failed to verify verification passcode.');
      }
    } catch (err) {
      console.error('Verify promo error:', err);
      setPromoError('Network error. Try again.');
    } finally {
      setIsVerifyingPromo(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const displayName = user.username;
    const avatar = user.avatar || '👤'; // Fallback if no upload
    if (mode === 'CREATE') onCreate(displayName, gameMode, avatar);
    else if (mode === 'JOIN' && roomId) onJoin(displayName, roomId, avatar, false);
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
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-white/10"
                placeholder="Username"
                required
              />
            </div>
          </div>
          
          {authMode === 'REGISTER' && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-[10px] uppercase font-black text-white/40 px-1 italic tracking-widest">Email (Optional)</label>
                <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-white/10"
                        placeholder="your@email.com"
                    />
                </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] uppercase font-black text-white/40 px-1 italic tracking-widest">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-2xl pl-12 pr-4 py-3 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all font-bold text-white placeholder:text-white/10"
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
          <div className="w-24 h-24 rounded-[2.5rem] border-4 border-emerald-500/50 overflow-hidden bg-black/40 flex items-center justify-center group-hover:border-yellow-500 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)]">
            {user.avatar || avatarPreview ? (
              <img src={avatarPreview || user.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User size={48} className="text-white/20" />
            )}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[2.5rem]">
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
          <div className="absolute -bottom-1 -right-1 bg-yellow-500 text-black w-8 h-8 rounded-full border-2 border-[#123e2a] flex items-center justify-center font-black text-xs">
            {levelData.level}
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        
        <div className="flex flex-col items-center">
            <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none mb-1 flex items-center justify-center gap-1.5 align-middle">
              {user.username}
              {user.isVerified && <VerifiedBadge size={18} />}
            </h1>
            <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${rank.color}`}>{rank.name}</p>
        </div>

        <div className="w-full max-w-[200px] mt-4 space-y-1">
            <div className="flex justify-between text-[8px] font-black text-white/30 uppercase tracking-widest">
                <span>LVL {levelData.level}</span>
                <span>{Math.floor(levelData.progress)}%</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px] border border-white/5">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${levelData.progress}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                />
            </div>
        </div>

        <div className="flex gap-4 mt-6">
            <button onClick={() => setShowProfile(true)} className="text-[10px] text-emerald-400 font-black uppercase tracking-widest hover:text-emerald-300 transition-colors bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-lg">Hall of Fame</button>
            <button onClick={() => { setUser(null); localStorage.removeItem('deep_shelem_user'); }} className="text-[10px] text-white/20 font-bold uppercase tracking-widest hover:text-rose-400 transition-colors">Sign Out</button>
        </div>
      </div>

      <AnimatePresence>
        {showProfile && (
            <motion.div 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                className="absolute inset-0 z-[100] bg-[#0a2e1f] p-6 md:p-8 flex flex-col"
            >
                <div className="flex justify-between items-start mb-6 shrink-0">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black uppercase tracking-widest text-emerald-500 leading-none mb-1">Player Card</h2>
                        <p className="text-[8px] md:text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">Season 1 • v1.3.2</p>
                    </div>
                    <button onClick={() => setShowProfile(false)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/10">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6">
                    <div className="relative p-6 rounded-[2.5rem] bg-gradient-to-br from-emerald-500/20 to-emerald-900/40 border border-emerald-500/20 shadow-2xl overflow-hidden group">
                        <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all" />
                        
                        <div className="flex items-center gap-5 relative z-10">
                            <div className="w-20 h-20 rounded-[2rem] overflow-hidden border-4 border-emerald-500/30 shadow-xl bg-black/40">
                                {user.avatar ? (
                                    <img src={user.avatar} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-emerald-500 text-3xl font-black">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-white font-black text-2xl tracking-tighter uppercase leading-tight flex items-center gap-1.5">
                                    {user.username}
                                    {user.isVerified && <VerifiedBadge size={20} />}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-black/60 border border-white/10 ${rank.color}`}>
                                        {rank.name}
                                    </span>
                                    <span className="text-[9px] font-mono text-white/20">ID: {user.id.slice(0, 8)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 space-y-2 relative z-10">
                            <div className="flex justify-between text-[9px] font-black text-white/40 uppercase tracking-widest italic">
                                <span>Progress to Level {levelData.level + 1}</span>
                                <span>{Math.floor(levelData.progress)}%</span>
                            </div>
                            <div className="h-2 bg-black/60 rounded-full overflow-hidden p-[1px] border border-white/5 shadow-inner">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${levelData.progress}%` }}
                                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <StatsCard icon={<Club size={16} />} label="Wins" value={user.stats?.wins || 0} color="emerald" />
                        <StatsCard icon={<Diamond size={16} />} label="Win Rate" value={`${user.stats?.games > 0 ? ((user.stats.wins / user.stats.games) * 100).toFixed(0) : 0}%`} color="yellow" />
                        <StatsCard icon={<Spade size={16} />} label="Total Games" value={user.stats?.games || 0} color="blue" />
                        <StatsCard icon={<Heart size={16} />} label="Peak Bid" value={user.stats?.highestScore || '---'} color="rose" />
                    </div>

                    <div className="bg-black/60 rounded-[2rem] border border-white/10 p-6 space-y-4 shadow-xl">
                        <label className="block text-[10px] font-black uppercase text-white/20 tracking-widest italic ml-1">Account Security</label>
                        <div className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase text-white/40 ml-1">Verified Email:</label>
                                <div className="flex gap-2">
                                    <input 
                                        value={profileEmail}
                                        onChange={(e) => setProfileEmail(e.target.value)}
                                        placeholder="Enter your email"
                                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-emerald-500 outline-none transition-all flex-1 font-bold shadow-inner"
                                    />
                                    <button 
                                        type="button"
                                        onClick={updateProfile}
                                        disabled={isUpdatingProfile}
                                        className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black text-[10px] font-black px-6 rounded-xl transition-all uppercase tracking-widest shadow-lg active:scale-95"
                                    >
                                        {isUpdatingProfile ? '...' : 'Sync'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-black/60 rounded-[2rem] border border-white/10 p-6 space-y-4 shadow-xl">
                        <label className="block text-[10px] font-black uppercase text-white/20 tracking-widest italic ml-1 flex items-center gap-1.5">
                            <span className="text-yellow-400">★</span> VERIFY ACCOUNT STATUS
                        </label>
                        <div className="space-y-4">
                            {user.isVerified ? (
                                <div className="p-4 bg-emerald-500/10 border border-emerald-500/10 rounded-2xl flex items-center gap-3">
                                    <VerifiedBadge size={28} />
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Verified Player Status Active</p>
                                        <p className="text-[8px] uppercase tracking-wider text-white/40 leading-normal mt-0.5">Your official checkmark has been fully applied. Your title is highlighted across all live sessions.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between items-center px-1">
                                        <label className="text-[9px] font-black uppercase text-white/40 leading-none">Promotion Keyphrase:</label>
                                        <span className="text-[7px] text-yellow-400 bg-yellow-400/5 px-2 py-0.5 rounded border border-yellow-400/10 font-bold uppercase">PRO DEMAND</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            type="password"
                                            value={promoPass}
                                            onChange={(e) => setPromoPass(e.target.value)}
                                            placeholder="Enter passcode"
                                            className="bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:border-yellow-500 outline-none transition-all flex-1 font-bold shadow-inner font-mono tracking-widest text-center"
                                        />
                                        <button 
                                            type="button"
                                            onClick={handlePromotionVerify}
                                            disabled={isVerifyingPromo || !promoPass}
                                            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-[10px] font-black px-6 rounded-xl transition-all uppercase tracking-widest shadow-lg active:scale-95 flex items-center justify-center min-w-[80px]"
                                        >
                                            {isVerifyingPromo ? '...' : 'Verify'}
                                        </button>
                                    </div>
                                    {promoError && <p className="text-[8px] font-black uppercase tracking-wider text-rose-400 ml-1 mt-1">{promoError}</p>}
                                    {promoSuccess && <p className="text-[8px] font-black uppercase tracking-wider text-emerald-400 ml-1 mt-1">Verified with success!</p>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-6 shrink-0">
                    <button onClick={() => setShowProfile(false)} className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/10 uppercase tracking-[0.3em] transition-all text-[10px] shadow-lg">Close Card</button>
                </div>
            </motion.div>
        )}
      </AnimatePresence>

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
                    onClick={() => onJoin(user.username, lastRoomId, user.avatar || '👤')}
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
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="text-center">
                <label className="block text-[10px] uppercase tracking-[0.3em] font-black text-white/20 mb-4 px-1">Access Protocol</label>
            </div>
            <div className="relative group">
                <div className="absolute -inset-1 bg-yellow-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <input
                    type="text"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    maxLength={4}
                    className="relative w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-5 focus:border-yellow-500 outline-none text-center text-4xl font-mono tracking-[0.4em] font-black text-yellow-400 placeholder:text-white/5 transition-all shadow-inner"
                    required
                />
            </div>
            <p className="text-[8px] text-center text-white/20 font-bold uppercase tracking-widest">Ask the host for the 4-digit room code</p>
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
              <button type="button" onClick={() => onJoin(user.username, roomId, user.avatar || '👤', true)} className="w-full py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 font-bold uppercase text-[9px] tracking-widest border border-white/5">Spectate Game</button>
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
          Deep Shelem v1.3.2 • DeepInk Team
        </p>
      </div>
    </div>
  );
}

function StatsCard({ icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
    const colors: { [key: string]: string } = {
        emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    };

    return (
        <div className={`bg-black/40 p-4 rounded-3xl border border-white/5 relative overflow-hidden group flex flex-col items-center`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${colors[color]}`}>
                {icon}
            </div>
            <p className="text-[9px] text-white/40 font-black uppercase tracking-widest mb-1 italic">{label}</p>
            <p className="text-xl md:text-2xl font-black text-white">{value}</p>
        </div>
    );
}
