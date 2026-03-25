import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { COLS, getLowestEmptyRow } from '../lib/gameLogic';
import { Column } from './Column';
import { useGame } from '../hooks/useGame';
import { resumeAudioContext } from '../lib/sounds';

interface LastMove {
  col: number;
  row: number;
}

interface BoardProps {
  onOnlineMove?: (col: number) => void;
}

export function Board({ onOnlineMove }: BoardProps) {
  const {
    board,
    currentPlayer,
    status,
    winningCells,
    mode,
    myPlayer,
    opponentConnected,
    isAIThinking,
    hoveredColumn,
    setHoveredColumn,
  } = useGameStore();

  const { handleColumnClick } = useGame();
  const [lastMove, setLastMove] = useState<LastMove | null>(null);

  const isMyTurn = mode === 'online'
    ? myPlayer === currentPlayer
    : true;

  const isActive = status === 'playing' && isMyTurn && !isAIThinking &&
    (mode !== 'online' || opponentConnected);

  const handleClick = useCallback((col: number) => {
    resumeAudioContext();
    if (!isActive) return;

    if (mode === 'online') {
      const row = getLowestEmptyRow(board, col);
      if (row !== null) {
        setLastMove({ col, row });
        onOnlineMove?.(col);
      }
    } else {
      const row = getLowestEmptyRow(board, col);
      if (row !== null) {
        setLastMove({ col, row });
        handleColumnClick(col);
      }
    }
  }, [isActive, mode, board, onOnlineMove, handleColumnClick]);

  // Fix hover flicker: only clear hover if the leaving column is still active
  const handleHoverEnter = useCallback((col: number) => {
    setHoveredColumn(col);
  }, [setHoveredColumn]);

  const handleHoverLeave = useCallback((col: number) => {
    // Only clear if this column is still the hovered one
    // This prevents the flicker when moving quickly between columns
    if (useGameStore.getState().hoveredColumn === col) {
      setHoveredColumn(null);
    }
  }, [setHoveredColumn]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      if (e.key === 'ArrowLeft') {
        setHoveredColumn(Math.max(0, (hoveredColumn ?? 3) - 1));
      } else if (e.key === 'ArrowRight') {
        setHoveredColumn(Math.min(COLS - 1, (hoveredColumn ?? 3) + 1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        if (hoveredColumn !== null) {
          e.preventDefault();
          handleClick(hoveredColumn);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, hoveredColumn, handleClick, setHoveredColumn]);

  return (
    <motion.div
      className="board-wrapper"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <div className="board">
        {Array.from({ length: COLS }, (_, col) => {
          const ghostRow = hoveredColumn === col && isActive
            ? getLowestEmptyRow(board, col)
            : null;

          return (
            <Column
              key={col}
              col={col}
              cells={board.map(row => row[col])}
              isHovered={hoveredColumn === col}
              isActive={isActive}
              currentPlayer={currentPlayer}
              winningCells={winningCells}
              lastMoveRow={lastMove?.col === col ? lastMove.row : null}
              onClick={handleClick}
              onHoverEnter={handleHoverEnter}
              onHoverLeave={handleHoverLeave}
              ghostRow={ghostRow}
            />
          );
        })}
      </div>

      {/* Keyboard hint */}
      <p className="text-center text-xs text-blue-400/60 mt-2 hidden sm:block">
        Arrow keys + Enter to play with keyboard
      </p>
    </motion.div>
  );
}
