import React from "react";
import { PlayerBoard as PlayerBoardType } from "../types";

interface PlayerBoardProps {
  board: PlayerBoardType;
  playerIndex: number;
}

const PlayerBoard: React.FC<PlayerBoardProps> = ({ board, playerIndex }) => {
  return (
    <div
      className="player-board"
      style={{ margin: "20px", padding: "20px", border: "2px solid #ccc" }}
    >
      <h2>
        Player {playerIndex + 1} - Score: {board.score}
      </h2>

      <div className="board-container" style={{ display: "flex", gap: "20px" }}>
        {/* Ready Zone */}
        <div
          className="ready-zone"
          style={{ display: "flex", flexDirection: "column" }}
        >
          {board.readyZone.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                display: "flex",
                marginLeft: `${rowIndex * 20}px`,
                height: "40px",
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
                        : "#eee",
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
          }}
        >
          {board.wall.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                style={{
                  width: "40px",
                  height: "40px",
                  border: "1px solid #999",
                  backgroundColor: cell ? `var(--${cell})` : "#eee",
                }}
              />
            ))
          )}
        </div>
      </div>

      {/* Floor */}
      <div
        className="floor"
        style={{
          display: "flex",
          gap: "2px",
          marginTop: "20px",
          border: "1px solid #999",
          padding: "5px",
        }}
      >
        {board.floor.map((tile, index) => (
          <div
            key={index}
            style={{
              width: "40px",
              height: "40px",
              border: "1px solid #999",
              backgroundColor: tile?.type ? `var(--${tile.type})` : "#eee",
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default PlayerBoard;
