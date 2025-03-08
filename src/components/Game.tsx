import React, { useState, useEffect } from "react";
import { produce } from "immer";
import {
  GameState,
  PlayerBoard as PlayerBoardType,
  Tile,
  TileType,
} from "../types";
import PlayerBoard from "./PlayerBoard";

const INITIAL_TILES_PER_FACTORY = 4;
const NUM_FACTORIES = 5;

const createEmptyPlayerBoard = (): PlayerBoardType => ({
  wall: Array(5)
    .fill(null)
    .map(() => Array(5).fill(null)),
  readyZone: Array(5)
    .fill(null)
    .map((_, i) => Array(i + 1).fill(null)),
  floor: Array(7).fill(null),
  score: 0,
  holdingArea: [],
});

const createInitialGameState = (): GameState => {
  const tileTypes: TileType[] = ["blue", "red", "black", "yellow", "white"];
  const tileBag: Tile[] = [];

  // Create 20 of each tile type
  tileTypes.forEach((type) => {
    for (let i = 0; i < 20; i++) {
      tileBag.push({ type });
    }
  });

  // Shuffle the bag
  for (let i = tileBag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tileBag[i], tileBag[j]] = [tileBag[j], tileBag[i]];
  }

  return {
    players: [createEmptyPlayerBoard(), createEmptyPlayerBoard()],
    currentPlayer: 0,
    tileBag,
    factories: Array(NUM_FACTORIES)
      .fill(null)
      .map(() => []),
    pot: [],
    selectedTile: null,
    hasPlacedTile: false,
    selectedColor: null,
  };
};

