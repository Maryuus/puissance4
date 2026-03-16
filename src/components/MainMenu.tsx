import { motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { ThemeToggle } from './ThemeToggle';

interface MainMenuProps {
  onSelectMode: (mode: 'local' | 'ai' | 'online') => void;
}

interface ModeOption {
  mode: 'local' | 'ai' | 'online';
  label: string;
  description: string;
  emoji: string;
  color: string;
}

const modes: ModeOption[] = [
  {
    mode: 'local',
    label: 'Local Multiplayer',
    description: 'Play with a friend on this device',
    emoji: '👥',
    color: 'mode-local',
  },
  {
    mode: 'ai',
    label: 'vs AI',
    description: 'Challenge the computer',
    emoji: '🤖',
    color: 'mode-ai',
  },
  {
    mode: 'online',
    label: 'Online',
    description: 'Play with friends anywhere',
    emoji: '🌐',
    color: 'mode-online',
  },
];

export function MainMenu({ onSelectMode }: MainMenuProps) {
  const { soundEnabled, toggleSound } = useGameStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring' as const, stiffness: 200, damping: 20 },
    },
  };

  return (
    <div className="menu-screen">
      {/* Header controls */}
      <div className="menu-header">
        <button
          onClick={toggleSound}
          className="btn btn-ghost text-xl"
          title={soundEnabled ? 'Mute' : 'Unmute'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
        <ThemeToggle />
      </div>

      <motion.div
        className="menu-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo / Title */}
        <motion.div className="menu-logo" variants={itemVariants}>
          <div className="logo-pieces">
            <motion.div
              className="logo-piece logo-piece-p1"
              animate={{
                y: [0, -8, 0],
                rotate: [0, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: 0,
              }}
            />
            <motion.div
              className="logo-piece logo-piece-p2"
              animate={{
                y: [0, -8, 0],
                rotate: [0, 5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: 0.3,
              }}
            />
            <motion.div
              className="logo-piece logo-piece-p1"
              animate={{
                y: [0, -8, 0],
                rotate: [0, -3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: 0.6,
              }}
            />
            <motion.div
              className="logo-piece logo-piece-p2"
              animate={{
                y: [0, -8, 0],
                rotate: [0, 4, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
                delay: 0.9,
              }}
            />
          </div>

          <h1 className="menu-title">Puissance 4</h1>
          <p className="menu-subtitle">Connect 4 • Classic Strategy Game</p>
        </motion.div>

        {/* Mode selection */}
        <motion.div className="mode-grid" variants={itemVariants}>
          {modes.map((option, index) => (
            <motion.button
              key={option.mode}
              className={`mode-card ${option.color}`}
              onClick={() => onSelectMode(option.mode)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3 + index * 0.1,
                type: 'spring',
                stiffness: 200,
              }}
              whileHover={{ scale: 1.03, translateY: -3 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="mode-emoji">{option.emoji}</span>
              <span className="mode-label">{option.label}</span>
              <span className="mode-description">{option.description}</span>
            </motion.button>
          ))}
        </motion.div>

        <motion.p
          className="menu-footer"
          variants={itemVariants}
        >
          Drop pieces to connect 4 in a row!
        </motion.p>
      </motion.div>
    </div>
  );
}
