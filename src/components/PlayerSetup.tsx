import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { getSavedName, saveName } from '../lib/playerName';

interface PlayerSetupProps {
  mode: 'local' | 'ai';
  onStart: (p1: string, p2: string) => void;
  onBack: () => void;
}

export function PlayerSetup({ mode, onStart, onBack }: PlayerSetupProps) {
  const { player1Name, player2Name } = useGameStore();
  const [p1, setP1] = useState(() => getSavedName() || player1Name);
  const [p2, setP2] = useState(mode === 'ai' ? 'AI' : player2Name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveName(p1.trim() || 'Player 1');
    onStart(p1.trim() || 'Player 1', mode === 'ai' ? 'AI' : (p2.trim() || 'Player 2'));
  };

  return (
    <motion.div
      className="setup-container"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <motion.h2
        className="setup-title"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {mode === 'local' ? 'Local Multiplayer' : 'vs AI'}
      </motion.h2>
      <motion.p
        className="setup-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        Enter player names to get started
      </motion.p>

      <form onSubmit={handleSubmit} className="setup-form">
        <motion.div
          className="input-group"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="input-label">
            <span className="piece-dot piece-dot-p1" />
            Player 1
          </label>
          <input
            type="text"
            className="game-input"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            placeholder="Player 1"
            maxLength={20}
            autoComplete="off"
            autoFocus
          />
        </motion.div>

        {mode === 'local' && (
          <motion.div
            className="input-group"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <label className="input-label">
              <span className="piece-dot piece-dot-p2" />
              Player 2
            </label>
            <input
              type="text"
              className="game-input"
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              placeholder="Player 2"
              maxLength={20}
              autoComplete="off"
            />
          </motion.div>
        )}

        {mode === 'ai' && (
          <motion.div
            className="ai-opponent-display"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <span className="piece-dot piece-dot-p2" />
            <span className="font-medium">AI Opponent</span>
            <span className="text-2xl ml-2">🤖</span>
          </motion.div>
        )}

        <motion.div
          className="flex gap-3 mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <button type="button" onClick={onBack} className="btn btn-ghost flex-1">
            ← Back
          </button>
          <button type="submit" className="btn btn-primary flex-2">
            {mode === 'ai' ? 'Choose Difficulty →' : 'Start Game →'}
          </button>
        </motion.div>
      </form>
    </motion.div>
  );
}
