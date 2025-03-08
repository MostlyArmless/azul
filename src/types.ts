export type TileType = 'blue' | 'red' | 'black' | 'yellow' | 'white';

export type TileSource = {
  type: 'factory';
  index: number;
} | {
  type: 'pot';
};

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

export interface GameState {
  players: PlayerBoard[];
  currentPlayer: number;
  tileBag: Tile[];
  factories: Tile[][];
  pot: Tile[];
  selectedTile: Tile | null;
  hasPlacedTile: boolean;
  selectedColor: TileType | null;
  firstPlayerMarkerIndex: number;
  hasFirstPlayerBeenMoved: boolean;
  placedTilesThisTurn: { type: TileType; location: 'staircase' | 'floor'; rowIndex?: number; position: number }[];
  currentTileSource: TileSource | null;
} 