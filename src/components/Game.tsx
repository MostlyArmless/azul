import React, { useState, useEffect } from "react";
import { produce } from "immer";
import {
  GamePhase,
  GameState,
  PlayerBoard as PlayerBoardType,
  Tile,
  TileType,
  WALL_PATTERN,
} from "../types";
import { COLORS } from "../constants";
import PlayerBoard from "./PlayerBoard";

const INITIAL_TILES_PER_FACTORY = 4;
const NUM_FACTORIES = 5;

const createEmptyPlayerBoard = (): PlayerBoardType => ({
  wall: Array(5)
    .fill(null)
    .map(() => Array(5).fill(null)),
  staircase: Array(5)
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
    discardPile: [],
    selectedTile: null,
    hasPlacedTile: false,
    selectedColor: null,
    firstPlayerMarkerIndex: 0,
    hasFirstPlayerBeenMoved: false,
    placedTilesThisTurn: [],
    currentTileSource: null,
    phase: GamePhase.Playing,
  };
};

const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(
    createInitialGameState()
  );

  useEffect(() => {
    // Fill factories at the start of the game
    if (
      gameState.factories.every((factory) => factory.length === 0) &&
      gameState.pot.length === 0
    ) {
      fillFactories();
    }
  }, []); // Only run once on mount

  // Save game state to localStorage
  const saveGame = () => {
    // Extract only the necessary state we want to save
    const savedState = {
      currentPlayer: gameState.currentPlayer,
      tileBag: gameState.tileBag,
      discardPile: gameState.discardPile,
      phase: gameState.phase,
      factories: gameState.factories,
      pot: gameState.pot,
      firstPlayerMarkerIndex: gameState.firstPlayerMarkerIndex,
      hasFirstPlayerBeenMoved: gameState.hasFirstPlayerBeenMoved,
      players: gameState.players.map((player) => ({
        wall: player.wall,
        staircase: player.staircase,
        floor: player.floor,
        score: player.score,
        holdingArea: player.holdingArea,
      })),
    };

    // Save to localStorage
    localStorage.setItem("azulGameSave", JSON.stringify(savedState));
    alert("Game saved successfully!");
  };

  // Load game state from localStorage
  const loadGame = () => {
    const savedGame = localStorage.getItem("azulGameSave");

    if (!savedGame) {
      alert("No saved game found!");
      return;
    }

    try {
      const savedState = JSON.parse(savedGame);

      // Create a new game state with the saved values
      setGameState((prevState) => ({
        ...prevState,
        currentPlayer: savedState.currentPlayer,
        tileBag: savedState.tileBag,
        discardPile: savedState.discardPile,
        phase: savedState.phase,
        factories: savedState.factories,
        pot: savedState.pot,
        firstPlayerMarkerIndex: savedState.firstPlayerMarkerIndex,
        hasFirstPlayerBeenMoved: savedState.hasFirstPlayerBeenMoved,
        players: savedState.players,
        // Reset temporary state
        selectedTile: null,
        hasPlacedTile: false,
        selectedColor: null,
        placedTilesThisTurn: [],
        currentTileSource: null,
      }));

      alert("Game loaded successfully!");
    } catch (error) {
      console.error("Error loading game:", error);
      alert("Error loading game!");
    }
  };

  const fillFactories = () => {
    setGameState(
      produce((draft) => {
        // Fill each factory one at a time
        for (
          let factoryIndex = 0;
          factoryIndex < NUM_FACTORIES;
          factoryIndex++
        ) {
          const factoryTiles: Tile[] = [];
          // Take 4 random tiles for this factory
          for (let i = 0; i < INITIAL_TILES_PER_FACTORY; i++) {
            if (draft.tileBag.length > 0) {
              const randomIndex = Math.floor(
                Math.random() * draft.tileBag.length
              );
              factoryTiles.push(draft.tileBag[randomIndex]);
              // Remove the selected tile from the bag
              draft.tileBag.splice(randomIndex, 1);
            }
          }
          draft.factories[factoryIndex] = factoryTiles;
        }
      })
    );
  };

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
        draft.placedTilesThisTurn = [];
        draft.currentTileSource = null;

        // Check if the round is complete before changing the current player
        if (
          draft.factories.every((factory) => factory.length === 0) &&
          draft.pot.length === 0
        ) {
          draft.phase = GamePhase.ReadyToWallTile;
        } else {
          draft.currentPlayer = (draft.currentPlayer + 1) % 2;
        }
      })
    );
  };

  const handleFactoryClick = (factoryIndex: number) => {
    if (
      gameState.factories[factoryIndex].length === 0 ||
      gameState.hasPlacedTile ||
      gameState.currentTileSource !== null // New check to prevent multiple factory selections
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

        // Track the source
        draft.currentTileSource = {
          type: "factory",
          index: factoryIndex,
        };
      })
    );
  };

  const handleHoldingAreaTileClick = (playerIndex: number, tile: Tile) => {
    if (playerIndex !== gameState.currentPlayer || gameState.hasPlacedTile)
      return;

    setGameState(
      produce((draft) => {
        draft.selectedTile = tile;
        draft.selectedColor = tile.type;
      })
    );
  };

  const isColorAllowedInRow = (
    wall: (Tile | null)[][],
    rowIndex: number,
    color: TileType
  ): boolean => {
    // Check if this color already exists in the wall row
    return !wall[rowIndex].some((tile) => tile?.type === color);
  };

  const handleStaircaseRowClick = (playerIndex: number, rowIndex: number) => {
    if (playerIndex !== gameState.currentPlayer || !gameState.selectedTile)
      return;

    setGameState(
      produce((draft) => {
        const playerBoard = draft.players[playerIndex];
        const row = playerBoard.staircase[rowIndex];

        // Check if this color is allowed in this row
        if (
          !isColorAllowedInRow(
            playerBoard.wall,
            rowIndex,
            draft?.selectedTile?.type ?? "blue"
          )
        ) {
          return; // Color already exists in wall row
        }

        // Find the rightmost empty spot in the row
        const emptySpotIndex = row.lastIndexOf(null);
        if (emptySpotIndex === -1) return; // Row is full

        // Place the selected tile
        row[emptySpotIndex] = draft.selectedTile;

        // Track the placed tile
        draft.placedTilesThisTurn.push({
          type: draft.selectedTile!.type,
          location: "staircase",
          rowIndex,
          position: emptySpotIndex,
        });

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

        // Track the placed tile
        draft.placedTilesThisTurn.push({
          type: draft.selectedTile!.type,
          location: "floor",
          position: emptySpotIndex,
        });

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

  const handlePotClick = () => {
    if (
      gameState.pot.length === 0 ||
      gameState.hasPlacedTile ||
      (gameState.currentTileSource !== null &&
        gameState.currentTileSource.type !== "pot") // Only prevent if we've selected from a factory
    )
      return;

    setGameState(
      produce((draft) => {
        // Move all tiles from pot to current player's holding area
        draft.players[draft.currentPlayer].holdingArea = [...draft.pot];

        // Clear the pot
        draft.pot = [];

        // Track the source
        draft.currentTileSource = { type: "pot" };

        // If this is the first time the pot is clicked in the game,
        // give the first player marker to the current player
        if (
          draft.firstPlayerMarkerIndex === 0 &&
          !draft.hasFirstPlayerBeenMoved
        ) {
          draft.firstPlayerMarkerIndex = draft.currentPlayer;
          draft.hasFirstPlayerBeenMoved = true;
        }
      })
    );
  };

  const handleResetPlacement = (playerIndex: number) => {
    if (
      playerIndex !== gameState.currentPlayer ||
      gameState.placedTilesThisTurn.length === 0
    )
      return;

    setGameState(
      produce((draft) => {
        const playerBoard = draft.players[playerIndex];

        // Create a map to count how many tiles of each type we need to restore
        const tilesToRestore = draft.placedTilesThisTurn.reduce(
          (acc, placement) => {
            acc[placement.type] = (acc[placement.type] || 0) + 1;
            return acc;
          },
          {} as Record<TileType, number>
        );

        // Remove tiles from their placed locations
        draft.placedTilesThisTurn.forEach((placement) => {
          if (placement.location === "staircase") {
            playerBoard.staircase[placement.rowIndex!][placement.position] =
              null;
          } else {
            playerBoard.floor[placement.position] = null;
          }
        });

        // Find empty spots in holding area
        const emptySpots = playerBoard.holdingArea
          .map((_, index) => index)
          .filter((index) => !playerBoard.holdingArea[index]);

        // Restore tiles to holding area
        let spotIndex = 0;
        Object.entries(tilesToRestore).forEach(([type, count]) => {
          for (let i = 0; i < count && spotIndex < emptySpots.length; i++) {
            playerBoard.holdingArea[emptySpots[spotIndex]] = {
              type: type as TileType,
            };
            spotIndex++;
          }
        });

        // Reset turn state
        draft.hasPlacedTile = false;
        draft.selectedTile = null;
        draft.selectedColor = null;
        draft.placedTilesThisTurn = [];
      })
    );
  };

  const handleResetTurn = (playerIndex: number) => {
    if (playerIndex !== gameState.currentPlayer) return;

    setGameState(
      produce((draft) => {
        const playerBoard = draft.players[playerIndex];

        // First, reset any placed tiles back to holding area
        if (draft.placedTilesThisTurn.length > 0) {
          // Create a map to count how many tiles of each type we need to restore
          const tilesToRestore = draft.placedTilesThisTurn.reduce(
            (acc, placement) => {
              acc[placement.type] = (acc[placement.type] || 0) + 1;
              return acc;
            },
            {} as Record<TileType, number>
          );

          // Remove tiles from their placed locations
          draft.placedTilesThisTurn.forEach((placement) => {
            if (placement.location === "staircase") {
              playerBoard.staircase[placement.rowIndex!][placement.position] =
                null;
            } else {
              playerBoard.floor[placement.position] = null;
            }
          });

          // Find empty spots in holding area
          const emptySpots = playerBoard.holdingArea
            .map((_, index) => index)
            .filter((index) => !playerBoard.holdingArea[index]);

          // Restore tiles to holding area
          let spotIndex = 0;
          Object.entries(tilesToRestore).forEach(([type, count]) => {
            for (let i = 0; i < count && spotIndex < emptySpots.length; i++) {
              playerBoard.holdingArea[emptySpots[spotIndex]] = {
                type: type as TileType,
              };
              spotIndex++;
            }
          });
        }

        // Then, return all tiles from holding area back to their source
        const tiles = playerBoard.holdingArea.filter(
          (t): t is Tile => t !== null
        );
        if (
          draft.currentTileSource?.type === "factory" &&
          draft.currentTileSource.index !== undefined
        ) {
          draft.factories[draft.currentTileSource.index] = tiles;
        } else if (draft.currentTileSource?.type === "pot") {
          draft.pot.push(...tiles);
        }

        // Clear the holding area
        playerBoard.holdingArea = [];

        // Reset all turn state
        draft.hasPlacedTile = false;
        draft.selectedTile = null;
        draft.selectedColor = null;
        draft.placedTilesThisTurn = [];
        draft.currentTileSource = null;
      })
    );
  };

  const handleTestDistribution = () => {
    setGameState(
      produce((draft) => {
        // Collect all tiles from factories and pot
        const allTiles: Tile[] = [];
        draft.factories.forEach((factory) => {
          allTiles.push(...factory);
          factory.length = 0; // Clear factory
        });
        allTiles.push(...draft.pot);
        draft.pot = []; // Clear pot

        // For each player
        for (let playerIndex = 0; playerIndex < 2; playerIndex++) {
          const player = draft.players[playerIndex];

          // Group tiles by color
          const tilesByColor: Record<TileType, Tile[]> = {
            blue: [],
            red: [],
            black: [],
            yellow: [],
            white: [],
          };

          // Distribute tiles randomly between players
          const playerTiles = allTiles.splice(
            0,
            Math.floor(allTiles.length / (2 - playerIndex))
          );
          playerTiles.forEach((tile) => {
            tilesByColor[tile.type].push(tile);
          });

          // Place tiles in staircase rows
          Object.entries(tilesByColor).forEach(([color, tiles]) => {
            if (tiles.length === 0) return;

            // Find an empty row that can fit these tiles and doesn't have this color in the wall
            for (
              let rowIndex = 0;
              rowIndex < player.staircase.length;
              rowIndex++
            ) {
              const row = player.staircase[rowIndex];
              if (
                row.every((cell) => cell === null) &&
                tiles.length <= row.length &&
                isColorAllowedInRow(player.wall, rowIndex, color as TileType)
              ) {
                // Fill the row with tiles from right to left
                for (let i = 0; i < tiles.length; i++) {
                  row[row.length - 1 - i] = tiles[i] as any;
                }
                break;
              }
            }
          });
        }

        // Reset turn state
        draft.selectedTile = null;
        draft.selectedColor = null;
        draft.hasPlacedTile = false;
        draft.placedTilesThisTurn = [];
        draft.currentTileSource = null;
        draft.phase = GamePhase.ReadyToWallTile;
      })
    );
  };

  const isRoundComplete = () => {
    return (
      gameState.factories.every((factory) => factory.length === 0) &&
      gameState.pot.length === 0
    );
  };

  // Calculate the score when placing a single new tile on the wall
  const calculateTileScore = (
    wall: (Tile | null)[][],
    row: number,
    col: number
  ): number => {
    let score = 0;
    const tileType = wall[row][col]?.type;
    if (!tileType) return 0;

    let horizontalLength = 1; // Count the tile itself
    let verticalLength = 1; // Count the tile itself
    let hasHorizontalNeighbors = false;
    let hasVerticalNeighbors = false;

    // use two pointer method to expand left and right from the tile until we hit a null tile
    let left = col - 1;
    let right = col + 1;

    while (left >= 0 && wall[row][left]?.type) {
      horizontalLength++;
      left--;
    }

    while (right < wall[row].length && wall[row][right]?.type) {
      horizontalLength++;
      right++;
    }

    // use two pointer method to expand up and down from the tile until we hit a null tile
    let up = row - 1;
    let down = row + 1;

    while (up >= 0 && wall[up][col]?.type) {
      verticalLength++;
      up--;
    }

    while (down < wall.length && wall[down][col]?.type) {
      verticalLength++;
      down++;
    }

    if (horizontalLength > 1) {
      hasHorizontalNeighbors = true;
    }

    if (verticalLength > 1) {
      hasVerticalNeighbors = true;
    }

    if (!hasHorizontalNeighbors && !hasVerticalNeighbors) {
      score = 1; // 1 point for a single tile
    } else if (hasHorizontalNeighbors && hasVerticalNeighbors) {
      // 1 point per contiguous tile in each direction
      // (intentionally double-counts the tile itself)
      score = horizontalLength + verticalLength;
    } else if (hasHorizontalNeighbors) {
      // 1 point per contiguous tile in the horizontal direction
      score = horizontalLength;
    } else if (hasVerticalNeighbors) {
      // 1 point per contiguous tile in the vertical direction
      score = verticalLength;
    }

    return score;
  };

  const calculateFloorPenalty = (floor: (Tile | null)[]): number => {
    const penalties = [-1, -1, -2, -2, -2, -3, -3];
    return floor.reduce((total, tile, index) => {
      if (tile) {
        return total + penalties[index];
      }
      return total;
    }, 0);
  };

  const handleStartNextRound = () => {
    fillFactories();

    setGameState(
      produce((draft) => {
        // Move to playing phase and prepare for next round
        draft.phase = GamePhase.Playing;
        draft.hasFirstPlayerBeenMoved = false;
        // First player marker determines who goes first next round
        draft.currentPlayer = draft.firstPlayerMarkerIndex;
      })
    );
  };

  const handleWallTiling = () => {
    setGameState(
      produce((draft) => {
        // Process each player's staircase
        draft.players.forEach((player) => {
          const newTilePositions: { row: number; col: number }[] = [];

          // For each row in the staircase
          player.staircase.forEach((row, rowIndex) => {
            // Check if row is full
            if (row.every((cell) => cell !== null)) {
              // Find the color of tiles in this row (they're all the same)
              const firstTile = row[0];
              if (!firstTile) return;

              const tileType = firstTile.type;
              const wallPattern = WALL_PATTERN[rowIndex];
              if (!wallPattern) return;

              const wallColIndex = wallPattern.indexOf(tileType);
              if (wallColIndex === -1) return;

              // Move one tile to the wall
              const wallRow = player.wall[rowIndex];
              if (!wallRow) return;
              wallRow[wallColIndex] = { type: tileType };

              // Immediately calculate the score for that tile
              player.score += calculateTileScore(
                player.wall,
                rowIndex,
                wallColIndex
              );

              // Track the position of the newly placed tile
              newTilePositions.push({ row: rowIndex, col: wallColIndex });

              // Move remaining tiles to the discard pile
              const remainingTiles = row
                .filter((tile): tile is Tile => tile !== null)
                .slice(1);
              draft.discardPile.push(...remainingTiles);

              // Clear the staircase row
              player.staircase[rowIndex] = Array(row.length).fill(null);
            }
          });

          // Apply floor penalties
          const floorPenalty = calculateFloorPenalty(player.floor);
          player.score = Math.max(0, player.score + floorPenalty);

          // Clear floor and move tiles to discard pile
          const floorTiles = player.floor.filter(
            (tile): tile is Tile => tile !== null
          );
          draft.discardPile.push(...floorTiles);
          player.floor = Array(7).fill(null);
        });

        // Move to playing phase and prepare for next round
        draft.phase = GamePhase.DoneWallTiling;
        draft.hasFirstPlayerBeenMoved = false;
      })
    );
  };

  return (
    <div
      className="game"
      style={{
        padding: "20px 10px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        maxWidth: "100%",
        overflowX: "hidden",
        margin: "0 auto",
      }}
    >
      <h1>Azul</h1>

      {/* Save/Load Game Buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={saveGame}
          style={{
            padding: "8px 16px",
            backgroundColor: COLORS.BUTTON_BG,
            border: `1px solid ${COLORS.BORDER}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            color: "black",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.BUTTON_HOVER;
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.BUTTON_BG;
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Save Game
        </button>
        <button
          onClick={loadGame}
          style={{
            padding: "8px 16px",
            backgroundColor: COLORS.BUTTON_BG,
            border: `1px solid ${COLORS.BORDER}`,
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            color: "black",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.BUTTON_HOVER;
            e.currentTarget.style.transform = "scale(1.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.BUTTON_BG;
            e.currentTarget.style.transform = "scale(1)";
          }}
        >
          Load Game
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: "20px",
          marginBottom: "20px",
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        {/* Factories */}
        <div
          className="factories-container"
          style={{
            position: "relative",
            width: "400px",
            height: "400px",
            marginBottom: "30px",
          }}
        >
          {/* Central Pot */}
          <div
            className="pot"
            onClick={handlePotClick}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              border: `2px solid ${COLORS.BORDER}`,
              display: "flex",
              flexWrap: "wrap",
              padding: "5px",
              gap: "2px",
              backgroundColor: COLORS.POT_BG,
              cursor: gameState.pot.length > 0 ? "pointer" : "default",
              opacity: gameState.pot.length > 0 ? 1 : 0.5,
            }}
          >
            {gameState.pot.map((tile, index) => (
              <div
                key={index}
                style={{
                  width: "20px",
                  height: "20px",
                  backgroundColor: `var(--${tile.type})`,
                  border: `1px solid ${COLORS.BORDER}`,
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
                  border: `1px solid ${COLORS.BORDER}`,
                  borderRadius: "50%",
                  cursor: factory.length > 0 ? "pointer" : "default",
                  opacity: factory.length > 0 ? 1 : 0.5,
                  backgroundColor: COLORS.FACTORY_BG,
                  width: "82px", // 2 * 40px + 2px gap
                  height: "82px", // 2 * 40px + 2px gap
                }}
              >
                {/* Always render 4 grid spaces, filled or empty */}
                {Array(INITIAL_TILES_PER_FACTORY)
                  .fill(null)
                  .map((_, tileIndex) => (
                    <div
                      key={tileIndex}
                      style={{
                        width: "40px",
                        height: "40px",
                        backgroundColor: factory[tileIndex]
                          ? `var(--${factory[tileIndex].type})`
                          : COLORS.EMPTY_SPACE,
                        border: `1px solid ${COLORS.BORDER}`,
                      }}
                    />
                  ))}
              </div>
            );
          })}
        </div>

        {/* Game Controls */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            alignItems: "center",
          }}
        >
          <button
            onClick={handleTestDistribution}
            style={{
              padding: "8px 16px",
              backgroundColor: COLORS.BUTTON_PRIMARY,
              color: COLORS.BUTTON_TEXT,
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Test Distribution
          </button>
          {gameState.phase === GamePhase.ReadyToWallTile && (
            <button
              onClick={handleWallTiling}
              style={{
                padding: "8px 16px",
                backgroundColor: COLORS.BUTTON_SECONDARY,
                color: COLORS.BUTTON_TEXT,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Tile the Wall
            </button>
          )}
          {gameState.phase === GamePhase.DoneWallTiling && (
            <button
              onClick={handleStartNextRound}
              style={{
                padding: "8px 16px",
                backgroundColor: COLORS.BUTTON_SECONDARY,
                color: COLORS.BUTTON_TEXT,
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Start Next Round
            </button>
          )}
        </div>

        {/* Tile Bag Display */}
        <div
          className="tile-bag"
          style={{
            border: `2px solid ${COLORS.BORDER}`,
            borderRadius: "8px",
            padding: "15px",
            backgroundColor: COLORS.BUTTON_BG,
            width: "120px",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "10px",
              textAlign: "center",
              color: "black",
            }}
          >
            Tile Bag ({gameState.tileBag.length})
          </div>
          {["blue", "red", "black", "yellow", "white"].map((color) => {
            const count = gameState.tileBag.filter(
              (tile) => tile.type === color
            ).length;
            return (
              <div
                key={color}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: `var(--${color})`,
                    border: `1px solid ${COLORS.BORDER}`,
                  }}
                />
                <span style={{ fontSize: "14px", color: "black" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Discard Pile Display */}
        <div
          className="discard-pile"
          style={{
            border: `2px solid ${COLORS.BORDER}`,
            borderRadius: "8px",
            padding: "15px",
            backgroundColor: COLORS.BUTTON_BG,
            width: "120px",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              fontWeight: "bold",
              marginBottom: "10px",
              textAlign: "center",
              color: "black",
            }}
          >
            Discard Pile ({gameState.discardPile.length})
          </div>
          {["blue", "red", "black", "yellow", "white"].map((color) => {
            const count = gameState.discardPile.filter(
              (tile) => tile.type === color
            ).length;
            return (
              <div
                key={color}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "8px",
                }}
              >
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    backgroundColor: `var(--${color})`,
                    border: `1px solid ${COLORS.BORDER}`,
                  }}
                />
                <span style={{ fontSize: "14px", color: "black" }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>
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
          maxWidth: "100%",
          overflowX: "hidden",
          alignItems: "center",
          margin: "0 auto",
          boxSizing: "border-box",
          padding: "0 10px",
          flexDirection: "column",
        }}
      >
        {/* Sort player boards to show current player first */}
        {[...gameState.players]
          .map((board, index) => ({ board, index }))
          .sort((a, b) => {
            // Current player comes first
            if (a.index === gameState.currentPlayer) return -1;
            if (b.index === gameState.currentPlayer) return 1;
            return a.index - b.index;
          })
          .map(({ board, index }) => (
            <PlayerBoard
              key={index}
              board={board}
              playerIndex={index}
              isActive={index === gameState.currentPlayer}
              onStaircaseRowClick={(rowIndex) =>
                handleStaircaseRowClick(index, rowIndex)
              }
              onFloorClick={() => handleFloorClick(index)}
              onHoldingAreaTileClick={(tile) =>
                handleHoldingAreaTileClick(index, tile)
              }
              onResetPlacement={() => handleResetPlacement(index)}
              onResetTurn={() => handleResetTurn(index)}
              selectedTile={gameState.selectedTile}
              selectedColor={gameState.selectedColor}
              onEndTurn={handleEndTurn}
              canEndTurn={gameState.hasPlacedTile}
              hasFirstPlayerMarker={index === gameState.firstPlayerMarkerIndex}
            />
          ))}
      </div>
    </div>
  );
};

export default Game;
