import { Cell as CellType, ROWS } from '../lib/gameLogic';
import { Cell } from './Cell';
import { Player } from '../store/gameStore';

interface ColumnProps {
  col: number;
  cells: CellType[];
  isHovered: boolean;
  isActive: boolean;
  currentPlayer: Player;
  winningCells: [number, number][];
  lastMoveRow: number | null;
  onClick: (col: number) => void;
  onHoverEnter: (col: number) => void;
  onHoverLeave: (col: number) => void;
  ghostRow: number | null;
}

export function Column({
  col,
  cells,
  isHovered,
  isActive,
  currentPlayer,
  winningCells,
  lastMoveRow,
  onClick,
  onHoverEnter,
  onHoverLeave,
  ghostRow,
}: ColumnProps) {
  const winSet = new Set(winningCells.filter(([, c]) => c === col).map(([r]) => r));

  const indicatorColor = currentPlayer === 1
    ? 'rgba(239, 68, 68, 0.18)'
    : 'rgba(250, 204, 21, 0.18)';

  return (
    <div
      className={`column ${isActive ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={() => isActive && onClick(col)}
      onMouseEnter={() => isActive && onHoverEnter(col)}
      onMouseLeave={() => onHoverLeave(col)}
      onTouchStart={() => isActive && onHoverEnter(col)}
    >
      {/* Column hover indicator — pure CSS transition, no Framer Motion */}
      {isActive && (
        <div
          className="column-indicator"
          style={{
            backgroundColor: indicatorColor,
            opacity: isHovered ? 1 : 0,
            transition: 'opacity 0.08s ease',
          }}
        />
      )}

      {/* Cells */}
      {Array.from({ length: ROWS }, (_, row) => {
        const isWinning = winSet.has(row);
        const isNew = row === lastMoveRow && cells[row] !== null;
        const isGhostHere = isHovered && ghostRow === row && cells[row] === null;

        return (
          <Cell
            key={row}
            value={cells[row]}
            row={row}
            col={col}
            isWinning={isWinning}
            isGhost={isGhostHere && !cells[row]}
            isNew={isNew}
          />
        );
      })}
    </div>
  );
}
