import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createServer as createViteServer } from 'vite';
import { nanoid } from 'nanoid';
import fs from 'fs';
import multer from 'multer';
import bcrypt from 'bcryptjs';

const PORT = 3000;
const IS_PROD = process.env.NODE_ENV === 'production';
const DB_FILE = path.join(process.cwd(), 'game_history.json');
const USERS_DB = path.join(process.cwd(), 'Database.json');
const IMAGES_DIR = path.join(process.cwd(), 'Images');

// Initialize Directories & DBs
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR);
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ games: [] }, null, 2));
}
if (!fs.existsSync(USERS_DB)) {
  fs.writeFileSync(USERS_DB, JSON.stringify({ users: [] }, null, 2));
}

// Multer Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'Images/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${nanoid()}${ext}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

function saveGameResult(result: any) {
  try {
    const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    data.games.push({ ...result, timestamp: new Date().toISOString() });
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Failed to save game result:', err);
  }
}

function getUsers() {
  try {
    if (!fs.existsSync(USERS_DB)) return [];
    const data = JSON.parse(fs.readFileSync(USERS_DB, 'utf-8'));
    return Array.isArray(data.users) ? data.users : [];
  } catch (err) {
    console.error('Error reading users database:', err);
    return [];
  }
}

function saveUsers(users: any[]) {
  try {
    fs.writeFileSync(USERS_DB, JSON.stringify({ users: Array.isArray(users) ? users : [] }, null, 2));
  } catch (err) {
    console.error('Error saving users database:', err);
  }
}

// Game Types
type Suit = 'SPADES' | 'HEARTS' | 'DIAMONDS' | 'CLUBS';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  socketId: string;
  cards: Card[];
  team: 0 | 1; 
}

enum GamePhase {
  LOBBY = 'LOBBY',
  BIDDING = 'BIDDING',
  DISCARDING = 'DISCARDING', 
  PLAYING = 'PLAYING',
  SCORING = 'SCORING',
  GAME_OVER = 'GAME_OVER'
}

interface Room {
  id: string;
  mode: '2_PLAYER' | '4_PLAYER';
  players: Player[];
  spectators: { id: string; name: string; avatar: string; socketId: string }[];
  phase: GamePhase;
  subPhase?: 'HAND' | 'PILE'; // For 2-player mode
  currentTurn: number; 
  dealerIndex: number;
  highestBid: { value: number; bidderId: string | null };
  hokm: Suit | null;
  centerCards: Card[];
  currentTrick: { playerId: string; card: Card; fromPile?: boolean }[];
  lastTrickWinnerId: string | null;
  messages: { id: string; sender: string; text: string; time: number }[];
  piles: { [playerId: string]: Card[][] }; // 3 piles of N cards
  scores: { [team: number]: number };
  bids: { [playerId: string]: number | 'PASS' };
  pointsThisRound: { [team: number]: number };
  roundCount: number;
  trickHistory: { winnerName: string; cards: Card[]; points: number }[];
  resignRequest?: { requesterId: string; status: 'PENDING' | 'REJECTED' };
}

