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
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 40px)",
              gap: "2px",
              padding: "10px",
              border: "1px solid #999",
              borderRadius: "50%",
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
          gap: "40px",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {gameState.players.map((board, index) => (
          <PlayerBoard key={index} board={board} playerIndex={index} />
        ))}
      </div>
    </div>
  );
};

export default Game;
