# Azul Board Game

A digital implementation of the popular board game Azul.

## Multiplayer Support

This game now supports multiplayer mode, allowing two players to play together over a local network.

## How to Run

### Development Mode

To run the game in development mode with hot reloading:

```bash
# Install dependencies
npm install

# Run both client and server in development mode
npm run dev:all
```

The game will be available at:
- Client: http://localhost:5173
- Server: http://localhost:3000

#### Accessing from Other Devices (Development Mode)

In development mode, other devices on your network need to access the Vite dev server:

1. Find your computer's local IP address:
   - On macOS/Linux: Run `ifconfig` in terminal
   - On Windows: Run `ipconfig` in command prompt
   
2. Other devices can access the game at:
   ```
   http://YOUR_IP_ADDRESS:5173
   ```
   
3. Make sure both the Vite dev server and the Socket.IO server are running.

### Production Mode

To build and run the game in production mode:

```bash
# Install dependencies
npm install

# Build and start the server
npm run start
```

The game will be available at http://localhost:3000

#### Accessing from Other Devices (Production Mode)

In production mode, other devices can access the game directly through the Express server:

```
http://YOUR_IP_ADDRESS:3000
```

## How to Play Multiplayer

1. Start the game using one of the methods above
2. Open the game in your browser
3. Click "Create New Room" to create a new game room
4. Share the displayed room code with your opponent
5. Have your opponent open the game and enter the room code to join

Both players will now be connected to the same game session!

## Troubleshooting

If you encounter issues:

1. **Cannot connect from other devices**: 
   - Make sure your firewall allows connections to ports 5173 (dev) and 3000
   - Verify you're using the correct IP address
   - Ensure both devices are on the same network

2. **Socket.IO connection issues**:
   - Check browser console for errors
   - Verify both the Vite dev server and Socket.IO server are running

3. **"No such file or directory" error**:
   - In development mode, make sure to access the Vite dev server (port 5173), not the Socket.IO server (port 3000)
   - In production mode, run `npm run build` before starting the server

## Game Rules

Azul is a tile-drafting and pattern-building game where players compete to create the most beautiful mosaic wall. Here's how to play:

### Setup

- The game is played with colored tiles: blue, red, black, yellow, and white
- Each color has 20 tiles in the bag at the start of the game
- 5 factory displays are arranged in a circle, each filled with exactly 4 random tiles from the bag
- A central area (the "pot") starts empty but will collect discarded tiles
- Each player has their own board consisting of:
  - A pattern wall (5x5 grid)
  - A staircase (5 rows of increasing length: 1-5 spaces)
  - A floor line (7 spaces with penalty values: -1, -1, -2, -2, -2, -3, -3)
  - A holding area for temporarily storing collected tiles

### Gameplay

1. **Taking Tiles**
   - On your turn, you must either:
     - Take all tiles of one color from a factory (moving remaining tiles to the pot)
     - Take all tiles of one color from the pot
   - The first player to take from the pot in a round gets the first player marker, and gets to start the next round

2. **Placing Tiles**
   - After collecting tiles, you must place them in a single row in your staircase
   - All tiles must be placed in the same row
   - You can't place tiles in a row if:
     - The row is already full
     - The row already contains different colored tiles
     - The corresponding wall row already has that color
   - Any tiles you can't place go to your floor line
   - Once you start placing tiles, you must place all tiles of that color from your holding area

3. **Turn Structure**
   - Select a factory or the pot to take tiles
   - Choose a row in your staircase to place tiles
   - Place all tiles of the selected color
   - Any excess tiles go to your floor line
   - End your turn

4. **Round End Scoring**
   - When all factories and the pot are empty, the wall tiling phase begins
   - For each complete row in the staircase:
     - One tile moves to the matching color position in the wall
     - Remaining tiles from that row go to the discard pile
   - Points are scored for each newly placed tile:
     - 1 point if the tile has no adjacent tiles
     - For tiles with connections, score points equal to the length of each connected line (horizontal and vertical)
     - A tile can score for both its horizontal and vertical connections
   - Floor line penalties are applied (-1 to -3 points per tile)
   - Floor tiles are moved to the discard pile

5. **Prep for next round**
   - The bag is refilled with tiles from the discard pile if needed
   - The player with the first player marker starts the next round
   - Factories are refilled with 4 tiles each from the bag

### Scoring
- Points are awarded for each newly placed tile based on its connections
- Tiles in the floor line result in penalty points (-1 to -3 per tile)
- A player's score cannot go below 0
- End-game scoring bonuses for completing rows, columns, and collecting all tiles of one color (not yet implemented)
- The game ends when a player completes a horizontal row on their wall
- The player with the highest score wins

### Special Features
- Players can reset their turn using the reset button in their holding area
- The game tracks the first player marker between rounds
- Visual feedback shows the active player and available actions


TODO:
1. extract UI elements to their own components
2. add a Settings component that will let us turn on/off the "test distribution" debug feature, and show/hide the Tile Bag and Discard Pile
3. implement end-game scoring bonuses for rows, columns, and all-of-a-kinds
4. add animations for the wall tiling phase and round scoring calculations

## Technologies Used

- React
- TypeScript
- Vite
- Socket.IO for real-time multiplayer
- Express for the server

## License

[Your license information]