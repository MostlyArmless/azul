# Azul

A digital implementation of the popular tile-placement board game Azul.

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
   - Any tiles you can't place go to your floor line
   - Once you start placing tiles, you must place all tiles of that color from your holding area

3. **Turn Structure**
   - Select a factory or the pot to take tiles
   - Choose a row in your staircase to place tiles
   - Place all tiles of the selected color
   - Any excess tiles go to your floor line
   - End your turn

4. **Round End**
   - A round ends when all factories and the pot are empty
   - The bag is refilled with tiles from the pot if needed
   - The player with the first player marker starts the next round

### Scoring
(Not yet implemented in current version)
- Points are awarded for completing rows and creating patterns
- Tiles in the floor line result in penalty points as shown (-1 to -3)
- The game ends when a player completes a horizontal row on their wall
- The player with the highest score wins

### Special Features
- Players can reset their turn using the reset button in their holding area
- The game tracks the first player marker between rounds
- Visual feedback shows the active player and available actions
