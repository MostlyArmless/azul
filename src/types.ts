export type TileType = 'blue' | 'red' | 'black' | 'yellow' | 'white';

export interface Tile {
  type: TileType;
}

export interface PlayerBoard {
  wall: (TileType | null)[][];
  readyZone: (Tile | null)[][];
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
  placedTilesThisTurn: { type: TileType; location: 'readyZone' | 'floor'; rowIndex?: number; position: number }[];
} 