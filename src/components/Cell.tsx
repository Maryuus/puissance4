import { motion, AnimatePresence } from 'framer-motion';
import { Cell as CellType } from '../lib/gameLogic';

interface CellProps {
  value: CellType;
  row: number;
  col: number;
  isWinning: boolean;
  isGhost: boolean;
  isNew: boolean;
}

export function Cell({ value, isWinning, isGhost, isNew }: CellProps) {
  const hasPiece = value !== null || isGhost;

  const getPieceColor = () => {
    if (isGhost) {
      return 'ghost-piece';
    }
    if (value === 1) return 'piece-p1';
    if (value === 2) return 'piece-p2';
    return '';
  };

  return (
    <div className="cell-container">
      {/* Cell hole */}
      <div className="cell-hole">
        <AnimatePresence mode="wait">
          {hasPiece && (
            <motion.div
              key={isGhost ? 'ghost' : `piece-${value}`}
              className={`piece ${getPieceColor()} ${isWinning ? 'piece-winning' : ''}`}
              initial={isNew && !isGhost ? { y: -300, opacity: 0 } : { opacity: isGhost ? 0 : 1 }}
              animate={{
                y: 0,
                opacity: isGhost ? 0.35 : 1,
                scale: isWinning ? [1, 1.15, 1] : 1,
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={
                isNew && !isGhost
                  ? {
                      y: { type: 'spring', stiffness: 300, damping: 20 },
                      opacity: { duration: 0.1 },
                    }
                  : isGhost
                  ? { duration: 0.15 }
                  : { duration: 0.2 }
              }
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