const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(
    createInitialGameState()
  );

  // Fill factories at the start of each round
  useEffect(() => {
    const fillFactories = () => {
      setGameState(
        produce((draft) => {
          // Fill each factory with 4 random tiles from the bag
          draft.factories = draft.factories.map(() => {
            const factoryTiles: Tile[] = [];
            for (let i = 0; i < INITIAL_TILES_PER_FACTORY; i++) {
              if (draft.tileBag.length > 0) {
                // Take a random tile from the bag
                const randomIndex = Math.floor(
                  Math.random() * draft.tileBag.length
                );
                factoryTiles.push(draft.tileBag[randomIndex]);
                // Remove the tile from the bag
                draft.tileBag.splice(randomIndex, 1);
              }
            }
            return factoryTiles;
          });
        })
      );
    };

    // Only fill factories if they're all empty
    if (gameState.factories.every((factory) => factory.length === 0)) {
      fillFactories();
    }
  }, [gameState.factories]);

  const handleEndTurn = () => {
    setGameState(
      produce((draft) => {
        const currentPlayer = draft.players[draft.currentPlayer];

        // Verify all tiles of the selected color have been placed
        const hasUnplacedTiles = currentPlayer.holdingArea.some(
          (t) => t && t.type === draft.selectedColor
        );

        if (hasUnplacedTiles) return; // Don't allow ending turn with unplaced tiles

        // Move remaining holding area tiles to pot
        const remainingTiles = currentPlayer.holdingArea.filter(
          (t) => t !== null
        );
        draft.pot.push(...remainingTiles.map((t) => t!));
        currentPlayer.holdingArea = [];

        // Reset turn state
        draft.selectedTile = null;
        draft.selectedColor = null;
        draft.hasPlacedTile = false;
        draft.currentPlayer = (draft.currentPlayer + 1) % 2;

        // If all factories are empty, refill them from the bag
        // If bag is empty, move all tiles from pot back to bag and shuffle
        if (draft.factories.every((factory) => factory.length === 0)) {
          if (draft.tileBag.length === 0 && draft.pot.length > 0) {
            draft.tileBag = [...draft.pot];
            draft.pot = [];
            // Shuffle the bag
            for (let i = draft.tileBag.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [draft.tileBag[i], draft.tileBag[j]] = [
                draft.tileBag[j],
                draft.tileBag[i],
              ];
            }
          }
        }
      })
    );
  };

  const handleFactoryClick = (factoryIndex: number) => {
    if (
      gameState.factories[factoryIndex].length === 0 ||
      gameState.hasPlacedTile
    )
      return;

    setGameState(
      produce((draft) => {
        // Move all tiles to current player's holding area
        draft.players[draft.currentPlayer].holdingArea = [
          ...draft.factories[factoryIndex],
        ];

        // Clear the factory
        draft.factories[factoryIndex] = [];
      })
    );
  };

  const handleHoldingAreaTileClick = (playerIndex: number, tile: Tile) => {
    if (
      playerIndex !== gameState.currentPlayer ||
      gameState.hasPlacedTile ||
      (gameState.selectedColor && tile.type !== gameState.selectedColor)
    )
      return;

    setGameState(
      produce((draft) => {
        draft.selectedTile = tile;
        draft.selectedColor = tile.type;
      })
    );
  };

  const handleReadyZoneRowClick = (playerIndex: number, rowIndex: number) => {
    if (playerIndex !== gameState.currentPlayer || !gameState.selectedTile)
      return;

    setGameState(
      produce((draft) => {
        const playerBoard = draft.players[playerIndex];
        const row = playerBoard.readyZone[rowIndex];

        // Find the rightmost empty spot in the row
        const emptySpotIndex = row.lastIndexOf(null);
        if (emptySpotIndex === -1) return; // Row is full

        // Place the selected tile
        row[emptySpotIndex] = draft.selectedTile;

        // Remove the placed tile from holding area
        const tileIndex = playerBoard.holdingArea.findIndex(
          (t) => t && t.type === draft.selectedColor
        );
        if (tileIndex !== -1) {
          playerBoard.holdingArea[tileIndex] = null;
        }

        // Check if there are any more tiles of this color in the holding area
        const nextTileIndex = playerBoard.holdingArea.findIndex(
          (t) => t && t.type === draft.selectedColor
        );

        if (nextTileIndex === -1) {
          // No more tiles of this color
          draft.hasPlacedTile = true;
          draft.selectedTile = null;
          draft.selectedColor = null;
        } else {
          // Keep the next tile of the same color selected
          draft.selectedTile = playerBoard.holdingArea[nextTileIndex];
        }
      })
    );
  };

  const handleFloorClick = (playerIndex: number) => {
    if (playerIndex !== gameState.currentPlayer || !gameState.selectedTile)
      return;

    setGameState(
      produce((draft) => {
        const playerBoard = draft.players[playerIndex];
        const floor = playerBoard.floor;

        // Find the leftmost empty spot in the floor
        const emptySpotIndex = floor.findIndex((spot) => spot === null);
        if (emptySpotIndex === -1) return; // Floor is full

        // Place the selected tile
        floor[emptySpotIndex] = draft.selectedTile;

        // Remove the placed tile from holding area
        const tileIndex = playerBoard.holdingArea.findIndex(
          (t) => t && t.type === draft.selectedColor
        );
        if (tileIndex !== -1) {
          playerBoard.holdingArea[tileIndex] = null;
        }

        // Check if there are any more tiles of this color in the holding area
        const nextTileIndex = playerBoard.holdingArea.findIndex(
          (t) => t && t.type === draft.selectedColor
        );

        if (nextTileIndex === -1) {
          // No more tiles of this color
          draft.hasPlacedTile = true;
          draft.selectedTile = null;
          draft.selectedColor = null;
        } else {
          // Keep the next tile of the same color selected
          draft.selectedTile = playerBoard.holdingArea[nextTileIndex];
        }
      })
    );
  };

  return (
    <div
      className="game"
      style={{
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <h1>Azul</h1>

      {/* Factories */}
      <div
        className="factories-container"
        style={{
          position: "relative",
          width: "400px",
          height: "400px",
          marginBottom: "20px",
        }}
      >
        {/* Central Pot */}
        <div
          className="pot"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            border: "2px solid #999",
            display: "flex",
            flexWrap: "wrap",
            padding: "5px",
            gap: "2px",
            backgroundColor: "white",
          }}
        >
          {gameState.pot.map((tile, index) => (
            <div
              key={index}
              style={{
                width: "20px",
                height: "20px",
                backgroundColor: `var(--${tile.type})`,
                border: "1px solid #999",
              }}
            />
          ))}
        </div>

        {/* Factories in a circle */}
        {gameState.factories.map((factory, index) => {
          const angle = (index * 2 * Math.PI) / NUM_FACTORIES;
          const radius = 150; // Distance from center
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <div
              key={index}
              onClick={() => handleFactoryClick(index)}
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                display: "grid",
                gridTemplateColumns: "repeat(2, 40px)",
                gap: "2px",
                padding: "10px",
                border: "1px solid #999",
                borderRadius: "50%",
                cursor: factory.length > 0 ? "pointer" : "default",
                opacity: factory.length > 0 ? 1 : 0.5,
                backgroundColor: "white",
              }}
            >
              {factory.map((tile, tileIndex) => (
                <div
                  key={tileIndex}
                  style={{
                    width: "40px",
                    height: "40px",
                    backgroundColor: `var(--${tile.type})`,
                    border: "1px solid #999",
                  }}
                />
              ))}
            </div>
          );
        })}
      </div>

      {/* End Turn Button */}
      <button
        onClick={handleEndTurn}
        disabled={!gameState.hasPlacedTile}
        style={{
          padding: "10px 20px",
          marginBottom: "20px",
          fontSize: "1.1em",
          cursor: gameState.hasPlacedTile ? "pointer" : "default",
          opacity: gameState.hasPlacedTile ? 1 : 0.5,
        }}
      >
        End Turn
      </button>

      {/* Player Boards */}
      <div
        className="players"
        style={{
          display: "flex",
          gap: "20px",
          flexWrap: "nowrap",
          justifyContent: "center",
          width: "100%",
          overflowX: "auto",
        }}
      >
        {gameState.players.map((board, index) => (
          <PlayerBoard
            key={index}
            board={board}
            playerIndex={index}
            isActive={index === gameState.currentPlayer}
            onReadyZoneRowClick={(rowIndex) =>
              handleReadyZoneRowClick(index, rowIndex)
            }
            onFloorClick={() => handleFloorClick(index)}
            onHoldingAreaTileClick={(tile) =>
              handleHoldingAreaTileClick(index, tile)
            }
            selectedTile={gameState.selectedTile}
            selectedColor={gameState.selectedColor}
          />
        ))}
      </div>
    </div>
  );
};

export default Game;
