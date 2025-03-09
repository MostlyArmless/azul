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
        margin: "10px 0",
        padding: "10px",
        border: `2px solid ${
          isActive ? COLORS.ACTIVE_BORDER : COLORS.INACTIVE_BORDER
        }`,
        minWidth: "300px",
        maxWidth: "100%",
        width: "100%",
        opacity: isActive ? 1 : 0.7,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: COLORS.CARD_BG,
        boxSizing: "border-box",
        overflow: "hidden",
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
          marginBottom: "10px",
          fontSize: "1.5em",
          color: COLORS.TEXT,
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
            gap: "2px",
            padding: "5px",
            border: `2px solid ${COLORS.BORDER}`,
            borderRadius: "8px",
            position: "absolute",
            top: "5px",
            left: "5px",
            width: "100px",
            backgroundColor: COLORS.CARD_BG,
            zIndex: 10,
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
        style={{
          display: "flex",
          gap: "20px",
          justifyContent: "center",
          width: "100%",
          flexWrap: "nowrap",
          boxSizing: "border-box",
          marginBottom: "10px",
        }}
      >
        {/* Staircase */}
        <div
          style={{
            position: "relative",
            width: "202px",
            height: "202px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            alignItems: "flex-end",
          }}
        >
          {board.staircase.map((row, rowIndex) => (
            <div
              key={rowIndex}
              onClick={() => isActive && onStaircaseRowClick(rowIndex)}
              style={{
                display: "flex",
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
                      border: row[cellIndex]?.type
                        ? `2px solid ${COLORS.DARK_BORDER}`
                        : `2px dashed ${COLORS.BORDER}`,
                      backgroundColor: row[cellIndex]?.type
                        ? `var(--${row[cellIndex]?.type})`
                        : COLORS.EMPTY_SPACE,
                    }}
                  />
                ))}
            </div>
          ))}
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
                    border: row[cellIndex]?.type
                      ? `2px solid ${COLORS.DARK_BORDER}`
                      : `2px dashed ${COLORS.BORDER}`,
                    backgroundColor: cell
                      ? `var(--${cell.type})`
                      : `var(--${patternColor})`,
                    position: "relative",
                    opacity: cell ? 1 : 0.15,
                  }}
                ></div>
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
          marginTop: "5px",
          border: `1px solid ${COLORS.BORDER}`,
          padding: "5px",
          justifyContent: "center",
          cursor: isActive ? "pointer" : "default",
          position: "relative",
          backgroundColor: COLORS.BUTTON_BG,
          flexWrap: "wrap",
          maxWidth: "100%",
          boxSizing: "border-box",
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

      {/* Bottom row container for Score, First Player Marker and End Turn button */}
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "5px",
          padding: "0 10px",
        }}
      >
        {/* Left side: First Player Marker and Score */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* First Player Marker */}
          {hasFirstPlayerMarker && (
            <div
              style={{
                width: "30px",
                height: "30px",
                backgroundColor: COLORS.FIRST_PLAYER_BG,
                border: `1px solid ${COLORS.BORDER}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: "bold",
                fontSize: "18px",
              }}
            >
              1
            </div>
          )}

          {/* Score */}
          <div
            className="score-text"
            style={{
              fontSize: "1.2em",
              color: COLORS.TEXT,
            }}
          >
            Score: {board.score}
          </div>
        </div>

        {/* End Turn Button - only show for active player */}
        {isActive && (
          <button
            onClick={onEndTurn}
            disabled={!canEndTurn}
            style={{
              padding: "8px 16px",
              fontSize: "1em",
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
