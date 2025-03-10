import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Check if we're in development mode (dist directory doesn't exist)
const distPath = path.join(__dirname, '../dist');
const isDevelopment = !fs.existsSync(distPath);
const rooms = {};
// Clean up inactive rooms periodically
setInterval(() => {
    const now = Date.now();
    const inactiveThreshold = 3600000; // 1 hour in milliseconds
    for (const roomId in rooms) {
        const room = rooms[roomId];
        if (now - room.lastActivity > inactiveThreshold) {
            console.log(`Deleting inactive room ${roomId}`);
            delete rooms[roomId];
        }
    }
}, 300000); // Check every 5 minutes
// Create Express app
const app = express();
app.use(cors());
app.use(express.json());
// Serve static files from the dist directory after build (only in production)
if (!isDevelopment) {
    app.use(express.static(path.join(__dirname, '../dist')));
}
// Create HTTP server
const server = http.createServer(app);
// Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    pingTimeout: 60000, // Increase ping timeout to 60 seconds
    pingInterval: 25000, // Ping clients every 25 seconds
    transports: ['websocket', 'polling'] // Support both WebSocket and polling
});
// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    // Set a longer ping timeout to prevent disconnections
    // @ts-ignore - pingTimeout exists but is not in the type definitions
    socket.conn.pingTimeout = 60000; // 60 seconds (default is 5s)
    // Log transport type
    console.log(`Transport used: ${socket.conn.transport.name}`);
    // Ping/pong for connection testing
    socket.on('ping', (callback) => {
        console.log(`Received ping from ${socket.id}`);
        if (typeof callback === 'function') {
            try {
                callback({
                    time: new Date().toISOString(),
                    socketId: socket.id,
                    rooms: Array.from(socket.rooms)
                });
            }
            catch (error) {
                console.error(`Error sending ping response to ${socket.id}:`, error);
            }
        }
    });
    // Join a game room
    socket.on('joinRoom', (roomId) => {
        try {
            console.log(`Player ${socket.id} attempting to join room ${roomId}`);
            // Validate room ID
            if (!roomId || typeof roomId !== 'string' || roomId.length < 4) {
                console.log(`Invalid room ID: ${roomId}`);
                socket.emit('error', { message: 'Invalid room ID' });
                return;
            }
            // Check if player is already in a room
            let currentRoom = null;
            for (const existingRoomId in rooms) {
                if (rooms[existingRoomId].players.includes(socket.id)) {
                    currentRoom = existingRoomId;
                    break;
                }
            }
            // If player is already in the requested room, just reassign their index
            if (currentRoom === roomId) {
                const playerIndex = rooms[roomId].players.indexOf(socket.id);
                console.log(`Player ${socket.id} is already in room ${roomId} with index ${playerIndex}`);
                // Update last activity timestamp
                rooms[roomId].lastActivity = Date.now();
                // Send a specific roomJoined event
                socket.emit('roomJoined', { roomId, playerIndex });
                // If there's already a game state, send it to the player
                if (rooms[roomId].gameState) {
                    socket.emit('syncGameState', rooms[roomId].gameState);
                }
                return;
            }
            // If player is in a different room, leave that room first
            if (currentRoom) {
                console.log(`Player ${socket.id} leaving room ${currentRoom} to join ${roomId}`);
                const playerIndex = rooms[currentRoom].players.indexOf(socket.id);
                rooms[currentRoom].players.splice(playerIndex, 1);
                socket.leave(currentRoom);
                // Notify other players in the old room
                socket.to(currentRoom).emit('playerDisconnected', playerIndex);
                // If room is empty, don't delete it immediately to allow for reconnection
                if (rooms[currentRoom].players.length === 0) {
                    console.log(`Room ${currentRoom} is now empty`);
                }
            }
            // Create room if it doesn't exist
            if (!rooms[roomId]) {
                console.log(`Creating new room: ${roomId}`);
                rooms[roomId] = {
                    players: [],
                    gameState: null,
                    lastActivity: Date.now(),
                    processedActions: new Set()
                };
            }
            else {
                // Update last activity timestamp
                rooms[roomId].lastActivity = Date.now();
            }
            const room = rooms[roomId];
            // Only allow 2 players per room
            if (room.players.length >= 2) {
                console.log(`Room ${roomId} is full, rejecting player ${socket.id}`);
                socket.emit('roomFull');
                return;
            }
            // Add player to room
            room.players.push(socket.id);
            socket.join(roomId);
            // Assign player index (0 or 1)
            const playerIndex = room.players.indexOf(socket.id);
            console.log(`Player ${socket.id} joined room ${roomId} as player ${playerIndex}`);
            // Send a specific roomJoined event
            socket.emit('roomJoined', { roomId, playerIndex });
            // If this is the second player, start the game
            if (room.players.length === 2) {
                console.log(`Room ${roomId} is full, starting game`);
                io.to(roomId).emit('gameStart');
                // Ensure all players have the latest game state
                if (room.gameState) {
                    console.log(`Broadcasting current game state to all players in room ${roomId}`);
                    io.to(roomId).emit('syncGameState', room.gameState);
                }
            }
            // If there's already a game state, send it to the new player
            if (room.gameState) {
                console.log(`Sending existing game state to player ${socket.id}`);
                socket.emit('syncGameState', room.gameState);
            }
        }
        catch (error) {
            console.error(`Error joining room ${roomId}:`, error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });
    // Handle game state requests
    socket.on('requestGameState', (roomId) => {
        try {
            console.log(`Player ${socket.id} requesting game state for room ${roomId}`);
            if (!rooms[roomId]) {
                console.log(`Room ${roomId} not found for game state request`);
                return;
            }
            // Update last activity timestamp
            rooms[roomId].lastActivity = Date.now();
            // If there's a game state, send it to the requesting client
            if (rooms[roomId].gameState) {
                console.log(`Sending game state to requesting client ${socket.id}`);
                socket.emit('syncGameState', rooms[roomId].gameState);
            }
            else {
                console.log(`No game state available for room ${roomId}`);
            }
        }
        catch (error) {
            console.error(`Error handling game state request for room ${roomId}:`, error);
        }
    });
    // Handle direct game state provision
    socket.on('provideGameState', (roomId, gameState, targetSocketId) => {
        try {
            console.log(`Player ${socket.id} providing game state for room ${roomId} to ${targetSocketId}`);
            if (!rooms[roomId]) {
                console.log(`Room ${roomId} not found for game state provision`);
                return;
            }
            // Update last activity timestamp
            rooms[roomId].lastActivity = Date.now();
            // Store the provided game state
            rooms[roomId].gameState = gameState;
            // Send the game state to the target client
            io.to(targetSocketId).emit('provideGameState', gameState);
            console.log(`Game state provided to ${targetSocketId}`);
        }
        catch (error) {
            console.error(`Error handling game state provision for room ${roomId}:`, error);
        }
    });
    // Update game state
    socket.on('updateGameState', (roomId, gameState) => {
        try {
            // Check if this is a priority update
            const isPriorityUpdate = gameState.isPriorityUpdate === true;
            if (isPriorityUpdate) {
                console.log(`Received priority update from player ${socket.id} for room ${roomId}`);
            }
            if (!rooms[roomId]) {
                // Don't send error messages for game state updates
                // This can happen if a player is disconnected but their client still tries to update
                console.log(`Room ${roomId} not found for game state update`);
                return;
            }
            // Update last activity timestamp
            rooms[roomId].lastActivity = Date.now();
            // Check if this update has an action ID and we've already processed it
            // For priority updates, we always process them
            if (!isPriorityUpdate && gameState.actionId && rooms[roomId].processedActions.has(gameState.actionId)) {
                console.log(`Already processed update with actionId: ${gameState.actionId}, ignoring`);
                return;
            }
            // Check if this update is newer than the current state
            // For priority updates, we always process them
            const currentTimestamp = rooms[roomId].gameState?.timestamp || 0;
            const newTimestamp = gameState.timestamp || 0;
            if (!isPriorityUpdate && newTimestamp < currentTimestamp) {
                console.log(`Ignoring outdated update (timestamp: ${newTimestamp}, current: ${currentTimestamp})`);
                return;
            }
            // Log the action ID if present
            if (gameState.actionId) {
                console.log(`Received game state update with actionId: ${gameState.actionId}`);
                // Add this action ID to the processed set
                rooms[roomId].processedActions.add(gameState.actionId);
                // Limit the size of the processed actions set to prevent memory leaks
                if (rooms[roomId].processedActions.size > 100) {
                    // Convert to array, remove oldest entries, convert back to set
                    const actionsArray = Array.from(rooms[roomId].processedActions);
                    rooms[roomId].processedActions = new Set(actionsArray.slice(-50));
                }
            }
            // Store the updated game state
            rooms[roomId].gameState = gameState;
            // Broadcast to ALL clients in the room (including sender for confirmation)
            io.to(roomId).emit('syncGameState', gameState);
            if (isPriorityUpdate) {
                console.log(`Priority update processed and broadcast to room ${roomId}`);
            }
        }
        catch (error) {
            console.error(`Error updating game state for room ${roomId}:`, error);
            // Don't send error to client to avoid disrupting the game
        }
    });
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log(`User disconnected (${reason}):`, socket.id);
        try {
            // Remove player from any rooms they were in
            for (const roomId in rooms) {
                const room = rooms[roomId];
                const playerIndex = room.players.indexOf(socket.id);
                if (playerIndex !== -1) {
                    room.players.splice(playerIndex, 1);
                    // Notify other player about disconnection
                    io.to(roomId).emit('playerDisconnected', playerIndex);
                    // Don't delete empty rooms immediately to allow for reconnection
                    if (room.players.length === 0) {
                        console.log(`Room ${roomId} is now empty`);
                        // Set a timeout to delete the room if no one rejoins
                        setTimeout(() => {
                            if (rooms[roomId] && rooms[roomId].players.length === 0) {
                                delete rooms[roomId];
                                console.log(`Room ${roomId} deleted (no reconnection after timeout)`);
                            }
                        }, 60000); // 1 minute timeout
                    }
                    console.log(`Player ${socket.id} left room ${roomId}`);
                }
            }
        }
        catch (error) {
            console.error('Error handling disconnection:', error);
        }
    });
    // Handle errors
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});
// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Mode: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`Server URL: http://localhost:${PORT}`);
});
// Route to handle all other requests (for SPA)
if (!isDevelopment) {
    // Only serve the index.html in production mode
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
    });
}
else {
    // In development mode, provide a simple HTML page for the server
    app.get('/', (req, res) => {
        res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Azul Game Server</title>
          <style>
            body {
              font-family: system-ui, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              line-height: 1.6;
            }
            h1 {
              color: #4a90e2;
            }
            .card {
              background: #f5f5f5;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 1rem;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            code {
              background: #e0e0e0;
              padding: 0.2rem 0.4rem;
              border-radius: 4px;
              font-family: monospace;
            }
          </style>
        </head>
        <body>
          <h1>Azul Game Server</h1>
          <div class="card">
            <h2>Development Mode</h2>
            <p>The server is running in development mode. To play the game:</p>
            <ol>
              <li>Open <a href="http://localhost:5173" target="_blank">http://localhost:5173</a> in your browser</li>
              <li>Create a room and share the room code with another player</li>
            </ol>
          </div>
          <div class="card">
            <h2>For other devices on your network:</h2>
            <p>Other players can access the game at:</p>
            <code>http://[your-ip-address]:5173</code>
            <p>Make sure both the Vite dev server and this Socket.IO server are running.</p>
          </div>
        </body>
      </html>
    `);
    });
}
