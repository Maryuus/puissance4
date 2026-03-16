import { useCallback } from 'react';
import { useGameStore } from '../store/gameStore';
import { resumeAudioContext } from '../lib/sounds';
import confetti from 'canvas-confetti';

export function useGame() {
  const store = useGameStore();

  const handleColumnClick = useCallback((col: number) => {
    const { status, mode, myPlayer, currentPlayer, isAIThinking } = useGameStore.getState();

    // Resume audio context on first interaction
    resumeAudioContext();

    if (status !== 'playing') return;
    if (isAIThinking) return;

    // Online: only allow move if it's your turn
    if (mode === 'online' && myPlayer !== currentPlayer) return;

    const result = store.makeMove(col);
    if (!result) return;

    if (result.won) {
      triggerConfetti();
    }
  }, [store]);

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

    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
    }, 200);
  };

  return {
    handleColumnClick,
    triggerConfetti,
  };
}
