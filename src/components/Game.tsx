import React, { useState, useEffect } from "react";
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
    selectedTile: null,
  };
};

const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(
    createInitialGameState()
  );

  useEffect(() => {
    // Fill factories at the start of each round
    const fillFactories = () => {
      setGameState((prevState) => {
        const newState = { ...prevState };
        const { tileBag } = newState;

        newState.factories = newState.factories.map(() => {
          const factoryTiles: Tile[] = [];
          for (let i = 0; i < INITIAL_TILES_PER_FACTORY; i++) {
            if (tileBag.length > 0) {
              factoryTiles.push(tileBag.pop()!);
            }
          }
          return factoryTiles;
        });

        return newState;
      });
    };

    fillFactories();
  }, []);

  const handleFactoryClick = (factoryIndex: number) => {
    if (gameState.factories[factoryIndex].length === 0) return;

    setGameState((prevState) => {
      // Create a deep copy of the state
      const newState = {
        ...prevState,
        players: prevState.players.map((player, index) => {
          if (index === prevState.currentPlayer) {
            // Update the current player's board with a new holding area
            return {
              ...player,
              holdingArea: [...prevState.factories[factoryIndex]],
            };
          }
          return player;
        }),
        factories: prevState.factories.map((factory, index) =>
          index === factoryIndex ? [] : factory
        ),
      };

      console.log("Updated state:", newState);
      return newState;
    });
  };

  const handleHoldingAreaTileClick = (playerIndex: number, tile: Tile) => {
    if (playerIndex !== gameState.currentPlayer) return;

    setGameState((prevState) => ({
      ...prevState,
      selectedTile: tile,
    }));
  };

  const handleReadyZoneRowClick = (playerIndex: number, rowIndex: number) => {
    if (playerIndex !== gameState.currentPlayer || !gameState.selectedTile)
      return;

    setGameState((prevState) => {
      const newState = { ...prevState };
      const playerBoard = newState.players[playerIndex];
      const row = playerBoard.readyZone[rowIndex];

      // Find the rightmost empty spot in the row
      const emptySpotIndex = row.findIndex((spot) => spot === null);
      if (emptySpotIndex === -1) return prevState; // Row is full

      // Place the selected tile
      row[emptySpotIndex] = gameState.selectedTile;

      // Remove the placed tile from holding area
      playerBoard.holdingArea = playerBoard.holdingArea.filter(
        (t) => t !== gameState.selectedTile
      );
      newState.selectedTile = null;

      return newState;
    });
  };

  const handleFloorClick = (playerIndex: number) => {
    if (playerIndex !== gameState.currentPlayer || !gameState.selectedTile)
      return;

    setGameState((prevState) => {
      const newState = { ...prevState };
      const playerBoard = newState.players[playerIndex];
      const floor = playerBoard.floor;

      // Find the leftmost empty spot in the floor
      const emptySpotIndex = floor.findIndex((spot) => spot === null);
      if (emptySpotIndex === -1) return prevState; // Floor is full

      // Place the selected tile
      floor[emptySpotIndex] = gameState.selectedTile;

      // Remove the placed tile from holding area
      playerBoard.holdingArea = playerBoard.holdingArea.filter(
        (t) => t !== gameState.selectedTile
      );
      newState.selectedTile = null;

      return newState;
    });
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
        className="factories"
        style={{
          display: "flex",
          gap: "20px",
          marginBottom: "20px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {gameState.factories.map((factory, index) => (
          <div
            key={index}
            onClick={() => handleFactoryClick(index)}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 40px)",
              gap: "2px",
              padding: "10px",
              border: "1px solid #999",
              borderRadius: "50%",
              cursor: factory.length > 0 ? "pointer" : "default",
              opacity: factory.length > 0 ? 1 : 0.5,
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
        ))}
      </div>

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
          />
        ))}
      </div>
    </div>
  );
};

export default Game;
