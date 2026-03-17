import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hub } from './components/Hub';
import { App as P4App } from './components/App';
import { UnoApp } from './components/uno/UnoApp';
import { MonopolyDealApp } from './components/monopolydeal/MonopolyDealApp';

type CurrentGame = 'hub' | 'puissance4' | 'uno' | 'monopolydeal';

export function AppShell() {
  const [currentGame, setCurrentGame] = useState<CurrentGame>('hub');

  return (
    <AnimatePresence mode="wait">
      {currentGame === 'hub' && (
        <motion.div
          key="hub"
          className="app-root"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="screen-wrapper">
            <Hub onSelectGame={(game) => setCurrentGame(game)} />
          </div>
        </motion.div>
      )}

      {currentGame === 'puissance4' && (
        <motion.div
          key="puissance4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <P4App onGoBack={() => setCurrentGame('hub')} />
        </motion.div>
      )}

      {currentGame === 'uno' && (
        <motion.div
          key="uno"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <UnoApp onGoBack={() => setCurrentGame('hub')} />
        </motion.div>
      )}

      {currentGame === 'monopolydeal' && (
        <motion.div
          key="monopolydeal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{ width: '100%', minHeight: '100vh' }}
        >
          <MonopolyDealApp onGoBack={() => setCurrentGame('hub')} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
