import React, { useState } from "react";
import {
  PlayerBoard as PlayerBoardType,
  Tile,
  TileType,
  WALL_PATTERN,
} from "../types";
import resetIcon from "../assets/reset.svg";

interface PlayerBoardProps {
  board: PlayerBoardType;
  playerIndex: number;
  isActive: boolean;
  onStaircaseRowClick: (rowIndex: number) => void;
  onFloorClick: () => void;
  onHoldingAreaTileClick: (tile: Tile) => void;
  onResetPlacement: () => void;
  onResetTurn: () => void;
  selectedTile: Tile | null;
  selectedColor: TileType | null;
  onEndTurn: () => void;
  canEndTurn: boolean;
  hasFirstPlayerMarker?: boolean;
}

const PlayerBoard: React.FC<PlayerBoardProps> = ({
  board,
  playerIndex,
  isActive,
  onStaircaseRowClick,
  onFloorClick,
  onHoldingAreaTileClick,
  onResetPlacement,
  onResetTurn,
  selectedTile,
  selectedColor,
  onEndTurn,
  canEndTurn,
  hasFirstPlayerMarker = false,
}) => {
  const [isResetHovered, setIsResetHovered] = useState(false);
  const [isTurnResetHovered, setIsTurnResetHovered] = useState(false);

  return (
    <div
      className="player-board"
      style={{
        margin: "20px",
        padding: "20px",
        border: `2px solid ${isActive ? "#2ecc71" : "#ccc"}`,
        minWidth: "500px",
        opacity: isActive ? 1 : 0.7,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Turn Reset Button */}
      {isActive && board.holdingArea.length > 0 && (
        <button
          onClick={onResetTurn}
          onMouseEnter={() => setIsTurnResetHovered(true)}
          onMouseLeave={() => setIsTurnResetHovered(false)}
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            padding: "4px",
            cursor: "pointer",
            backgroundColor: isTurnResetHovered ? "#f0f0f0" : "white",
            border: "1px solid #999",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "24px",
            height: "24px",
            transition: "all 0.2s ease",
            boxShadow: isTurnResetHovered
              ? "0 2px 4px rgba(0,0,0,0.2)"
              : "0 1px 2px rgba(0,0,0,0.1)",
            transform: isTurnResetHovered ? "scale(1.1)" : "scale(1)",
            zIndex: 2,
          }}
        >
          <img
            src={resetIcon}
            alt="Reset turn"
            style={{
              width: "16px",
              height: "16px",
              transition: "transform 0.2s ease",
              transform: isTurnResetHovered ? "rotate(-180deg)" : "rotate(0)",
            }}
          />
        </button>
      )}

      <h2
        style={{
          textAlign: "center",
          marginBottom: "20px",
          fontSize: "1.5em",
          color: "#2c3e50",
        }}
      >
        Player {playerIndex + 1}
      </h2>

      {/* Holding Area */}
      {board.holdingArea.length > 0 && (
        <div
          className="holding-area"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "4px",
            padding: "10px",
            border: "2px dashed #999",
            borderRadius: "8px",
            position: "absolute",
            top: "20px",
            left: "20px",
            width: "120px",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            zIndex: 1,
          }}
        >
          {board.holdingArea.map((tile, index) => (
            <div
              key={index}
              onClick={() => tile && isActive && onHoldingAreaTileClick(tile)}
              style={{
                width: "40px",
                height: "40px",
                backgroundColor: tile ? `var(--${tile.type})` : "var(--empty)",
                border: "1px solid #999",
                cursor: tile && isActive ? "pointer" : "default",
                outline:
                  tile && selectedColor && tile.type === selectedColor
                    ? "3px solid #2ecc71"
                    : "none",
              }}
            />
          ))}

          {/* Reset Placement Button */}
          {isActive && (
            <button
              onClick={onResetPlacement}
              disabled={board.holdingArea.every((tile) => tile !== null)}
              onMouseEnter={() => setIsResetHovered(true)}
              onMouseLeave={() => setIsResetHovered(false)}
              style={{
                position: "absolute",
                top: "5px",
                right: "5px",
                padding: "4px",
                cursor: board.holdingArea.some((tile) => tile === null)
                  ? "pointer"
                  : "not-allowed",
                opacity: board.holdingArea.some((tile) => tile === null)
                  ? 1
                  : 0.3,
                backgroundColor:
                  isResetHovered &&
                  board.holdingArea.some((tile) => tile === null)
                    ? "#f0f0f0"
                    : "white",
                border: "1px solid #999",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                transition: "all 0.2s ease",
                boxShadow:
                  isResetHovered &&
                  board.holdingArea.some((tile) => tile === null)
                    ? "0 2px 4px rgba(0,0,0,0.2)"
                    : "0 1px 2px rgba(0,0,0,0.1)",
                transform:
                  isResetHovered &&
                  board.holdingArea.some((tile) => tile === null)
                    ? "scale(1.1)"
                    : "scale(1)",
                zIndex: 2,
              }}
            >
              <img
                src={resetIcon}
                alt="Reset placement"
                style={{
                  width: "16px",
                  height: "16px",
                  transition: "transform 0.2s ease",
                  transform:
                    isResetHovered &&
                    board.holdingArea.some((tile) => tile === null)
                      ? "rotate(-180deg)"
                      : "rotate(0)",
                  opacity: board.holdingArea.some((tile) => tile === null)
                    ? 1
                    : 0.3,
                }}
              />
            </button>
          )}
        </div>
      )}

      <div
        className="board-container"
        style={{ display: "flex", gap: "40px", justifyContent: "center" }}
      >
        {/* Staircase */}
        <div style={{ position: "relative" }}>
          <div
            className="staircase"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            {board.staircase.map((row, rowIndex) => (
              <div
                key={rowIndex}
                onClick={() => isActive && onStaircaseRowClick(rowIndex)}
                style={{
                  display: "flex",
                  marginLeft: `${(4 - rowIndex) * 40}px`,
                  height: "40px",
                  gap: "2px",
                  cursor: isActive ? "pointer" : "default",
                }}
              >
                {Array(rowIndex + 1)
                  .fill(null)
                  .map((_, cellIndex) => (
                    <div
                      key={cellIndex}
                      style={{
                        width: "40px",
                        height: "40px",
                        border: "1px solid #999",
                        backgroundColor: row[cellIndex]?.type
                          ? `var(--${row[cellIndex]?.type})`
                          : "var(--empty)",
                      }}
                    />
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* Wall */}
        <div
          className="wall"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 40px)",
            gap: "2px",
            alignSelf: "flex-start",
          }}
        >
          {board.wall.map((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const patternColor = WALL_PATTERN[rowIndex][colIndex];
              return (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "1px solid #999",
                    backgroundColor: cell
                      ? `var(--${cell.type})`
                      : `var(--${patternColor})`,
                    opacity: cell ? 1 : 0.15,
                  }}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Floor */}
      <div
        className="floor"
        onClick={() => isActive && onFloorClick()}
        style={{
          display: "flex",
          gap: "2px",
          marginTop: "20px",
          border: "1px solid #999",
          padding: "5px",
          justifyContent: "center",
          cursor: isActive ? "pointer" : "default",
          position: "relative",
        }}
      >
        {board.floor.map((tile, index) => {
          const penalties = [-1, -1, -2, -2, -2, -3, -3];
          return (
            <div
              key={index}
              style={{
                width: "40px",
                height: "40px",
                border: "1px solid #999",
                backgroundColor: tile?.type
                  ? `var(--${tile.type})`
                  : "var(--empty)",
                position: "relative",
              }}
            >
              {!tile && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    opacity: 0.5,
                    fontSize: "14px",
                    color: "#666",
                  }}
                >
                  {penalties[index]}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: "10px",
          fontSize: "1.2em",
          color: "#2c3e50",
        }}
      >
        Score: {board.score}
      </div>

      {/* Bottom row container for First Player Marker and End Turn button */}
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "20px",
          padding: "0 20px",
        }}
      >
        {/* First Player Marker */}
        {hasFirstPlayerMarker && (
          <div
            style={{
              width: "40px",
              height: "40px",
              backgroundColor: "#333",
              border: "1px solid #999",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: "bold",
              fontSize: "24px",
            }}
          >
            1
          </div>
        )}
        {/* Spacer div when no marker to maintain layout */}
        {!hasFirstPlayerMarker && <div style={{ width: "40px" }} />}

        {/* End Turn Button - only show for active player */}
        {isActive && (
          <button
            onClick={onEndTurn}
            disabled={!canEndTurn}
            style={{
              padding: "10px 20px",
              fontSize: "1.1em",
              cursor: canEndTurn ? "pointer" : "default",
              opacity: canEndTurn ? 1 : 0.5,
            }}
          >
            End Turn
          </button>
        )}
      </div>
    </div>
  );
};

export default PlayerBoard;
