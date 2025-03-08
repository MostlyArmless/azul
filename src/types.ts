export type TileType = 'blue' | 'red' | 'black' | 'yellow' | 'white';

export interface Tile {
  type: TileType;
}

export interface PlayerBoard {
  wall: (TileType | null)[][];
  readyZone: (Tile | null)[][];
  floor: (Tile | null)[];
  score: number;
  holdingArea: Tile[];
}

export interface GameState {
  players: PlayerBoard[];
  currentPlayer: number;
  tileBag: Tile[];
  factories: Tile[][];
  selectedTile: Tile | null;
} 