import React, { useState } from "react";
import {
  PlayerBoard as PlayerBoardType,
  Tile,
  TileType,
  WALL_PATTERN,
} from "../types";
import { COLORS } from "../constants";
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
        border: `2px solid ${
          isActive ? COLORS.ACTIVE_BORDER : COLORS.INACTIVE_BORDER
        }`,
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
            backgroundColor: isTurnResetHovered
              ? COLORS.BUTTON_HOVER
              : COLORS.BUTTON_BG,
            border: `1px solid ${COLORS.BORDER}`,
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
            border: "2px solid #999",
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
                backgroundColor: tile
                  ? `var(--${tile.type})`
                  : COLORS.EMPTY_SPACE,
                border: tile
                  ? `2px solid ${COLORS.DARK_BORDER}`
                  : `2px dashed ${COLORS.BORDER}`,
                cursor: tile && isActive ? "pointer" : "default",
                outline:
                  tile && selectedColor && tile.type === selectedColor
                    ? `3px solid ${COLORS.ACTIVE_BORDER}`
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
                    ? COLORS.BUTTON_HOVER
                    : COLORS.BUTTON_BG,
                border: `1px solid ${COLORS.BORDER}`,
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
        <div style={{ position: "relative", width: "240px", height: "220px" }}>
          <div
            className="staircase"
            style={{
              position: "relative",
              backgroundColor: "white",
              width: "100%",
              height: "100%",
            }}
          >
            {board.staircase.map((row, rowIndex) => (
              <div
                key={rowIndex}
                onClick={() => isActive && onStaircaseRowClick(rowIndex)}
                style={{
                  position: "absolute",
                  display: "flex",
                  gap: "0",
                  right: "0",
                  top: `${rowIndex * (40 + 2)}px`,
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
                        border: row[cellIndex]?.type
                          ? `2px solid ${COLORS.DARK_BORDER}`
                          : `2px dashed ${COLORS.BORDER}`,
                        backgroundColor: row[cellIndex]?.type
                          ? `var(--${row[cellIndex]?.type})`
                          : COLORS.EMPTY_SPACE,
                        marginLeft: "-2px", // Compensate for border overlap
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
            row.map((cell, cellIndex) => {
              const patternColor = WALL_PATTERN[rowIndex][cellIndex];
              return (
                <div
                  key={`${rowIndex}-${cellIndex}`}
                  style={{
                    width: "40px",
                    height: "40px",
                    border: `1px solid ${COLORS.BORDER}`,
                    backgroundColor: cell
                      ? `var(--${cell.type})`
                      : COLORS.EMPTY_SPACE,
                    position: "relative",
                  }}
                >
                  {!cell && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: `var(--${patternColor})`,
                        opacity: 0.15,
                      }}
                    />
                  )}
                </div>
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
          border: `1px solid ${COLORS.BORDER}`,
          padding: "5px",
          justifyContent: "center",
          cursor: isActive ? "pointer" : "default",
          position: "relative",
          backgroundColor: COLORS.BUTTON_BG,
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
                border: tile?.type
                  ? `1px solid ${COLORS.BORDER}`
                  : `1px dashed ${COLORS.BORDER}`,
                backgroundColor: tile?.type
                  ? `var(--${tile.type})`
                  : COLORS.EMPTY_SPACE,
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
                    color: COLORS.TEXT,
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
          color: COLORS.TEXT,
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
              backgroundColor: COLORS.FIRST_PLAYER_BG,
              border: `1px solid ${COLORS.BORDER}`,
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
