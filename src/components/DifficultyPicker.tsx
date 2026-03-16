import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { Difficulty } from '../lib/minimax';

interface DifficultyOption {
  value: Difficulty;
  label: string;
  description: string;
  emoji: string;
  color: string;
}

const difficulties: DifficultyOption[] = [
  {
    value: 'easy',
    label: 'Easy',
    description: 'Random moves, great for beginners',
    emoji: '😊',
    color: 'difficulty-easy',
  },
  {
    value: 'medium',
    label: 'Medium',
    description: 'Minimax depth 4, a fair challenge',
    emoji: '🤔',
    color: 'difficulty-medium',
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Alpha-beta depth 7, very strong AI',
    emoji: '🤖',
    color: 'difficulty-hard',
  },
];

interface DifficultyPickerProps {
  onSelect: (difficulty: Difficulty) => void;
  onBack: () => void;
}

export function DifficultyPicker({ onSelect, onBack }: DifficultyPickerProps) {
  const { aiDifficulty, setAIDifficulty } = useGameStore();

  const handleSelect = (difficulty: Difficulty) => {
    setAIDifficulty(difficulty);
    onSelect(difficulty);
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
        Choose Difficulty
      </motion.h2>
      <motion.p
        className="setup-subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        How hard do you want the AI to be?
      </motion.p>

      <div className="difficulty-options">
        {difficulties.map((option, index) => (
          <motion.button
            key={option.value}
            className={`difficulty-card ${option.color} ${aiDifficulty === option.value ? 'selected' : ''}`}
            onClick={() => handleSelect(option.value)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.1, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.03, translateY: -2 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="text-3xl mb-2">{option.emoji}</span>
            <span className="font-bold text-lg">{option.label}</span>
            <span className="text-xs opacity-70 text-center">{option.description}</span>
            {aiDifficulty === option.value && (
              <motion.div
                className="selected-indicator"
                layoutId="difficulty-selected"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
          </motion.button>
        ))}
      </div>

      <motion.button
        className="btn btn-ghost mt-4"
        onClick={onBack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        whileTap={{ scale: 0.97 }}
      >
        ← Back
      </motion.button>
    </motion.div>
  );
}
