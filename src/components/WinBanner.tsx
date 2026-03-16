import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

interface WinBannerProps {
  onRematch: () => void;
  onNewGame: () => void;
}

export function WinBanner({ onRematch, onNewGame }: WinBannerProps) {
  const {
    status,
    winner,
    player1Name,
    player2Name,
    mode,
    myPlayer,
  } = useGameStore();

  const isVisible = status === 'won' || status === 'draw';

  const winnerName = winner === 1 ? player1Name : player2Name;
  const isDraw = status === 'draw';

  const isMyWin = mode === 'online' && winner === myPlayer;
  const isMyLoss = mode === 'online' && winner !== null && winner !== myPlayer;

  const getTitle = () => {
    if (isDraw) return "It's a Draw!";
    if (mode === 'online') {
      if (isMyWin) return 'You Win!';
      if (isMyLoss) return 'You Lose!';
    }
    if (mode === 'ai' && winner === 2) return 'AI Wins!';
    return `${winnerName} Wins!`;
  };

  const getEmoji = () => {
    if (isDraw) return '🤝';
    if (mode === 'online' && isMyWin) return '🎉';
    if (mode === 'online' && isMyLoss) return '😔';
    if (mode === 'ai' && winner === 2) return '🤖';
    return '🏆';
  };

  const canRematch = mode !== 'online' || myPlayer === 1;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="win-banner-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`win-banner ${isDraw ? 'win-banner-draw' : winner === 1 ? 'win-banner-p1' : 'win-banner-p2'}`}
            initial={{ scale: 0.5, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.5, y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <motion.div
              className="text-5xl sm:text-6xl mb-3"
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 400 }}
            >
              {getEmoji()}
            </motion.div>

            <motion.h2
              className="text-2xl sm:text-3xl font-black mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {getTitle()}
            </motion.h2>

            {!isDraw && mode !== 'online' && (
              <motion.p
                className="text-sm opacity-70 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.4 }}
              >
                {winner === 2 && mode === 'ai'
                  ? 'Better luck next time!'
                  : 'Congratulations!'}
              </motion.p>
            )}

            {mode === 'online' && !canRematch && (
              <motion.p
                className="text-sm opacity-70 mb-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.7 }}
                transition={{ delay: 0.4 }}
              >
                Waiting for Player 1 to start rematch...
              </motion.p>
            )}

            <motion.div
              className="flex gap-3 mt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {canRematch && (
                <button
                  onClick={onRematch}
                  className="btn btn-primary"
                >
                  Rematch
                </button>
              )}
              <button
                onClick={onNewGame}
                className="btn btn-secondary"
              >
                Main Menu
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
