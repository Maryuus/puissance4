import { motion } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';

interface HubProps {
  onSelectGame: (game: 'puissance4' | 'uno' | 'monopolydeal') => void;
}

const games = [
  {
    id: 'puissance4' as const,
    name: 'Puissance 4',
    description: 'Aligne 4 jetons — local, IA, ou en ligne',
    emoji: '🔴',
    accent: '#3b82f6',
    accentMuted: 'rgba(59,130,246,0.15)',
    available: true,
  },
  {
    id: 'uno' as const,
    name: 'UNO',
    description: 'Jeu de cartes multijoueur en ligne · 2–10 joueurs',
    emoji: '🃏',
    accent: '#ef4444',
    accentMuted: 'rgba(239,68,68,0.15)',
    available: true,
  },
  {
    id: 'monopolydeal' as const,
    name: 'Monopoly Deal',
    description: 'Le jeu de cartes Monopoly · 2–5 joueurs',
    emoji: '🎩',
    accent: '#22c55e',
    accentMuted: 'rgba(34,197,94,0.15)',
    available: true,
  },
] as const;

const comingSoon: { name: string; description: string; emoji: string; accent: string }[] = [];

export function Hub({ onSelectGame }: HubProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
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
    <div className="menu-screen" style={{ maxWidth: 520 }}>
      <div className="menu-header">
        <ThemeToggle />
      </div>

      <motion.div
        className="menu-content"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div className="menu-logo" variants={itemVariants}>
          <div className="hub-logo-icons">
            {['🎮', '🃏', '🎯'].map((icon, i) => (
              <motion.span
                key={i}
                className="hub-logo-icon"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: i * 0.3,
                }}
              >
                {icon}
              </motion.span>
            ))}
          </div>
          <h1 className="menu-title">Mini Jeux</h1>
          <p className="menu-subtitle">Choisis un jeu et joue avec tes amis</p>
        </motion.div>

        {/* Available games */}
        <motion.div className="mode-grid" variants={itemVariants}>
          {games.map((game, index) => (
            <motion.button
              key={game.id}
              className="hub-game-card"
              style={{ borderLeftColor: game.accent }}
              onClick={() => onSelectGame(game.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, type: 'spring', stiffness: 200 }}
              whileHover={{ scale: 1.03, translateY: -3 }}
              whileTap={{ scale: 0.97 }}
            >
              <span className="hub-game-emoji">{game.emoji}</span>
              <div className="hub-game-info">
                <span className="hub-game-name">{game.name}</span>
                <span className="hub-game-desc">{game.description}</span>
              </div>
              <span className="hub-game-arrow">→</span>
            </motion.button>
          ))}

          {/* Coming soon */}
          {comingSoon.map((game) => (
            <div
              key={game.name}
              className="hub-game-card"
              style={{ borderLeftColor: game.accent, opacity: 0.5, cursor: 'not-allowed' }}
            >
              <span className="hub-game-emoji">{game.emoji}</span>
              <div className="hub-game-info">
                <span className="hub-game-name">{game.name}</span>
                <span className="hub-game-desc">{game.description}</span>
              </div>
              <span
                className="hub-game-soon"
                style={{ background: `${game.accent}30`, color: game.accent }}
              >
                Bientôt
              </span>
            </div>
          ))}
        </motion.div>

        <motion.p className="menu-footer" variants={itemVariants}>
          Plus de jeux à venir !
        </motion.p>
      </motion.div>
    </div>
  );
}