const rooms: Map<string, Room> = new Map();

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use('/Images', express.static(IMAGES_DIR));

  // Auth & Upload Endpoints
  app.post('/api/register', async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      
      const users = getUsers();
      if (users.find((u: any) => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = { id: nanoid(), username, password: hashedPassword, avatar: null };
      users.push(newUser);
      saveUsers(users);
      res.json({ message: 'User registered', userId: newUser.id });
    } catch (err) {
      console.error('Register error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const users = getUsers();
      const user = users.find((u: any) => u.username === username);
      
      if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({ 
        id: user.id, 
        username: user.username, 
        avatar: user.avatar 
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/upload-avatar', upload.single('avatar'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const { userId } = req.body;
      const users = getUsers();
      const user = users.find((u: any) => u.id === userId);
      
      if (user) {
        const avatarUrl = `/Images/${req.file.filename}`;
        user.avatar = avatarUrl;
        saveUsers(users);
        res.json({ avatar: avatarUrl });
      } else {
        res.status(404).json({ error: 'User not found' });
      }
    } catch (err) {
      console.error('Upload error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: '*' }
  });

  if (!IS_PROD) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  function resolveRound(room: Room) {
    const hakamId = room.highestBid.bidderId!;
    const hakamTeam = room.players.find(p => p.id === hakamId)!.team;
    const otherTeam = hakamTeam === 0 ? 1 : 0;
    
    const hakamTeamPoints = room.pointsThisRound[hakamTeam];
    const otherTeamPoints = room.pointsThisRound[otherTeam];
    const bid = room.highestBid.value;
    let roundScore = hakamTeamPoints;

    // Shelem Bonus (All points in a round)
    if (hakamTeamPoints === 165) {
      roundScore = 330; // Double points for Shelem
    } else if (otherTeamPoints === 165) {
      // Shelem against bidder!
      room.scores[hakamTeam] -= 330;
      room.scores[otherTeam] += 165; // Normal points for them or maybe also bonus
      roundScore = 0; // Hakam team gets nothing
    }

    if (hakamTeamPoints >= bid && roundScore > 0) {
      room.scores[hakamTeam] += roundScore;
      room.scores[otherTeam] += otherTeamPoints === 165 ? 0 : otherTeamPoints;
    } else if (roundScore === 0 && otherTeamPoints === 165) {
        // Handled in Shelem logic above
    } else {
      room.scores[hakamTeam] -= bid;
      room.scores[otherTeam] += otherTeamPoints;
    }

    const WINNING_SCORE = room.mode === '2_PLAYER' ? 1200 : 660; 
    if (room.scores[0] >= WINNING_SCORE || room.scores[1] >= WINNING_SCORE) {
      room.phase = GamePhase.GAME_OVER;
      saveGameResult({ scores: room.scores, players: room.players.map(p => p.name) });
    } else {
      room.phase = GamePhase.SCORING;
      setTimeout(() => {
        startNewRound(room);
        io.to(room.id).emit('game_update', room);
      }, 5000);
    }
  }

  // Socket logic
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ name, mode, avatar, userId }) => {
      const roomId = nanoid(4).toUpperCase();
      const room: Room = {
        id: roomId,
        mode: mode || '4_PLAYER',
        players: [{ id: userId || socket.id, name, avatar, socketId: socket.id, cards: [], team: 0 }],
        spectators: [],
        phase: GamePhase.LOBBY,
        currentTurn: 0,
        dealerIndex: 0,
        highestBid: { value: 0, bidderId: null },
        hokm: null,
        centerCards: [],
        currentTrick: [],
        lastTrickWinnerId: null,
        messages: [],
        piles: {},
        scores: { 0: 0, 1: 0 },
        bids: {},
        pointsThisRound: { 0: 0, 1: 0 },
        roundCount: 0,
        trickHistory: []
      };
      rooms.set(roomId, room);
      socket.join(roomId);
      socket.emit('room_created', room);
    });

    socket.on('join_room', ({ roomId, name, avatar, userId, asSpectator }) => {
      const room = rooms.get(roomId);
      if (!room) return socket.emit('error', 'Room not found');
      
      const maxPlayers = room.mode === '2_PLAYER' ? 2 : 4;

      // Rejoin logic
      const existingPlayer = room.players.find(p => p.id === userId);
      if (existingPlayer) {
        existingPlayer.socketId = socket.id;
        socket.join(roomId);
        socket.emit('player_joined', room);
        io.to(roomId).emit('game_update', room);
        return;
      }

      const isFull = room.players.length >= maxPlayers;

      if (asSpectator || isFull) {
        let spectator = room.spectators.find(s => s.id === userId);
        if (spectator) {
           spectator.socketId = socket.id;
        } else {
           room.spectators.push({ id: userId || socket.id, name, avatar, socketId: socket.id });
        }
        socket.join(roomId);
        socket.emit('spectator_joined', room);
        io.to(roomId).emit('game_update', room);
        return;
      }

      const team: 0 | 1 = room.mode === '2_PLAYER' ? (room.players.length as 0 | 1) : ([0, 1, 0, 1][room.players.length] as 0 | 1);
      const player: Player = { id: userId || socket.id, name, avatar, socketId: socket.id, cards: [], team };
      room.players.push(player);
      socket.join(roomId);
      
      io.to(roomId).emit('player_joined', room);

      if (room.players.length === maxPlayers) {
        startNewRound(room);
        io.to(roomId).emit('game_start', room);
      }
    });

    socket.on('place_bid', ({ roomId, bid }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== GamePhase.BIDDING) return;
      if (room.players[room.currentTurn].socketId !== socket.id) return;

      const player = room.players[room.currentTurn];
      room.bids[player.id] = bid;
      if (bid !== 'PASS' && bid > room.highestBid.value) {
        room.highestBid = { value: bid, bidderId: player.id };
      }

      const activeBidders = room.players.filter(p => room.bids[p.id] !== 'PASS');
      const allResponded = room.players.every(p => room.bids[p.id] !== undefined);
      
      if (allResponded && (activeBidders.length <= 1 || bid === 165)) {
        if (!room.highestBid.bidderId) {
          startNewRound(room);
        } else {
          room.phase = GamePhase.DISCARDING;
          room.currentTurn = room.players.findIndex(p => p.id === room.highestBid.bidderId);
          room.players[room.currentTurn].cards.push(...room.centerCards);
          room.players[room.currentTurn].cards.sort(sortCards);
          room.centerCards = [];
        }
      } else {
        const playerCount = room.mode === '2_PLAYER' ? 2 : 4;
        do {
          room.currentTurn = (room.currentTurn + 1) % playerCount;
        } while (room.bids[room.players[room.currentTurn].id] === 'PASS');
      }
      io.to(roomId).emit('game_update', room);
    });

    socket.on('select_hokm_and_discard', ({ roomId, hokm, discards }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== GamePhase.DISCARDING) return;
      if (room.players[room.currentTurn].socketId !== socket.id) return;
      
      room.hokm = hokm;
      const hakam = room.players[room.currentTurn];
      const discardPoints = calculateTrickPoints(discards);
      room.pointsThisRound[hakam.team] += discardPoints;
      
      hakam.cards = hakam.cards.filter(c => !discards.some((d: Card) => d.suit === c.suit && d.rank === c.rank));
      hakam.cards.sort(sortCards);
      room.phase = GamePhase.PLAYING;
      room.subPhase = room.mode === '2_PLAYER' ? 'HAND' : undefined;
      io.to(roomId).emit('game_update', room);
    });

    socket.on('play_card', ({ roomId, card, fromPileIndex }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase !== GamePhase.PLAYING) return;
      if (room.players[room.currentTurn].socketId !== socket.id) return;

      const player = room.players[room.currentTurn];
      const playerCount = room.mode === '2_PLAYER' ? 2 : 4;

      if (room.mode === '2_PLAYER') {
        const isHakam = player.id === room.highestBid.bidderId;
        const isFirstCardOfGame = room.players.every(p => p.cards.length === 12);

        if (room.subPhase === 'HAND') {
          // Playing from hand
          const cardIndex = player.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
          if (cardIndex === -1) return;

          // Rule: Hakam must lead with Hokm (trump) as the very first card of the round
          const isFirstTrickOfRound = room.players.every(p => p.cards.length === 12) && room.currentTrick.length === 0;
          if (isFirstTrickOfRound && isHakam) {
            if (card.suit !== room.hokm) {
              return socket.emit('error_msg', 'Hakam must lead with Trump (Hokm) suit');
            }
          }

          // Follow suit logic (only if not the first card of the trick)
          if (room.currentTrick.length > 0) {
            const leadSuit = room.currentTrick[0].card.suit;
            if (player.cards.some(c => c.suit === leadSuit) && card.suit !== leadSuit) {
              return socket.emit('error_msg', 'Must follow suit');
            }
          }

          player.cards.splice(cardIndex, 1);
          room.currentTrick.push({ playerId: player.id, card, fromPile: false });

          if (room.currentTrick.length === 2) {
            room.subPhase = 'PILE';
            // Turn goes back to whoever started the trick
            const starterId = room.currentTrick[0].playerId;
            room.currentTurn = room.players.findIndex(p => p.id === starterId);
          } else {
            room.currentTurn = (room.currentTurn + 1) % 2;
          }
        } else if (room.subPhase === 'PILE') {
          // Playing from pile
          if (fromPileIndex === undefined) return;
          const pile = room.piles[player.id][fromPileIndex];
          if (!pile || pile.length === 0) return;
          
          const pileCard = pile[pile.length - 1];
          if (pileCard.suit !== card.suit || pileCard.rank !== card.rank) return;

          // Follow suit logic for pile
          const leadSuit = room.currentTrick[0].card.suit;
          // Check ALL available top cards from 3 piles to see if must follow suit
          const topCards = room.piles[player.id].filter(p => p.length > 0).map(p => p[p.length - 1]);
          if (topCards.some(c => c.suit === leadSuit) && card.suit !== leadSuit) {
            return socket.emit('error_msg', 'Must follow suit from piles');
          }

          pile.pop();
          room.currentTrick.push({ playerId: player.id, card, fromPile: true });

          if (room.currentTrick.length === 4) {
            const winnerId = resolveTrick(room);
            const winnerIndex = room.players.findIndex(p => p.id === winnerId);
            const trickPoints = calculateTrickPoints(room.currentTrick.map(t => t.card));
            room.pointsThisRound[room.players[winnerIndex].team] += trickPoints;

            room.trickHistory.push({
              winnerName: room.players[winnerIndex].name,
              cards: room.currentTrick.map(t => t.card),
              points: trickPoints
            });
            if (room.trickHistory.length > 5) room.trickHistory.shift();

            io.to(roomId).emit('game_update', room);
            
            setTimeout(() => {
              room.currentTrick = [];
              room.currentTurn = winnerIndex;
              room.subPhase = 'HAND';
              if (room.players.every(p => p.cards.length === 0 && room.piles[p.id].every(pile => pile.length === 0))) {
                resolveRound(room);
              }
              io.to(roomId).emit('game_update', room);
            }, 1500);
          } else {
            room.currentTurn = (room.currentTurn + 1) % 2;
          }
        }
      } else {
        // 4-PLAYER
        const cardIndex = player.cards.findIndex(c => c.suit === card.suit && c.rank === card.rank);
        if (cardIndex === -1) return;

        if (room.currentTrick.length > 0) {
          const leadSuit = room.currentTrick[0].card.suit;
          if (player.cards.some(c => c.suit === leadSuit) && card.suit !== leadSuit) {
            return socket.emit('error_msg', 'Must follow suit');
          }
        }

        player.cards.splice(cardIndex, 1);
        room.currentTrick.push({ playerId: player.id, card });

        if (room.currentTrick.length === 4) {
          const winnerId = resolveTrick(room);
          const winnerIndex = room.players.findIndex(p => p.id === winnerId);
          const trickPoints = calculateTrickPoints(room.currentTrick.map(t => t.card));
          room.pointsThisRound[room.players[winnerIndex].team] += trickPoints;

          room.trickHistory.push({
            winnerName: room.players[winnerIndex].name,
            cards: room.currentTrick.map(t => t.card),
            points: trickPoints
          });
          if (room.trickHistory.length > 5) room.trickHistory.shift();

          io.to(roomId).emit('game_update', room);
          
          setTimeout(() => {
            room.currentTrick = [];
            room.currentTurn = winnerIndex;
            if (room.players.every(p => p.cards.length === 0)) {
              resolveRound(room);
            }
            io.to(roomId).emit('game_update', room);
          }, 1500);
        } else {
          room.currentTurn = (room.currentTurn + 1) % 4;
        }
      }
      io.to(roomId).emit('game_update', room);
    });

    socket.on('send_message', ({ roomId, text }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const player = room.players.find(p => p.socketId === socket.id) || room.spectators.find(s => s.id === socket.id);
      if (!player) return;
      const message = { id: nanoid(), sender: player.name, text: text.slice(0, 200), time: Date.now() };
      room.messages.push(message);
      if (room.messages.length > 50) room.messages.shift();
      io.to(roomId).emit('game_update', room);
    });

    socket.on('request_resign', ({ roomId }) => {
      const room = rooms.get(roomId);
      if (!room || room.phase === GamePhase.LOBBY || room.phase === GamePhase.GAME_OVER) return;
      
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex === -1) return;

      const player = room.players[playerIndex];
      
      if (room.mode === '2_PLAYER') {
        const losingTeam = player.team;
        const winningTeam = losingTeam === 0 ? 1 : 0;
        room.scores[winningTeam] = 1200;
        room.phase = GamePhase.GAME_OVER;
        io.to(roomId).emit('game_update', room);
      } else {
        // 4 Player - Find teammate
        const teammateIdx = (playerIndex + 2) % 4;
        const teammate = room.players[teammateIdx];
        room.resignRequest = { requesterId: player.id, status: 'PENDING' };
        io.to(teammate.socketId).emit('resign_requested', { requesterName: player.name });
        io.to(roomId).emit('game_update', room);
      }
    });

    socket.on('respond_resign', ({ roomId, approved }) => {
      const room = rooms.get(roomId);
      if (!room || !room.resignRequest) return;
      
      if (approved) {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        const losingTeam = room.players[playerIndex].team;
        const winningTeam = losingTeam === 0 ? 1 : 0;
        room.scores[winningTeam] = 660;
        room.phase = GamePhase.GAME_OVER;
        room.resignRequest = undefined;
      } else {
        room.resignRequest = undefined;
        io.to(roomId).emit('resign_rejected');
      }
      io.to(roomId).emit('game_update', room);
    });

    socket.on('send_reaction', ({ roomId, reaction }) => {
      const room = rooms.get(roomId);
      if (!room) return;
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex === -1) return;
      
      io.to(roomId).emit('player_reaction', { playerId: room.players[playerIndex].id, reaction });
    });

    socket.on('disconnect', () => {
      rooms.forEach((room, roomId) => {
        const playerIdx = room.players.findIndex(p => p.socketId === socket.id);
        const spectatorIdx = room.spectators.findIndex(s => s.socketId === socket.id);
        
        if (playerIdx !== -1) {
          // In a real app we'd wait for reconnect, but for now we'll just log
          console.log(`Player ${room.players[playerIdx].name} disconnected from room ${roomId}`);
        } else if (spectatorIdx !== -1) {
          room.spectators.splice(spectatorIdx, 1);
          io.to(roomId).emit('game_update', room);
        }

        // Cleanup empty rooms
        setTimeout(() => {
          const updatedRoom = rooms.get(roomId);
          if (updatedRoom && updatedRoom.players.length === 0 && updatedRoom.spectators.length === 0) {
            rooms.delete(roomId);
            console.log(`Room ${roomId} deleted (empty)`);
          }
        }, 30000); // 30 seconds buffer
      });
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

function startNewRound(room: Room) {
  room.roundCount++;
  room.phase = GamePhase.BIDDING;
  
  const playerCount = room.mode === '2_PLAYER' ? 2 : 4;
  room.currentTurn = (room.dealerIndex + 1) % playerCount;
  room.highestBid = { value: 0, bidderId: null };
  room.hokm = null;
  room.bids = {};
  room.pointsThisRound = { 0: 0, 1: 0 };
  room.currentTrick = [];
  room.trickHistory = [];
  room.piles = {};

  const deck = createDeck();
  shuffle(deck);

  if (room.mode === '2_PLAYER') {
    // 2-Player mode:
    // 12 cards each hand (24 total)
    // 4 cards in center (28 total)
    // 3 piles of 4 cards for each player (24 total)
    // Total 52
    room.players[0].cards = deck.slice(0, 12).sort(sortCards);
    room.players[1].cards = deck.slice(12, 24).sort(sortCards);
    room.centerCards = deck.slice(24, 28);
    
    // Player 0 piles
    room.piles[room.players[0].id] = [
        deck.slice(28, 32),
        deck.slice(32, 36),
        deck.slice(36, 40)
    ];
    // Player 1 piles
    room.piles[room.players[1].id] = [
        deck.slice(40, 44),
        deck.slice(44, 48),
        deck.slice(48, 52)
    ];
  } else {
    // 4-Player mode
    room.players.forEach((p, i) => {
      p.cards = deck.slice(i * 12, (i + 1) * 12).sort(sortCards);
    });
    room.centerCards = deck.slice(48, 52);
  }
  
  room.dealerIndex = (room.dealerIndex + 1) % playerCount;
}

function sortCards(a: Card, b: Card) {
    return a.suit.localeCompare(b.suit) || getRankValue(b.rank) - getRankValue(a.rank);
}

function createDeck(): Card[] {
  const suits: Suit[] = ['SPADES', 'HEARTS', 'DIAMONDS', 'CLUBS'];
  const ranks: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return deck;
}

function shuffle(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function resolveTrick(room: Room): string {
  const leadSuit = room.currentTrick[0].card.suit;
  const hokm = room.hokm!;
  let winningTrick = room.currentTrick[0];
  
  for (let i = 1; i < room.currentTrick.length; i++) {
    const current = room.currentTrick[i];
    if (current.card.suit === hokm && winningTrick.card.suit !== hokm) {
      winningTrick = current;
    } else if (current.card.suit === winningTrick.card.suit) {
      if (getRankValue(current.card.rank) > getRankValue(winningTrick.card.rank)) {
        winningTrick = current;
      }
    } else if (current.card.suit === leadSuit && winningTrick.card.suit !== hokm) {
      winningTrick = current;
    }
  }
  room.lastTrickWinnerId = winningTrick.playerId;
  return winningTrick.playerId;
}

function getRankValue(rank: Rank): number {
  const values: { [key: string]: number } = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
  };
  return values[rank];
}

function calculateTrickPoints(cards: Card[]): number {
  let pts = 5; 
  for (const card of cards) {
    if (card.rank === '5') pts += 5;
    if (card.rank === '10') pts += 10;
    if (card.rank === 'A') pts += 10;
  }
  return pts;
}

startServer();
