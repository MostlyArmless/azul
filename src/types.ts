export type TileType = "blue" | "red" | "black" | "yellow" | "white";

// Define the wall pattern - each position shows which color belongs there
export const WALL_PATTERN: TileType[][] = [
  ["blue", "yellow", "red", "black", "white"],
  ["white", "blue", "yellow", "red", "black"],
  ["black", "white", "blue", "yellow", "red"],
  ["red", "black", "white", "blue", "yellow"],
  ["yellow", "red", "black", "white", "blue"],
];

export type GamePhase = "playing" | "wall_tiling" | "scoring";

export interface Tile {
  type: TileType;
}

export interface PlayerBoard {
  wall: (Tile | null)[][];
  staircase: (Tile | null)[][];
  floor: (Tile | null)[];
  score: number;
  holdingArea: (Tile | null)[];
}

export interface TileSource {
  type: "factory" | "pot";
  index?: number;
}

export interface PlacedTile {
  type: TileType;
  location: "staircase" | "floor";
  rowIndex?: number;
  position: number;
}

export interface GameState {
  players: PlayerBoard[];
  currentPlayer: number;
  tileBag: Tile[];
  factories: Tile[][];
  pot: Tile[];
  discardPile: Tile[];
  selectedTile: Tile | null;
  hasPlacedTile: boolean;
  selectedColor: TileType | null;
  firstPlayerMarkerIndex: number;
  hasFirstPlayerBeenMoved: boolean;
  placedTilesThisTurn: PlacedTile[];
  currentTileSource: TileSource | null;
  phase: GamePhase;
} 