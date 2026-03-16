import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ThemeToggle } from './ThemeToggle';

interface GameControlsProps {
  onRematch?: () => void;
  onNewGame: () => void;
}

export function GameControls({ onRematch, onNewGame }: GameControlsProps) {
  const { status, mode, soundEnabled, toggleSound, myPlayer } = useGameStore();

  const canRematch = status !== 'playing' && status !== 'idle';
  const isOnline = mode === 'online';
  const showRematch = canRematch && onRematch && (!isOnline || myPlayer === 1);

  return (
    <motion.div
      className="game-controls"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onNewGame}
          className="btn btn-ghost text-sm"
          title="Main Menu"
        >
          ← Menu
        </button>

        {showRematch && (
          <motion.button
            onClick={onRematch}
            className="btn btn-outline text-sm"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            Rematch
          </motion.button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleSound}
          className="btn btn-ghost text-lg"
          title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
        <ThemeToggle />
      </div>
    </motion.div>
  );
}
