import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hub } from './components/Hub';
import { App as P4App } from './components/App';
import { UnoApp } from './components/uno/UnoApp';
import { MonopolyDealApp } from './components/monopolydeal/MonopolyDealApp';

type CurrentGame = 'hub' | 'puissance4' | 'uno' | 'monopolydeal';

/** Fade-in/out wrapper used for every game transition */
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

export function AppShell() {
  const [currentGame, setCurrentGame] = useState<CurrentGame>('hub');

  const goBack = () => setCurrentGame('hub');

  return (
    <AnimatePresence mode="wait">
      {currentGame === 'hub' && (
        <GameTransition gameKey="hub">
          <div className="app-root">
            <div className="screen-wrapper">
              <Hub onSelectGame={(game) => setCurrentGame(game)} />
            </div>
          </div>
        </GameTransition>
      )}

      {currentGame === 'puissance4' && (
        <GameTransition gameKey="puissance4">
          <P4App onGoBack={goBack} />
        </GameTransition>
      )}

      {currentGame === 'uno' && (
        <GameTransition gameKey="uno">
          <UnoApp onGoBack={goBack} />
        </GameTransition>
      )}

      {currentGame === 'monopolydeal' && (
        <GameTransition gameKey="monopolydeal">
          <MonopolyDealApp onGoBack={goBack} />
        </GameTransition>
      )}
    </AnimatePresence>
  );
}
