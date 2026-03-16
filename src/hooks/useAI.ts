import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { getBestMoveAsync } from '../lib/minimax';
import confetti from 'canvas-confetti';

export function useAI() {
  const {
    mode,
    board,
    currentPlayer,
    status,
    myPlayer,
    aiDifficulty,
    isAIThinking,
    makeMove,
    setIsAIThinking,
  } = useGameStore();

  const thinkingRef = useRef(false);

  useEffect(() => {
    // Only activate in AI mode
    if (mode !== 'ai') return;

    // AI is always player 2
    const aiPlayer = 2;

    // Only move if it's AI's turn and game is playing
    if (currentPlayer !== aiPlayer || status !== 'playing') return;
    if (thinkingRef.current) return;

    thinkingRef.current = true;
    setIsAIThinking(true);

    // Small delay to make AI feel more natural
    const minDelay = aiDifficulty === 'easy' ? 300 : aiDifficulty === 'medium' ? 500 : 700;

    const startTime = Date.now();

    getBestMoveAsync(board, aiPlayer, aiDifficulty).then((col) => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDelay - elapsed);

      setTimeout(() => {
        // Check state is still valid
        const currentState = useGameStore.getState();
        if (
          currentState.status === 'playing' &&
          currentState.currentPlayer === aiPlayer &&
          currentState.mode === 'ai'
        ) {
          const result = makeMove(col);
          if (result?.won) {
            triggerConfetti();
          }
        }
        thinkingRef.current = false;
        setIsAIThinking(false);
      }, remaining);
    });
  }, [board, currentPlayer, status, mode, aiDifficulty, makeMove, setIsAIThinking, myPlayer]);

  const triggerConfetti = () => {
    const winner = useGameStore.getState().winner;
    const colors = winner === 1
      ? ['#ef4444', '#f87171', '#fca5a5']
      : ['#facc15', '#fde047', '#fef08a'];

    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });
  };

  return { isAIThinking };
}
