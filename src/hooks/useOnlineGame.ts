import { useEffect, useCallback, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  subscribeToRoom,
  makeOnlineMove,
  resetOnlineGame,
  updateGame,
  getRoom,
  GameRow,
  isSupabaseConfigured,
} from '../lib/supabase';
import { checkWin, checkDraw, dropPiece, getOtherPlayer } from '../lib/gameLogic';
import { Player } from '../lib/gameLogic';
import confetti from 'canvas-confetti';

export function useOnlineGame() {
  // Read individual values so syncFromRow callback stays stable
  const syncOnlineState = useGameStore(s => s.syncOnlineState);
  const setOpponentConnected = useGameStore(s => s.setOpponentConnected);
  const mode = useGameStore(s => s.mode);
  const roomCode = useGameStore(s => s.roomCode);

  // Use a ref so the subscription callback always has the latest version
  // without needing to re-subscribe every render
  const syncFromRowRef = useRef<(row: GameRow) => void>(() => {});

  const syncFromRow = useCallback((row: GameRow) => {
    const rowStatus = row.status === 'waiting' ? 'playing' : row.status;
    syncOnlineState({
      board: row.board,
      currentPlayer: row.current_player as Player,
      status: rowStatus,
      winner: row.winner as Player | null,
      winningCells: (row.winning_cells ?? []) as [number, number][],
      player1Score: row.player1_score,
      player2Score: row.player2_score,
      draws: row.draws,
      player1Name: row.player1_name,
      player2Name: row.player2_name,
      nextFirstPlayer: row.next_first_player as Player,
      youtubeUrl: row.youtube_url ?? '',
    });

    if (row.status === 'won') {
      triggerConfetti(row.winner as Player);
    }

    if (
      (row.status === 'playing' || row.status === 'won' || row.status === 'draw') &&
      row.player2_name !== 'Waiting...'
    ) {
      setOpponentConnected(true);
    }
  }, [syncOnlineState, setOpponentConnected]);

  const handleYoutubeSync = useCallback(async (url: string) => {
    const { roomCode } = useGameStore.getState();
    if (!roomCode) return;
    await updateGame(roomCode, { youtube_url: url || null });
  }, []);

  // Keep ref in sync so the stable subscription closure always calls the latest version
  syncFromRowRef.current = syncFromRow;

  useEffect(() => {
    if (mode !== 'online' || !roomCode || !isSupabaseConfigured) return;

    // ─── Initial fetch ───────────────────────────────────────────────────────
    // If Player 2 joined while Player 1 was still on the setup screen,
    // the realtime event was missed. Fetch current state immediately.
    getRoom(roomCode).then(row => {
      if (row) syncFromRowRef.current(row);
    });

    // ─── Realtime subscription ───────────────────────────────────────────────
    // Pass a stable wrapper so the subscription is never recreated due to
    // syncFromRow changing between renders.
    const unsubscribe = subscribeToRoom(roomCode, (row) => syncFromRowRef.current(row));

    return () => {
      unsubscribe();
    };
  // Only re-subscribe when the room or mode actually changes
  }, [mode, roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleOnlineMove = useCallback(async (col: number) => {
    const state = useGameStore.getState();
    const {
      board, currentPlayer, myPlayer, status, roomCode,
      player1Score, player2Score, draws, nextFirstPlayer, firstPlayer,
    } = state;

    if (!roomCode || status !== 'playing' || myPlayer !== currentPlayer) return;

    const result = dropPiece(board, col, currentPlayer);
    if (!result) return;

    const { board: newBoard, row } = result;
    const winResult = checkWin(newBoard, col, row, currentPlayer);
    const isDraw = !winResult.won && checkDraw(newBoard);

    let newStatus: 'playing' | 'won' | 'draw' = 'playing';
    let winner: Player | null = null;
    let winningCells: [number, number][] | null = null;
    let newP1Score = player1Score;
    let newP2Score = player2Score;
    let newDraws = draws;
    let newNextFirst = nextFirstPlayer;

    if (winResult.won) {
      newStatus = 'won';
      winner = currentPlayer;
      winningCells = winResult.cells as [number, number][];
      if (currentPlayer === 1) newP1Score++;
      else newP2Score++;
      newNextFirst = getOtherPlayer(firstPlayer);
      triggerConfetti(currentPlayer);
    } else if (isDraw) {
      newStatus = 'draw';
      newDraws++;
      newNextFirst = getOtherPlayer(firstPlayer);
    }

    const nextPlayer = winResult.won || isDraw ? currentPlayer : getOtherPlayer(currentPlayer);

    await makeOnlineMove(
      roomCode,
      newBoard,
      nextPlayer,
      newStatus,
      winner,
      winningCells,
      newP1Score,
      newP2Score,
      newDraws,
      newNextFirst
    );
  }, []);

  const handleOnlineRematch = useCallback(async () => {
    const state = useGameStore.getState();
    const { roomCode, nextFirstPlayer, player1Score, player2Score, draws, myPlayer } = state;

    if (!roomCode || myPlayer !== 1) return;

    await resetOnlineGame(
      roomCode,
      nextFirstPlayer as Player,
      player1Score,
      player2Score,
      draws,
      getOtherPlayer(nextFirstPlayer as Player)
    );
  }, []);

  return {
    handleOnlineMove,
    handleOnlineRematch,
    handleYoutubeSync,
    isConfigured: isSupabaseConfigured,
  };
}

function triggerConfetti(winner: Player | null) {
  if (!winner) return;
  const colors = winner === 1
    ? ['#ef4444', '#f87171', '#fca5a5']
    : ['#facc15', '#fde047', '#fef08a'];

  confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 }, colors });

  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors });
  }, 200);
}
