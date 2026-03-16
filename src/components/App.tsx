import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/gameStore';
import { MainMenu } from './MainMenu';
import { PlayerSetup } from './PlayerSetup';
import { DifficultyPicker } from './DifficultyPicker';
import { OnlineSetup } from './OnlineSetup';
import { Board } from './Board';
import { ScorePanel } from './ScorePanel';
import { GameControls } from './GameControls';
import { WinBanner } from './WinBanner';
import { useAI } from '../hooks/useAI';
import { useOnlineGame } from '../hooks/useOnlineGame';
import { Player } from '../lib/gameLogic';
import { Difficulty } from '../lib/minimax';

function GameScreen() {
  const {
    mode,
    newGame,
    rematch,
    myPlayer,
    roomCode,
    status,
    opponentConnected,
    player2Name,
  } = useGameStore();

  useAI();
  const { handleOnlineRematch } = useOnlineGame();

  const handleRematch = async () => {
    if (mode === 'online') {
      await handleOnlineRematch();
    } else {
      rematch();
    }
  };

  const isOnline = mode === 'online';
  const waitingForOpponent = isOnline && !opponentConnected && myPlayer === 1;

  return (
    <motion.div
      className="game-screen"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Connection status for online */}
      {isOnline && (
        <motion.div
          className={`connection-bar ${opponentConnected ? 'connected' : 'waiting'}`}
          initial={{ y: -40 }}
          animate={{ y: 0 }}
        >
          {waitingForOpponent ? (
            <>
              <div className="connection-dot waiting" />
              <span>Waiting for opponent...</span>
              <span className="room-code-badge">Room: {roomCode}</span>
            </>
          ) : (
            <>
              <div className="connection-dot connected" />
              <span>{opponentConnected ? `${player2Name} connected` : 'Connecting...'}</span>
              <span className="room-code-badge">Room: {roomCode}</span>
            </>
          )}
        </motion.div>
      )}

      {/* Online: waiting room before game starts */}
      {isOnline && !opponentConnected && myPlayer === 2 && (
        <motion.div
          className="waiting-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="waiting-card">
            <div className="text-4xl mb-3">⏳</div>
            <p className="font-bold text-lg">Joining game...</p>
            <p className="text-sm opacity-60 mt-1">You are Player 2</p>
          </div>
        </motion.div>
      )}

      <GameControls
        onRematch={handleRematch}
        onNewGame={newGame}
      />

      <ScorePanel />

      <Board />

      {/* Rematch prompt when game ends (non-banner) */}
      {(status === 'won' || status === 'draw') && (
        <WinBanner
          onRematch={handleRematch}
          onNewGame={newGame}
        />
      )}
    </motion.div>
  );
}

export function App() {
  const {
    screen,
    mode,
    setMode,
    setScreen,
    setPlayer1Name,
    setPlayer2Name,
    startGame,
    setRoomCode,
    setMyPlayer,
    setOpponentConnected,
  } = useGameStore();

  const handleSelectMode = (selectedMode: 'local' | 'ai' | 'online') => {
    setMode(selectedMode);
    if (selectedMode === 'online') {
      setScreen('onlineSetup');
    } else {
      setScreen('playerSetup');
    }
  };

  const handlePlayerSetupDone = (p1: string, p2: string) => {
    setPlayer1Name(p1);
    setPlayer2Name(p2);
    if (mode === 'ai') {
      setScreen('difficultyPicker');
    } else {
      startGame(1);
      setScreen('game');
    }
  };

  const handleDifficultySelected = (_difficulty: Difficulty) => {
    startGame(1);
    setScreen('game');
  };

  const handleOnlineJoined = (roomCode: string, playerNum: Player, myName: string) => {
    setRoomCode(roomCode);
    setMyPlayer(playerNum);
    if (playerNum === 1) {
      setPlayer1Name(myName);
    } else {
      setPlayer2Name(myName);
      setOpponentConnected(true);
    }
    setScreen('game');
  };

  const handleBack = () => {
    if (screen === 'playerSetup' || screen === 'onlineSetup') {
      setScreen('menu');
      setMode('menu');
    } else if (screen === 'difficultyPicker') {
      setScreen('playerSetup');
    }
  };

  return (
    <div className="app-root">
      <AnimatePresence mode="wait">
        {screen === 'menu' && (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="screen-wrapper"
          >
            <MainMenu onSelectMode={handleSelectMode} />
          </motion.div>
        )}

        {screen === 'playerSetup' && (
          <motion.div
            key="playerSetup"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="screen-wrapper"
          >
            <PlayerSetup
              mode={mode as 'local' | 'ai'}
              onStart={handlePlayerSetupDone}
              onBack={handleBack}
            />
          </motion.div>
        )}

        {screen === 'difficultyPicker' && (
          <motion.div
            key="difficulty"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="screen-wrapper"
          >
            <DifficultyPicker
              onSelect={handleDifficultySelected}
              onBack={handleBack}
            />
          </motion.div>
        )}

        {screen === 'onlineSetup' && (
          <motion.div
            key="onlineSetup"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="screen-wrapper"
          >
            <OnlineSetup
              onJoined={handleOnlineJoined}
              onBack={handleBack}
            />
          </motion.div>
        )}

        {screen === 'game' && (
          <motion.div
            key="game"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="screen-wrapper"
          >
            <GameScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
