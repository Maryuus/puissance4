import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { MD_RULES } from '../lib/monopolyDealLogic';
import type { GameId } from '../AppShell';

interface HubProps {
  onSelectGame: (game: GameId) => void;
}

// To add a new game to the hub, add an entry here and register it in AppShell.tsx
const games: { id: GameId; name: string; description: string; emoji: string; accent: string; accentMuted: string; available: boolean }[] = [
  {
    id: 'puissance4',
    name: 'Puissance 4',
    description: 'Aligne 4 jetons — local, IA, ou en ligne',
    emoji: '🔴',
    accent: '#3b82f6',
    accentMuted: 'rgba(59,130,246,0.15)',
    available: true,
  },
  {
    id: 'uno',
    name: 'UNO',
    description: 'Jeu de cartes multijoueur en ligne · 2–10 joueurs',
    emoji: '🃏',
    accent: '#ef4444',
    accentMuted: 'rgba(239,68,68,0.15)',
    available: true,
  },
  {
    id: 'monopolydeal',
    name: 'Monopoly Deal',
    description: 'Le jeu de cartes Monopoly · 2–5 joueurs',
    emoji: '🎩',
    accent: '#22c55e',
    accentMuted: 'rgba(34,197,94,0.15)',
    available: true,
  },
];

const comingSoon: { name: string; description: string; emoji: string; accent: string }[] = [];


export function Hub({ onSelectGame }: HubProps) {
  const [showMDRules, setShowMDRules] = useState(false);

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
            <motion.div
              key={game.id}
              className="hub-game-card"
              style={{ borderLeftColor: game.accent, cursor: 'pointer', position: 'relative' }}
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
              {game.id === 'monopolydeal' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMDRules(true); }}
                  title="Regles du jeu"
                  style={{
                    background: 'rgba(34,197,94,0.15)',
                    border: '1px solid rgba(34,197,94,0.35)',
                    color: '#22c55e',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                >
                  Regles
                </button>
              ) : (
                <span className="hub-game-arrow">→</span>
              )}
            </motion.div>
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
        <motion.p variants={itemVariants} style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
          v{__APP_VERSION__}
        </motion.p>
      </motion.div>

      {/* Monopoly Deal Rules Modal */}
      <AnimatePresence>
        {showMDRules && (
          <motion.div
            className="md-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMDRules(false)}
            style={{ zIndex: 200, alignItems: 'flex-start', paddingTop: 24, paddingBottom: 24, overflowY: 'auto' }}
          >
            <motion.div
              className="md-modal"
              style={{ maxWidth: 480, width: '92%', maxHeight: '80vh', overflowY: 'auto' }}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  🎩 Règles — Monopoly Deal
                </h2>
                <button
                  onClick={() => setShowMDRules(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}
                >
                  ✕
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MD_RULES.map((rule) => (
                  <div
                    key={rule.title}
                    style={{
                      background: 'var(--bg-secondary)',
                      borderRadius: 8,
                      padding: '8px 12px',
                      borderLeft: '3px solid #22c55e',
                    }}
                  >
                    <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', margin: '0 0 2px' }}>
                      {rule.title}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                      {rule.body}
                    </p>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                2–5 joueurs · 96 cartes · Premier à 3 sets complets
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
