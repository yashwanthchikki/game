const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./database');
const { authenticateToken, authenticateSocket, SECRET_KEY } = require('./authMiddleware');

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = 5001;

// Basic health check
app.get('/health', (req, res) => {
    res.send('Server is running. Total Online: ' + (onlinePlayersCounter ? onlinePlayersCounter.value : 0));
});

// --- Friend System Routes ---
app.post('/api/friends/connect', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    db.run(`INSERT OR IGNORE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'pending')`,
        [userId, friendId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
});

app.post('/api/friends/accept', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id; // User accepting the request

    // We need to update both directions to be fully "connected" or just one?
    // Usually "friends" is symmetric. 
    // Let's assume the request was from friendId -> userId. 
    // Wait, my schema has (user_id, friend_id). 
    // If A req B, row: A, B, pending. B accepts -> Update row to accepted.
    // But B accepting means B is user_id? No.
    // Let's look for the row where friend_id is ME and user_id is THE REQUESTER.

    db.run(`UPDATE friends SET status = 'accepted' WHERE user_id = ? AND friend_id = ?`,
        [friendId, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            // Also insert reverse relation for easier querying? Or just handle in query.
            // For simplicity, insert reverse relation too.
            db.run(`INSERT OR REPLACE INTO friends (user_id, friend_id, status) VALUES (?, ?, 'accepted')`,
                [userId, friendId], () => { });
            res.json({ success: true });
        });
});

app.post('/api/friends/disconnect', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.id;

    db.run(`DELETE FROM friends WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        [userId, friendId, friendId, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        });
});

app.post('/api/friends/list', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.all(`SELECT u.id, u.username, f.status 
            FROM friends f 
            JOIN users u ON u.id = f.friend_id 
            WHERE f.user_id = ?`, [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.get('/api/users/search', authenticateToken, (req, res) => {
    const { q } = req.query;
    db.all(`SELECT id, username FROM users WHERE username LIKE ? LIMIT 10`, [`%${q}%`], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// --- Ranking & Profile Routes ---

app.get('/api/rankings', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Join users with profiles to get scores
    // Using profiles.score now
    const query = `
        SELECT u.username, 
               CAST(IFNULL(p.score, 0) AS INTEGER) as score,
               p.country,
               p.company
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        ORDER BY score DESC
        LIMIT ? OFFSET ?
    `;
    db.all(query, [limit, offset], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

app.post('/api/profile/update', authenticateToken, (req, res) => {
    const { customSections, country, company } = req.body;
    const userId = req.user.id;

    // Upsert profile
    const query = `
        INSERT INTO profiles (user_id, custom_sections, country, company) 
        VALUES (?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
            custom_sections = excluded.custom_sections,
            country = excluded.country,
            company = excluded.company
    `;

    db.run(query, [userId, JSON.stringify(customSections), country, company], (err) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ success: true });
    });
});

app.get('/api/profile/user/:username', authenticateToken, (req, res) => {
    const { username } = req.params;
    db.get(`SELECT p.* FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.username = ?`, [username], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (row) {
            res.json({
                customSections: JSON.parse(row.custom_sections || '[]'),
                country: row.country,
                company: row.company,
                score: row.score || 0
            });
        } else {
            res.json({ customSections: [], country: '', company: '', score: 0 });
        }
    });
});

app.get('/api/profile/get', authenticateToken, (req, res) => {
    const userId = req.user.id;
    db.get(`SELECT * FROM profiles WHERE user_id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (row) {
            res.json({
                customSections: JSON.parse(row.custom_sections || '[]'),
                country: row.country,
                company: row.company,
                score: row.score || 0
            });
        } else {
            res.json({ customSections: [], country: '', company: '' });
        }
    });
});

// Auth Routes
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hashedPassword = bcrypt.hashSync(password, 8);

    db.run(`INSERT INTO users (username, password) VALUES (?, ?)`, [username, hashedPassword], function (err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: 'Error registering user' });
        }
        const token = jwt.sign({ id: this.lastID, username }, SECRET_KEY, { expiresIn: '24h' });
        res.json({ token, username });
    });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: 'Error logging in' });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(password, user.password);
        if (!passwordIsValid) return res.status(401).json({ error: 'Invalid password' });

        const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
        if (onlinePlayersCounter) onlinePlayersCounter(1); // Increment online count
        res.json({ token, username: user.username });
    });
});

