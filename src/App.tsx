import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import { motion, AnimatePresence } from 'motion/react';

const socket = io();

export default function App() {
  const [room, setRoom] = useState<any>(null);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [userId] = useState(() => {
    const saved = localStorage.getItem('shelem_user_id');
    if (saved) return saved;
    const newId = 'user_' + Math.random().toString(36).substring(2, 11);
    localStorage.setItem('shelem_user_id', newId);
    return newId;
  });

  const lastRoomId = localStorage.getItem('shelem_last_room');

  useEffect(() => {
    socket.on('room_created', (data) => setRoom(data));
    socket.on('player_joined', (data) => setRoom(data));
    socket.on('spectator_joined', (data) => setRoom(data));
    socket.on('game_start', (data) => setRoom(data));
    socket.on('game_update', (data) => {
      setRoom(data);
      if (data.id) {
        localStorage.setItem('shelem_last_room', data.id);
        localStorage.setItem('shelem_last_name', playerName);
      }
    });
    socket.on('error', (msg) => {
      setError(msg);
      if (msg === 'Room not found') {
        localStorage.removeItem('shelem_last_room');
        setRoom(null);
      }
      setTimeout(() => setError(''), 3000);
    });
    socket.on('error_msg', (msg) => {
      alert(msg);
    });

    return () => {
      socket.off('room_created');
      socket.off('player_joined');
      socket.off('spectator_joined');
      socket.off('game_start');
      socket.off('game_update');
      socket.off('error');
      socket.off('error_msg');
    };
  }, []);

  const createRoom = (name: string, mode: '2_PLAYER' | '4_PLAYER', avatar: string) => {
    setPlayerName(name);
    localStorage.setItem('shelem_last_name', name);
    localStorage.setItem('shelem_last_avatar', avatar);
    socket.emit('create_room', { name, mode, avatar, userId });
  };

  const joinRoom = (name: string, roomId: string, avatar: string, asSpectator?: boolean) => {
    setPlayerName(name);
    localStorage.setItem('shelem_last_name', name);
    localStorage.setItem('shelem_last_avatar', avatar);
    socket.emit('join_room', { name, roomId, avatar, asSpectator, userId });
  };

  return (
    <div className="min-h-screen bg-[#0a2e1f] text-white font-sans selection:bg-emerald-500/30">
      <AnimatePresence mode="wait">
        {!room ? (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex items-center justify-center min-h-screen p-4"
          >
            <Lobby 
                onCreate={createRoom} 
                onJoin={joinRoom} 
                error={error} 
                lastRoomId={lastRoomId}
            />
          </motion.div>
        ) : (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="min-h-screen"
          >
            <GameBoard room={room} socket={socket} playerName={playerName} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
