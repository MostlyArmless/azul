import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { io, Socket } from "socket.io-client";

const INITIAL_TILES_PER_FACTORY = 4;
const NUM_FACTORIES = 5;

// Hook to get window dimensions
const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // Handler to call on window resize
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add event listener
    window.addEventListener("resize", handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount and unmount

  return windowSize;
};

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

  const windowSize = useWindowSize();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string>("");
  const [playerIndex, setPlayerIndex] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isHost, setIsHost] = useState(false);

  // Add a new state for debug mode
  const [showDebug, setShowDebug] = useState(false);

  // Add a new state for ping results
  const [pingResult, setPingResult] = useState<string | null>(null);

  // Add a throttling mechanism for game state updates
  const lastSyncTime = useRef<number>(0);
  const pendingSync = useRef<boolean>(false);
  const syncInterval = 500; // Minimum time between syncs in milliseconds

  // Add a state to track if we're currently making a local change
  const [isLocalChange, setIsLocalChange] = useState(false);
  // Add a state to track the last action timestamp
  const lastActionTime = useRef<number>(0);
  // Add a state to track the last received server state timestamp
  const lastServerUpdateTime = useRef<number>(0);

  // Add a state to track the last action ID
  const [lastActionId, setLastActionId] = useState<string | null>(null);
  // Add a state to track processed action IDs
  const processedActionIds = useRef<Set<string>>(new Set());
  // Add a state to track if we're currently applying a server update
  const [isApplyingServerUpdate, setIsApplyingServerUpdate] = useState(false);

  // Completely disable automatic syncing - we'll only sync after specific actions
  const throttledSyncGameState = useCallback(() => {
    // Don't sync automatically - we'll sync explicitly after actions
    // This prevents the constant sync loop we're seeing
  }, []);

  // Force sync function (for manual sync)
  const forceSyncGameState = useCallback(() => {
    if (
      socket &&
      roomId &&
      gameState &&
      !isLocalChange &&
      !isApplyingServerUpdate
    ) {
      // Generate a unique action ID for this update
      const actionId = `${socket.id}-${Date.now()}`;
      console.log(`Forcing game state sync (actionId: ${actionId})`);

      // Add this action ID to our processed set
      processedActionIds.current.add(actionId);

      // Store the action ID
      setLastActionId(actionId);

      // Send the update to the server
      socket.emit("updateGameState", roomId, {
        ...gameState,
        timestamp: Date.now(),
        actionId: actionId,
      });
    }
  }, [socket, roomId, gameState, isLocalChange, isApplyingServerUpdate]);

  // Sync game state with server whenever it changes, but throttled
  useEffect(() => {
    if (socket && roomId && gameState) {
      throttledSyncGameState();
    }
  }, [socket, roomId, gameState, throttledSyncGameState]);

  // Function to create or join a room
  const joinRoom = useCallback(
    (roomIdToJoin: string) => {
      if (!socket || !roomIdToJoin || roomIdToJoin.length < 4) {
        console.log("Invalid room ID or socket not connected");
        return;
      }

      // Store the room ID in localStorage to persist across refreshes
      localStorage.setItem("azulRoomId", roomIdToJoin);

      console.log("Attempting to join room:", roomIdToJoin);
      socket.emit("joinRoom", roomIdToJoin);
    },
    [socket]
  );

  // Initialize socket connection
  useEffect(() => {
    // Prevent creating multiple socket connections
    if (socket) {
      console.log("Socket already exists, not creating a new one");
      return;
    }

    // Determine the Socket.IO server URL based on the current environment
    const socketUrl =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
        ? `http://${window.location.hostname}:5173` // Use Vite's dev server port with proxy
        : window.location.origin; // Production: use the same origin

    console.log("Connecting to Socket.IO server at:", socketUrl);

    // Connect to the server with reconnection options
    const newSocket = io(socketUrl, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ["websocket", "polling"], // Try WebSocket first, then fall back to polling
    });

    newSocket.on("connect", () => {
      console.log("Connected to server with ID:", newSocket.id);
      setSocket(newSocket);
      setIsConnected(true);

      // Check if we have a stored room ID
      const storedRoomId = localStorage.getItem("azulRoomId");

      // If we have a stored room ID or were in a room before, try to join it
      if (storedRoomId) {
        console.log(`Attempting to join stored room ${storedRoomId}`);
        setRoomId(storedRoomId);
        newSocket.emit("joinRoom", storedRoomId);
      }
    });

    newSocket.on("reconnect", (attemptNumber) => {
      console.log(`Reconnected to server after ${attemptNumber} attempts`);

      // If we were in a room before, try to rejoin it
      if (roomId && playerIndex !== null) {
        console.log(`Attempting to rejoin room ${roomId} after reconnection`);
        newSocket.emit("joinRoom", roomId);
      }
    });

    newSocket.on("reconnect_attempt", (attemptNumber) => {
      console.log(`Reconnection attempt ${attemptNumber}`);
    });

    newSocket.on("reconnect_error", (error) => {
      console.error("Reconnection error:", error);
    });

    newSocket.on("reconnect_failed", () => {
      console.error("Failed to reconnect after all attempts");
      alert(
        "Failed to reconnect to the game server. Please refresh the page to try again."
      );
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setIsConnected(false);
      // Reset player state on disconnect
      setPlayerIndex(null);
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setIsConnected(false);
      alert(
        "Failed to connect to the game server. Please check your connection and try again."
      );
    });

    newSocket.on("error", (error) => {
      console.error("Server error:", error);
      alert(`Error: ${error.message || "Unknown error"}`);
    });

    newSocket.on("playerAssigned", (index: number) => {
      console.log("Assigned player index:", index);
      setPlayerIndex(index);
      setIsHost(index === 0);

      // If we have a room ID, store it
      if (roomId) {
        localStorage.setItem("azulRoomId", roomId);
      }
    });

    newSocket.on("roomFull", () => {
      console.log("Room is full");
      alert("This room is already full. Please try another room.");
      setRoomId("");
      setPlayerIndex(null);
    });

    newSocket.on("gameStart", () => {
      console.log("Game started");
      // Request the latest game state from the server
      newSocket.emit("requestGameState", roomId);
    });

    // Add a handler for game state requests
    newSocket.on("requestGameState", (requestingSocketId: string) => {
      console.log(`Received game state request from ${requestingSocketId}`);
      if (socket && roomId && gameState && isHost) {
        console.log("Sending current game state to requesting client");
        socket.emit("provideGameState", roomId, gameState, requestingSocketId);
      }
    });

    // Add a handler for provided game states
    newSocket.on("provideGameState", (providedGameState: GameState) => {
      console.log("Received provided game state from host");
      setGameState(providedGameState);
    });

    newSocket.on("syncGameState", (newGameState: GameState) => {
      try {
        // If this is a priority update (like end turn), always process it
        const isPriorityUpdate = newGameState.isPriorityUpdate === true;

        // If we're in the middle of applying a server update, don't process another one
        // unless it's a priority update
        if (isApplyingServerUpdate && !isPriorityUpdate) {
          console.log("Already applying a server update, ignoring new update");
          return;
        }

        // If this update has an action ID and we've already processed it, ignore it
        // unless it's a priority update
        if (
          newGameState.actionId &&
          processedActionIds.current.has(newGameState.actionId) &&
          !isPriorityUpdate
        ) {
          console.log(
            `Already processed update with actionId: ${newGameState.actionId}, ignoring`
          );
          return;
        }

        // If this update was initiated by us (matches our last action ID), don't apply it
        // unless it's a priority update
        if (
          newGameState.actionId &&
          newGameState.actionId === lastActionId &&
          !isPriorityUpdate
        ) {
          console.log(
            `Ignoring our own update (actionId: ${newGameState.actionId})`
          );
          return;
        }

        // If we're in the middle of a local change, don't apply server updates
        // unless it's a priority update
        if (isLocalChange && !isPriorityUpdate) {
          console.log("Ignoring server update during local change");
          return;
        }

        // Only update if the game state is meaningfully different
        // This prevents flickering caused by constant small updates

        // Check if the important parts of the game state have changed
        const currentImportantState = {
          currentPlayer: gameState.currentPlayer,
          phase: gameState.phase,
          factories: gameState.factories,
          pot: gameState.pot,
          players: gameState.players.map((p) => ({
            wall: p.wall,
            staircase: p.staircase,
            floor: p.floor,
            score: p.score,
            holdingArea: p.holdingArea,
          })),
        };

        const newImportantState = {
          currentPlayer: newGameState.currentPlayer,
          phase: newGameState.phase,
          factories: newGameState.factories,
          pot: newGameState.pot,
          players: newGameState.players.map((p) => ({
            wall: p.wall,
            staircase: p.staircase,
            floor: p.floor,
            score: p.score,
            holdingArea: p.holdingArea,
          })),
        };

        // Only update if important parts have changed or it's a priority update
        if (
          JSON.stringify(currentImportantState) !==
            JSON.stringify(newImportantState) ||
          isPriorityUpdate
        ) {
          if (isPriorityUpdate) {
            console.log("Applying priority update (e.g., turn change)");
          } else {
            console.log("Applying server update - meaningful change detected");
          }

          // Set flag to indicate we're applying a server update
          setIsApplyingServerUpdate(true);

          // Apply the update
          setGameState(newGameState);

          // If this update has an action ID, add it to our processed set
          if (newGameState.actionId) {
            processedActionIds.current.add(newGameState.actionId);
          }

          // Reset the flag after a short delay
          setTimeout(() => {
            setIsApplyingServerUpdate(false);
          }, 100);
        } else {
          console.log("Server update contains no meaningful changes, ignoring");
        }
      } catch (error) {
        console.error("Error handling game state update:", error);
        setIsApplyingServerUpdate(false); // Reset the flag in case of error
      }
    });

    newSocket.on("playerDisconnected", (index: number) => {
      console.log(`Player ${index + 1} disconnected`);
      alert(`Player ${index + 1} has disconnected!`);
    });

    // Add a specific handler for successful room joining
    newSocket.on(
      "roomJoined",
      (roomData: { roomId: string; playerIndex: number }) => {
        console.log(
          `Successfully joined room ${roomData.roomId} as player ${roomData.playerIndex}`
        );
        setRoomId(roomData.roomId);
        setPlayerIndex(roomData.playerIndex);
        setIsHost(roomData.playerIndex === 0);

        // Store the room ID in localStorage
        localStorage.setItem("azulRoomId", roomData.roomId);
      }
    );

    return () => {
      console.log("Cleaning up socket connection");
      newSocket.disconnect();
      setSocket(null);
    };
  }, []); // Empty dependency array to create socket only once

  // Room creation UI
  const renderRoomUI = () => {
    if (!isConnected) {
      return <div className="text-center p-4">Connecting to server...</div>;
    }

    if (!roomId || playerIndex === null) {
      return (
        <div className="flex flex-col items-center justify-center p-4 gap-4">
          <h2 className="text-xl font-bold">Play Azul Online</h2>
          <div className="flex flex-col gap-2 w-full max-w-md">
            <input
              type="text"
              placeholder="Enter Room ID"
              className="p-2 border rounded"
              onChange={(e) => setRoomId(e.target.value)}
              value={roomId}
            />
            <button
              className="bg-blue-500 text-white p-2 rounded"
              onClick={() => {
                if (roomId.length >= 4) {
                  joinRoom(roomId);
                } else {
                  alert("Room ID must be at least 4 characters");
                }
              }}
            >
              Join Room
            </button>
            <button
              className="bg-green-500 text-white p-2 rounded"
              onClick={() => {
                const newRoomId = Math.random().toString(36).substring(2, 8);
                setRoomId(newRoomId);
                joinRoom(newRoomId);
              }}
            >
              Create New Room
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="text-center p-2 bg-gray-100 rounded mb-4">
        <p>
          Room: {roomId} | You are Player {playerIndex + 1}
        </p>
        <p className="text-sm">Share this room code with your opponent</p>
        {gameState.players.length === 2 ? (
          <div>
            <p className="text-xs mt-2 text-green-600">
              Both players connected!{" "}
              {playerIndex === gameState.currentPlayer
                ? "It's your turn"
                : "Waiting for opponent's move"}
            </p>
            <button
              onClick={requestLatestGameState}
              className="text-xs mt-2 bg-blue-500 text-white px-2 py-1 rounded"
            >
              Sync Game State
            </button>
          </div>
        ) : (
          <p className="text-xs mt-2">Waiting for Player 2 to join...</p>
        )}
      </div>
    );
  };

  // Function to count all tiles in the game
  const countAllTiles = (gameState: GameState): number => {
    let totalTiles = 0;

    // Count tiles in the bag
    totalTiles += gameState.tileBag.length;

    // Count tiles in the discard pile
    totalTiles += gameState.discardPile.length;

    // Count tiles in factories
    gameState.factories.forEach((factory) => {
      totalTiles += factory.length;
    });

    // Count tiles in the pot
    totalTiles += gameState.pot.length;

    // Count tiles in each player's board
    gameState.players.forEach((player) => {
      // Count tiles in staircase
      player.staircase.forEach((row) => {
        row.forEach((tile) => {
          if (tile) totalTiles++;
        });
      });

      // Count tiles in wall
      player.wall.forEach((row) => {
        row.forEach((tile) => {
          if (tile) totalTiles++;
        });
      });

      // Count tiles in floor
      player.floor.forEach((tile) => {
        if (tile) totalTiles++;
      });

      // Count tiles in holding area
      player.holdingArea.forEach((tile) => {
        if (tile) totalTiles++;
      });
    });

    // Count selected tile if there is one
    if (gameState.selectedTile) totalTiles++;

    return totalTiles;
  };

  useEffect(() => {
    // Fill factories at the start of the game
    if (
      gameState.factories.every((factory) => factory.length === 0) &&
      gameState.pot.length === 0
    ) {
      fillFactories();
    }
  }, []); // Only run once on mount

  // Modify the saveGame function to also sync with the server
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

    // If connected to a room, sync with server
    if (socket && roomId && isHost) {
      socket.emit("updateGameState", roomId, savedState);
    }

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
        // Step 1: Collect all tiles from factories and pot
        const allTiles: Tile[] = [];

        // Collect from factories
        draft.factories.forEach((factory) => {
          allTiles.push(...factory);
          factory.length = 0; // Clear factory
        });

        // Collect from pot
        allTiles.push(...draft.pot);
        draft.pot = []; // Clear pot

        // Track the initial count for verification
        const initialTileCount = allTiles.length;
        console.log(`Initial tile count: ${initialTileCount}`);

        // Step 2: Split tiles into roughly even piles for each player
        const playerPiles: Tile[][] = [];
        const playerCount = draft.players.length;

        // Create empty piles for each player
        for (let i = 0; i < playerCount; i++) {
          playerPiles.push([]);
        }

        // Distribute tiles evenly among players
        while (allTiles.length > 0) {
          for (let i = 0; i < playerCount && allTiles.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * allTiles.length);
            const tile = allTiles.splice(randomIndex, 1)[0];
            playerPiles[i].push(tile);
          }
        }

        // Step 3: Distribute tiles to each player's staircase and floor
        for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
          const player = draft.players[playerIndex];
          const playerTiles = playerPiles[playerIndex];

          // Group tiles by color
          const tilesByColor: Record<TileType, Tile[]> = {
            blue: [],
            red: [],
            black: [],
            yellow: [],
            white: [],
          };

          playerTiles.forEach((tile) => {
            tilesByColor[tile.type].push(tile);
          });

          // Track tiles that have been placed
          let placedTiles: Tile[] = [];

          // First, try to place tiles in staircase rows
          for (const color of Object.keys(tilesByColor) as TileType[]) {
            const tiles = tilesByColor[color];
            if (tiles.length === 0) continue;

            // Try to find a row that already has this color
            let foundExistingRow = false;
            for (
              let rowIndex = 0;
              rowIndex < player.staircase.length;
              rowIndex++
            ) {
              const row = player.staircase[rowIndex];

              // Check if row already has tiles of this color
              const existingTiles = row.filter((t): t is Tile => t !== null);
              if (existingTiles.length > 0 && existingTiles[0].type === color) {
                // Row has tiles of this color, add more if there's space
                const emptySpaces = row.length - existingTiles.length;
                const tilesToAdd = Math.min(emptySpaces, tiles.length);

                if (
                  tilesToAdd > 0 &&
                  isColorAllowedInRow(player.wall, rowIndex, color)
                ) {
                  // Add tiles to this row
                  for (let i = 0; i < tilesToAdd; i++) {
                    const tile = tiles.shift()!;
                    placedTiles.push(tile);

                    // Find the first empty spot from the right
                    for (let j = row.length - 1; j >= 0; j--) {
                      if (row[j] === null) {
                        (row[j] as any) = tile;
                        break;
                      }
                    }
                  }
                  foundExistingRow = true;
                  break;
                }
              }
            }

            // If we didn't find an existing row with this color, try to find an empty row
            if (!foundExistingRow && tiles.length > 0) {
              for (
                let rowIndex = 0;
                rowIndex < player.staircase.length;
                rowIndex++
              ) {
                const row = player.staircase[rowIndex];

                // Check if row is empty and color is allowed in this row
                if (
                  row.every((t) => t === null) &&
                  isColorAllowedInRow(player.wall, rowIndex, color)
                ) {
                  // Row is empty, add tiles
                  const tilesToAdd = Math.min(row.length, tiles.length);

                  // Add tiles to this row from right to left
                  for (let i = 0; i < tilesToAdd; i++) {
                    const tile = tiles.shift()!;
                    placedTiles.push(tile);
                    (row[row.length - 1 - i] as any) = tile;
                  }
                  break;
                }
              }
            }
          }

          // Collect any remaining tiles from all colors
          const remainingTiles: Tile[] = [];
          Object.values(tilesByColor).forEach((colorTiles) => {
            remainingTiles.push(...colorTiles);
          });

          // Place remaining tiles in floor from left to right
          for (
            let i = 0;
            i < remainingTiles.length && i < player.floor.length;
            i++
          ) {
            const tile = remainingTiles[i];
            placedTiles.push(tile);
            (player.floor[i] as any) = tile;
          }

          // Verify that all tiles for this player have been placed
          console.log(
            `Player ${playerIndex}: ${placedTiles.length}/${playerPiles[playerIndex].length} tiles placed`
          );
          if (placedTiles.length !== playerPiles[playerIndex].length) {
            console.error(
              `Tile loss detected for player ${playerIndex}! ${placedTiles.length} placed vs ${playerPiles[playerIndex].length} allocated`
            );
          }
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

  // Add a ping function
  const pingServer = useCallback(() => {
    if (!socket) {
      setPingResult("Socket not connected");
      return;
    }

    const startTime = Date.now();
    socket.emit("ping", (response: any) => {
      const latency = Date.now() - startTime;
      setPingResult(
        `Latency: ${latency}ms | Server time: ${response.time} | Socket ID: ${
          response.socketId
        } | Rooms: ${response.rooms.join(", ")}`
      );
    });
  }, [socket]);

  // Update the debug UI component
  const renderDebugInfo = () => {
    if (!showDebug) return null;

    return (
      <div className="debug-info text-xs bg-gray-800 text-white p-2 rounded mt-2 mb-2">
        <h3 className="font-bold">Debug Info</h3>
        <div>
          <p>Connection: {isConnected ? "✅ Connected" : "❌ Disconnected"}</p>
          <p>Socket ID: {socket?.id || "Not connected"}</p>
          <p>Room ID: {roomId || "None"}</p>
          <p>
            Player Index: {playerIndex !== null ? playerIndex : "Not assigned"}
          </p>
          <p>Host: {isHost ? "Yes" : "No"}</p>
          <p>Game Phase: {gameState.phase}</p>
          <p>Current Player: {gameState.currentPlayer}</p>
          <p>Players in game: {gameState.players.length}</p>

          <div className="mt-2 flex gap-2">
            <button
              onClick={pingServer}
              className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
            >
              Ping Server
            </button>
            <button
              onClick={forceSyncGameState}
              className="bg-green-500 text-white px-2 py-1 rounded text-xs"
            >
              Force Sync
            </button>
          </div>
          {pingResult && (
            <p className="mt-1 text-green-300 break-words">{pingResult}</p>
          )}
        </div>
      </div>
    );
  };

  // Modify the wrapActionHandler to handle turn changes specially
  const wrapActionHandler = (handler: Function, isEndTurn = false) => {
    return (...args: any[]) => {
      try {
        // Set the local change flag to prevent incoming updates from overriding our change
        setIsLocalChange(true);

        // Call the original handler
        handler(...args);

        // Reset the flag after a longer delay to ensure the state update completes
        // and has time to synchronize with the server
        setTimeout(() => {
          // Force a sync after the local change is complete
          if (socket && roomId && gameState) {
            const actionId = `${socket.id}-${Date.now()}`;

            // Log differently for end turn actions
            if (isEndTurn) {
              console.log(`Syncing end turn action (actionId: ${actionId})`);
            } else {
              console.log(`Syncing after local change (actionId: ${actionId})`);
            }

            // Add this action ID to our processed set
            processedActionIds.current.add(actionId);

            // Store the action ID
            setLastActionId(actionId);

            // Send the update to the server with priority flag for end turn
            socket.emit("updateGameState", roomId, {
              ...gameState,
              timestamp: Date.now(),
              actionId: actionId,
              isPriorityUpdate: isEndTurn, // Mark end turn as priority update
            });
          }

          // Reset the local change flag
          setIsLocalChange(false);
        }, 500); // Longer delay to ensure state updates complete
      } catch (error) {
        console.error("Error in action handler:", error);
        setIsLocalChange(false); // Make sure we reset the flag even if there's an error

        // Don't show alerts for every error as they can be disruptive
        console.error("Game action error:", error);
      }
    };
  };

  // Wrap the handlers that modify game state
  const wrappedHandleFactoryClick = wrapActionHandler(handleFactoryClick);
  const wrappedHandleStaircaseRowClick = wrapActionHandler(
    handleStaircaseRowClick
  );
  const wrappedHandleFloorClick = wrapActionHandler(handleFloorClick);
  const wrappedHandlePotClick = wrapActionHandler(handlePotClick);
  const wrappedHandleHoldingAreaTileClick = wrapActionHandler(
    handleHoldingAreaTileClick
  );
  const wrappedHandleEndTurn = wrapActionHandler(handleEndTurn, true); // Mark as end turn action
  const wrappedHandleResetPlacement = wrapActionHandler(handleResetPlacement);
  const wrappedHandleResetTurn = wrapActionHandler(handleResetTurn);

  // Add a function to request the latest game state
  const requestLatestGameState = useCallback(() => {
    if (socket && roomId) {
      console.log("Requesting latest game state from server");
      socket.emit("requestGameState", roomId);
    }
  }, [socket, roomId]);

  return (
    <div className="game-container">
      {renderRoomUI()}

      {/* Debug toggle button */}
      <button
        onClick={() => setShowDebug(!showDebug)}
        className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded absolute top-2 right-2"
      >
        {showDebug ? "Hide Debug" : "Show Debug"}
      </button>

      {/* Debug info */}
      {renderDebugInfo()}

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
        <h1>
          Azul{" "}
          <span
            style={{
              fontSize: "0.7em",
              color: countAllTiles(gameState) === 100 ? "#666" : "#f00",
              fontWeight: countAllTiles(gameState) === 100 ? "normal" : "bold",
            }}
          >
            (Tiles: {countAllTiles(gameState)}/100)
          </span>
        </h1>

        {/* Current player indicator */}
        {playerIndex !== null && (
          <div className="current-player-indicator mb-4">
            <div
              className={`text-center p-2 rounded ${
                playerIndex === gameState.currentPlayer
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {playerIndex === gameState.currentPlayer
                ? "🎮 It's your turn!"
                : `⏳ Waiting for Player ${
                    gameState.currentPlayer + 1
                  }'s move...`}
            </div>
          </div>
        )}

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
              onClick={wrappedHandlePotClick}
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
                  onClick={() => wrappedHandleFactoryClick(index)}
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
            {gameState.phase !== GamePhase.DoneWallTiling && (
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
            )}
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
            flexWrap: "wrap",
            justifyContent: "center",
            width: "100%",
            maxWidth: "100%",
            overflowX: "hidden",
            alignItems: "center",
            margin: "0 auto",
            boxSizing: "border-box",
            padding: "0 10px",
            // Use row direction on desktop (screens wider than 1024px)
            // and column direction on mobile
            flexDirection: windowSize.width > 1024 ? "row" : "column",
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
                  wrappedHandleStaircaseRowClick(index, rowIndex)
                }
                onFloorClick={() => wrappedHandleFloorClick(index)}
                onHoldingAreaTileClick={(tile) =>
                  wrappedHandleHoldingAreaTileClick(index, tile)
                }
                onResetPlacement={() => wrappedHandleResetPlacement(index)}
                onResetTurn={() => wrappedHandleResetTurn(index)}
                selectedTile={gameState.selectedTile}
                selectedColor={gameState.selectedColor}
                onEndTurn={wrappedHandleEndTurn}
                canEndTurn={gameState.hasPlacedTile}
                hasFirstPlayerMarker={
                  index === gameState.firstPlayerMarkerIndex
                }
                style={{
                  width: windowSize.width > 1024 ? "calc(50% - 20px)" : "100%",
                  maxWidth: windowSize.width > 1024 ? "600px" : "100%",
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
};

export default Game;
