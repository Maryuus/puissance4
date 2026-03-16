import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/gameStore';

interface PlayerCardProps {
  playerNum: 1 | 2;
  name: string;
  score: number;
  streak: number;
  isActive: boolean;
  isWinner: boolean;
  isAI?: boolean;
}

function PlayerCard({ playerNum, name, score, streak, isActive, isWinner, isAI }: PlayerCardProps) {
  const colorClass = playerNum === 1
    ? 'player-card-p1'
    : 'player-card-p2';

  const pieceClass = playerNum === 1 ? 'piece-p1' : 'piece-p2';

  return (
    <motion.div
      className={`player-card ${colorClass} ${isActive ? 'player-card-active' : ''} ${isWinner ? 'player-card-winner' : ''}`}
      animate={{
        scale: isActive ? 1.03 : 1,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className={`piece-mini ${pieceClass}`} />
        <span className="font-bold text-sm sm:text-base truncate max-w-[100px] sm:max-w-[120px]">
          {name}
          {isAI && <span className="ml-1 text-xs opacity-60">(AI)</span>}
        </span>
        {isWinner && (
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            className="text-lg"
          >
            🏆
          </motion.span>
        )}
      </div>

      <div className="flex items-baseline gap-3">
        <motion.span
          key={score}
          className="text-3xl sm:text-4xl font-black"
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {score}
        </motion.span>

        {streak > 1 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="streak-badge"
          >
            🔥 {streak}
          </motion.div>
        )}
      </div>

      {isActive && (
        <motion.div
          className="turn-indicator"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.3 }}
        />
      )}
    </motion.div>
  );
}

export function ScorePanel() {
  const {
    player1Name,
    player2Name,
    player1Score,
    player2Score,
    draws,
    player1Streak,
    player2Streak,
    currentPlayer,
    status,
    winner,
    mode,
    isAIThinking,
  } = useGameStore();

  const isPlaying = status === 'playing';

  return (
    <div className="score-panel">
      <PlayerCard
        playerNum={1}
        name={player1Name}
        score={player1Score}
        streak={player1Streak}
        isActive={isPlaying && currentPlayer === 1}
        isWinner={winner === 1}
      />

      <div className="score-middle">
        <motion.div
          className="draws-count"
          key={draws}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
        >
          <span className="text-xs text-blue-400/70 dark:text-blue-300/50 uppercase tracking-wider">Draws</span>
          <span className="text-xl font-bold text-blue-300 dark:text-blue-200">{draws}</span>
        </motion.div>

        {/* Turn indicator */}
        <AnimatePresence mode="wait">
          {isPlaying && (
            <motion.div
              key={currentPlayer}
              className="turn-text"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              {isAIThinking ? (
                <span className="ai-thinking">
                  <span className="ai-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                  AI...
                </span>
              ) : (
                <span className={currentPlayer === 1 ? 'text-red-400' : 'text-yellow-400'}>
                  {currentPlayer === 1 ? '●' : '●'}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <PlayerCard
        playerNum={2}
        name={player2Name}
        score={player2Score}
        streak={player2Streak}
        isActive={isPlaying && currentPlayer === 2}
        isWinner={winner === 2}
        isAI={mode === 'ai'}
      />
    </div>
  );
}