app.post('/api/auth/change-password', authenticateToken, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ error: 'Both old and new passwords are required' });
    }

    db.get(`SELECT password FROM users WHERE id = ?`, [userId], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'User not found' });

        const passwordIsValid = bcrypt.compareSync(oldPassword, row.password);
        if (!passwordIsValid) {
            return res.status(401).json({ error: 'Incorrect old password' });
        }

        const hashedNewPassword = bcrypt.hashSync(newPassword, 8);
        db.run(`UPDATE users SET password = ? WHERE id = ?`, [hashedNewPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: 'Error updating password' });
            res.json({ success: true, message: 'Password updated successfully' });
        });
    });
});

// Socket Middleware
io.use(authenticateSocket);

// Track users: socket.id -> user info
const connectedUsers = new Map(); // socketId -> { userId, username, roomId }

// --- Game Engine Integration ---
const GameState = require('./game_engine/GameState');
const DecisionSystem = require('./game_engine/DecisionSystem');
const PythonBridge = require('./game_engine/PythonBridge');
const ThreeStateCounter = require('./utils/ThreeStateCounter');

const scoreCounter = new ThreeStateCounter(db);
let onlinePlayersCounter;
(async () => {
    onlinePlayersCounter = await scoreCounter.setup('total_online_players', 0, 1, 1);
})();

const activeGames = new Map(); // roomId -> { gameState, decisionSystem, pythonBridge, intervals: { execution, animation }, playerSockets, playerCode, isPublic }

