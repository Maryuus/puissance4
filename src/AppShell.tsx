import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hub } from './components/Hub';
import { App as P4App } from './components/App';
import { UnoApp } from './components/uno/UnoApp';
import { MonopolyDealApp } from './components/monopolydeal/MonopolyDealApp';

// ─── Game registry ────────────────────────────────────────────────────────────
// To add a new game:
//   1. Import the App component
//   2. Add an entry here
//   3. Add the game card in Hub.tsx

export type GameId = 'puissance4' | 'uno' | 'monopolydeal';

const GAME_COMPONENTS: Record<GameId, React.ComponentType<{ onGoBack: () => void }>> = {
  puissance4: P4App,
  uno: UnoApp,
  monopolydeal: MonopolyDealApp,
};

// ─── Transition wrapper ───────────────────────────────────────────────────────

function GameTransition({ gameKey, children }: { gameKey: string; children: React.ReactNode }) {
  return (
    <motion.div
      key={gameKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ width: '100%', minHeight: '100vh' }}
    >
      {children}
    </motion.div>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function AppShell() {
  const [currentGame, setCurrentGame] = useState<GameId | 'hub'>('hub');

  const goBack = () => setCurrentGame('hub');

  return (
    <AnimatePresence mode="wait">
      {currentGame === 'hub' ? (
        <GameTransition gameKey="hub">
          <div className="app-root">
            <div className="screen-wrapper">
              <Hub onSelectGame={setCurrentGame} />
            </div>
          </div>
        </GameTransition>
      ) : (
        Object.entries(GAME_COMPONENTS).map(([id, GameComponent]) =>
          currentGame === id ? (
            <GameTransition key={id} gameKey={id}>
              <GameComponent onGoBack={goBack} />
            </GameTransition>
          ) : null
        )
      )}
    </AnimatePresence>
  );
}
