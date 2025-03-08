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
      style={{
        margin: "20px",
        padding: "20px",
        border: "2px solid #ccc",
        minWidth: "500px",
      }}
    >
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

      <div
        className="board-container"
        style={{ display: "flex", gap: "40px", justifyContent: "center" }}
      >
        {/* Ready Zone staircase shape*/}
        <div
          className="ready-zone"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {board.readyZone.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                display: "flex",
                marginLeft: `${(4 - rowIndex) * 40}px`,
                height: "40px",
                gap: "2px",
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
            alignSelf: "flex-start",
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
          justifyContent: "center",
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
    </div>
  );
};

export default PlayerBoard;