const startGame = (roomId) => {
    let gameData = activeGames.get(roomId);
    if (gameData && gameData.gameState) return; // Already running with state

    console.log(`Starting game engine for room ${roomId}`);
    const gameState = new GameState();
    const decisionSystem = new DecisionSystem();
    const pythonBridge = new PythonBridge();

    // If gameData exists (from lobby), upgrade it. If not, create new
    if (!gameData) {
        gameData = {
            playerSockets: {},
            playerUsernames: {}
        };
        activeGames.set(roomId, gameData);
    }

    // Attach Game Systems
    gameData.gameState = gameState;
    gameData.decisionSystem = decisionSystem;
    gameData.pythonBridge = pythonBridge;
    gameData.intervals = {};
    gameData.playerCode = {
        1: { code: '', stack: [] },
        2: { code: '', stack: [] }
    };

    // Notify start - Move players to Arena IMMEDIATELY
    io.to(roomId).emit('game_start', { roomId });

    // Start Match Countdown
    let countdown = 3;
    const countdownInterval = setInterval(() => {
        io.to(roomId).emit('match_countdown', { count: countdown });
        countdown--;
        if (countdown < 0) {
            clearInterval(countdownInterval);
            startExecutionLoop(roomId);
        }
    }, 1000);

    const startExecutionLoop = (rId) => {
        const gData = activeGames.get(rId);
        if (!gData) return;

        // 1. Execution Loop (900ms)
        gData.intervals.execution = setInterval(async () => {
            const args = {
                p1_hp: gameState.players[1].hp,
                p2_hp: gameState.players[2].hp,
                p1_mana: gameState.players[1].mana,
                p2_mana: gameState.players[2].mana,
                p1_ki: gameState.players[1].ki,
                p2_ki: gameState.players[2].ki,
                p1_pos: gameState.players[1].position,
                p2_pos: gameState.players[2].position,
                timer: gameState.timer,
                p1_points: gameState.players[1].points,
                p2_points: gameState.players[2].points,
            };

            // Execute P1 Code
            let p1Actions = ['idle', 'idle', 'idle'];
            if (gData.playerCode && gData.playerCode[1]) {
                const p1Data = gData.playerCode[1];
                const p1Args = { ...args, my_pos: args.p1_pos };

                if (p1Data.cooldownUntil && Date.now() < p1Data.cooldownUntil) {
                    if (p1Data.cooldownCode) {
                        try {
                            const result = await pythonBridge.execute(p1Data.cooldownCode, [], p1Args);
                            const resArray = Array.isArray(result) ? result : [result];
                            for (let i = 0; i < 3; i++) p1Actions[i] = resArray[i] || 'cooldown';
                        } catch (e) {
                            console.error("Error executing P1 cooldown code:", e);
                            p1Actions = ['cooldown', 'cooldown', 'cooldown'];
                        }
                    } else {
                        p1Actions = ['cooldown', 'cooldown', 'cooldown'];
                    }
                } else if (p1Data.code) {
                    try {
                        const result = await pythonBridge.execute(p1Data.code, p1Data.stack, p1Args);
                        const resArray = Array.isArray(result) ? result : [result];
                        for (let i = 0; i < 3; i++) p1Actions[i] = resArray[i] || 'idle';
                    } catch (e) {
                        console.error("Error executing P1 code:", e);
                    }
                }
            }

            // Execute P2 Code
            let p2Actions = ['idle', 'idle', 'idle'];
            if (gData.playerCode && gData.playerCode[2]) {
                const p2Data = gData.playerCode[2];
                const p2Args = { ...args, my_pos: args.p2_pos };

                if (p2Data.cooldownUntil && Date.now() < p2Data.cooldownUntil) {
                    if (p2Data.cooldownCode) {
                        try {
                            const result = await pythonBridge.execute(p2Data.cooldownCode, [], p2Args);
                            const resArray = Array.isArray(result) ? result : [result];
                            for (let i = 0; i < 3; i++) p2Actions[i] = resArray[i] || 'cooldown';
                        } catch (e) {
                            console.error("Error executing P2 cooldown code:", e);
                            p2Actions = ['cooldown', 'cooldown', 'cooldown'];
                        }
                    } else {
                        p2Actions = ['cooldown', 'cooldown', 'cooldown'];
                    }
                } else if (p2Data.code) {
                    try {
                        const result = await pythonBridge.execute(p2Data.code, p2Data.stack, p2Args);
                        const resArray = Array.isArray(result) ? result : [result];
                        for (let i = 0; i < 3; i++) p2Actions[i] = resArray[i] || 'idle';
                    } catch (e) {
                        console.error("Error executing P2 code:", e);
                    }
                }
            }

            // Process 3 Turns
            for (let i = 0; i < 3; i++) {
                const act1 = p1Actions[i];
                const act2 = p2Actions[i];

                const result = decisionSystem.processTurn(gameState, act1, act2);

                gameState.messageQueue.push({
                    ...result,
                    p1: { ...result.p1, intended: act1 },
                    p2: { ...result.p2, intended: act2 }
                });
            }

            // Emit updates
            io.to(rId).emit('game_stats', {
                players: gameState.players,
                timer: gameState.timer
            });

            // Decrement timer
            if (gameState.timer > 0) {
                gameState.timer--;

                // Ki regeneration is handled by function count in DecisionSystem
                // if (gameState.timer % 5 === 0) {
                //    [1, 2].forEach(id => {
                //        gameState.players[id].ki = Math.min(100, gameState.players[id].ki + 5);
                //    });
                // }
            } else {
                if (gameState.round < 3) {
                    gameState.round++;
                    gameState.timer = 480;
                    gameState.resetRound();
                    io.to(rId).emit('round_start', { round: gameState.round });
                } else {
                    // Game Over
                    clearInterval(gData.intervals.execution);
                    clearInterval(gData.intervals.animation);
                    gameState.messageQueue = [];

                    const p1HP = gameState.players[1].hp;
                    const p2HP = gameState.players[2].hp;
                    let winnerId = null;

                    if (p1HP > p2HP) winnerId = 1;
                    else if (p2HP > p1HP) winnerId = 2;
                    else winnerId = 'draw';

                    const loserId = winnerId === 1 ? 2 : (winnerId === 2 ? 1 : null);

                    io.to(rId).emit('game_over', { winner: winnerId });

                    const updateScore = (u, pts) => {
                        if (!u) return;
                        db.get('SELECT id FROM users WHERE username = ?', [u], (err, row) => {
                            if (row) {
                                db.run(`INSERT OR IGNORE INTO profiles (user_id, score) VALUES (?, 0)`, [row.id], () => {
                                    db.run(`UPDATE profiles SET score = score + ? WHERE user_id = ?`, [pts, row.id]);
                                });
                            }
                        });
                    };

                    if (winnerId === 'draw') {
                        updateScore(gData.playerUsernames[1], 50); // Points for draw?
                        updateScore(gData.playerUsernames[2], 50);
                    } else {
                        updateScore(gData.playerUsernames[winnerId], 100);
                        updateScore(gData.playerUsernames[loserId], 20);
                    }

                    activeGames.delete(rId);
                }
            }

            // Check Death -> Force Round End
            if (gameState.players[1].hp <= 0 || gameState.players[2].hp <= 0) {
                gameState.timer = 0; // Force end of round/game
            }

        }, 900);

        // 2. Animation Loop (400ms)
        gData.intervals.animation = setInterval(() => {
            if (gameState.messageQueue.length > 0) {
                const action = gameState.messageQueue.shift();
                io.to(rId).emit('game_action', action);
            }
        }, 400);
    };
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.username} (${socket.id})`);
    connectedUsers.set(socket.id, { ...socket.user, roomId: null });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const user = connectedUsers.get(socket.id);
        if (user) {
            connectedUsers.delete(socket.id);
            if (onlinePlayersCounter) onlinePlayersCounter(-1); // Decrement
        }
    });

    socket.on('create_room', ({ isPublic }) => {
        console.log(`Create room request from ${socket.user.username}, Public: ${isPublic}`);
        const roomId = Math.floor(100000 + Math.random() * 900000).toString();
        const password = Math.floor(1000 + Math.random() * 9000).toString();

        socket.join(roomId);
        const userData = connectedUsers.get(socket.id);
        if (userData) userData.roomId = roomId;


        // Initialize basic game data placeholder so it appears in lists
        activeGames.set(roomId, {
            gameState: null, // Will init on start
            isPublic: !!isPublic,
            password, // Store password
            playerSockets: { 1: socket.id },
            playerUsernames: { 1: socket.user.username },
            waiting: true // Flag to show it's in lobby state
        });

        socket.emit('room_created', { roomId, password });
        console.log(`Room ${roomId} created by ${socket.user.username}`);
    });

    socket.on('get_public_rooms', async () => {
        const rooms = [];
        const promises = [];

        for (const [id, game] of activeGames.entries()) {
            if (game.isPublic && game.waiting) {
                const hostName = game.playerUsernames[1];

                const promise = new Promise((resolve) => {
                    db.get(`SELECT p.score FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.username = ?`, [hostName], (err, row) => {
                        rooms.push({
                            roomId: id,
                            host: hostName,
                            hostScore: row ? row.score : 0,
                            password: game.password
                        });
                        resolve();
                    });
                });
                promises.push(promise);
            }
        }

        await Promise.all(promises);
        socket.emit('public_rooms_list', rooms);
    });

    socket.on('join_room', ({ roomId, password }) => {
        console.log(`${socket.user.username} joining room ${roomId}`);
        // In a real app, verify password against stored room info.
        socket.join(roomId);
        const userData = connectedUsers.get(socket.id);
        if (userData) userData.roomId = roomId;

        socket.emit('join_success', { roomId });

        // Notify others in the room
        socket.to(roomId).emit('user_joined', { username: socket.user.username, socketId: socket.id });

        // Check if game is already active (Reconnection) or Waiting
        if (activeGames.has(roomId)) {
            const gameData = activeGames.get(roomId);

            // Reconnection Logic
            if (gameData.playerUsernames[1] === socket.user.username) {
                gameData.playerSockets[1] = socket.id;
                console.log(`Player 1 (${socket.user.username}) reconnected to room ${roomId}`);
            } else if (gameData.playerUsernames[2] === socket.user.username) {
                gameData.playerSockets[2] = socket.id;
                console.log(`Player 2 (${socket.user.username}) reconnected to room ${roomId}`);
            }
            // Joining a waiting lobby as Player 2
            else if (gameData.waiting) {
                // If the game is waiting, and we are not a reconnecting player (checked above),
                // then we are the second player.
                gameData.playerSockets[2] = socket.id;
                gameData.playerUsernames[2] = socket.user.username;
                gameData.waiting = false; // Game is starting
                console.log(`Player 2 (${socket.user.username}) joined. Starting game ${roomId}...`);
                startGame(roomId);
            }
        }

        // Remove old logic that relied on !activeGames.has(roomId) for start
        // because now we always have it in waiting state.
    });

    socket.on('push_code', ({ code, stack, cooldownCode, roomId }) => {
        // Note: roomId might need to be passed or inferred from connectedUsers
        const userData = connectedUsers.get(socket.id);
        const targetRoomId = roomId || userData.roomId;

        console.log(`Code pushed to room ${targetRoomId} by ${socket.user.username}`);
        const gameData = activeGames.get(targetRoomId);
        if (!gameData) {
            console.warn(`No active game for room ${targetRoomId} to push code to.`);
            return;
        }

        let playerNum = null;
        if (gameData.playerSockets[1] === socket.id) {
            playerNum = 1;
        } else if (gameData.playerSockets[2] === socket.id) {
            playerNum = 2;
        }

        if (playerNum) {
            gameData.playerCode[playerNum] = {
                code,
                cooldownCode,
                stack: stack || [],
                cooldownUntil: Date.now() + 3000 // 3 seconds cooldown
            };
            socket.emit('code_pushed', { success: true, playerNum });
            console.log(`Player ${playerNum} code updated for room ${targetRoomId}`);
        } else {
            socket.emit('code_pushed', { success: false, message: 'Not a player in this game.' });
            console.warn(`Socket ${socket.id} is not a recognized player in room ${targetRoomId}.`);
        }
    });

    socket.on('compile_code', async ({ code }, callback) => {
        // We need an instance of PythonBridge. We can use one from an active game or create a temp one.
        // Since PythonBridge is stateless (except temp dir), we can create a new one or reuse.
        // But activeGames might not have one if not started.
        // Let's create a temporary one or use a singleton.
        // For now, I'll instantiate one if needed, but better to reuse.
        // I'll grab one from activeGames if available, or create new.
        const userData = connectedUsers.get(socket.id);
        let bridge = null;
        if (userData && userData.roomId && activeGames.has(userData.roomId)) {
            bridge = activeGames.get(userData.roomId).pythonBridge;
        } else {
            // Fallback
            const PythonBridge = require('./game_engine/PythonBridge');
            bridge = new PythonBridge();
        }

        const result = await bridge.checkSyntax(code);
        callback(result);
    });

    socket.on('get_opponent_data', ({ roomId, type }) => {
        const userData = connectedUsers.get(socket.id);
        const targetRoomId = roomId || userData.roomId;
        const gameData = activeGames.get(targetRoomId);

        if (!gameData) return;

        let myPlayerNum = null;
        if (gameData.playerSockets[1] === socket.id) myPlayerNum = 1;
        else if (gameData.playerSockets[2] === socket.id) myPlayerNum = 2;

        if (!myPlayerNum) return;

        const oppPlayerNum = myPlayerNum === 1 ? 2 : 1;
        const oppData = gameData.playerCode[oppPlayerNum];

        if (oppData) {
            let content = '';
            if (type === 'code') content = oppData.code || '# No code pushed yet';
            else if (type === 'stack') content = JSON.stringify(oppData.stack, null, 2) || '[]';

            socket.emit('opponent_data', { type, content });
        }
    });

    // Message with 'to' address
    socket.on('send_message', ({ to, message }) => {
        console.log(`Message from ${socket.user.username} to ${to}: ${message}`);

        // 'to' can be a socketId or 'room' (broadcast to room)
        if (to && io.sockets.sockets.get(to)) {
            io.to(to).emit('receive_message', {
                from: socket.user.username,
                fromId: socket.id,
                message,
                isPrivate: true
            });
        } else if (to === 'room') {
            const userData = connectedUsers.get(socket.id);
            if (userData && userData.roomId) {
                socket.to(userData.roomId).emit('receive_message', {
                    from: socket.user.username,
                    fromId: socket.id,
                    message,
                    isPrivate: false
                });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.user.username}`);
        connectedUsers.delete(socket.id);
        // Handle game cleanup if needed
    });
});

// SPA Fallback: Serve index.html for any other requests
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
