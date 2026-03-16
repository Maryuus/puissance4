import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Board,
  Player,
  Cell,
  createEmptyBoard,
  dropPiece,
  checkWin,
  checkDraw,
  getOtherPlayer,
} from '../lib/gameLogic';
import { Difficulty } from '../lib/minimax';
import { playDropSound, playWinSound, playDrawSound } from '../lib/sounds';

export type GameMode = 'menu' | 'local' | 'ai' | 'online';
export type GameStatus = 'idle' | 'playing' | 'won' | 'draw';

export interface GameState {
  // Navigation
  mode: GameMode;
  screen: 'menu' | 'playerSetup' | 'difficultyPicker' | 'onlineSetup' | 'game';

  // Game state
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  winner: Player | null;
  winningCells: [number, number][];
  firstPlayer: Player; // who went first this game

  // Players
  player1Name: string;
  player2Name: string;
  player1Score: number;
  player2Score: number;
  draws: number;

  // Streaks
  player1Streak: number;
  player2Streak: number;
  lastWinner: Player | null;

  // AI
  aiDifficulty: Difficulty;
  isAIThinking: boolean;

  // Theme
  theme: 'dark' | 'light';

  // Hover preview
  hoveredColumn: number | null;

  // Online
  roomCode: string | null;
  myPlayer: Player | null;
  opponentConnected: boolean;

  // Next game's first player (alternating)
  nextFirstPlayer: Player;

  // Sound
  soundEnabled: boolean;

  // Actions
  setMode: (mode: GameMode) => void;
  setScreen: (screen: GameState['screen']) => void;
  setPlayer1Name: (name: string) => void;
  setPlayer2Name: (name: string) => void;
  setAIDifficulty: (difficulty: Difficulty) => void;
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setSoundEnabled: (enabled: boolean) => void;
  toggleSound: () => void;
  setHoveredColumn: (col: number | null) => void;
  setIsAIThinking: (thinking: boolean) => void;

  // Game actions
  startGame: (firstPlayer?: Player) => void;
  makeMove: (col: number) => { won: boolean; draw: boolean; row: number } | null;
  resetGame: () => void;
  newGame: () => void; // reset scores too
  rematch: () => void; // keep scores, swap first player

  // Online actions
  setRoomCode: (code: string | null) => void;
  setMyPlayer: (player: Player | null) => void;
  setOpponentConnected: (connected: boolean) => void;
  syncOnlineState: (data: {
    board: Board;
    currentPlayer: Player;
    status: GameStatus;
    winner: Player | null;
    winningCells: [number, number][] | null;
    player1Score: number;
    player2Score: number;
    draws: number;
    player1Name: string;
    player2Name: string;
    nextFirstPlayer: Player;
  }) => void;
}

const initialBoard = createEmptyBoard();

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      mode: 'menu',
      screen: 'menu',
      board: initialBoard,
      currentPlayer: 1,
      status: 'idle',
      winner: null,
      winningCells: [],
      firstPlayer: 1,
      player1Name: 'Player 1',
      player2Name: 'Player 2',
      player1Score: 0,
      player2Score: 0,
      draws: 0,
      player1Streak: 0,
      player2Streak: 0,
      lastWinner: null,
      aiDifficulty: 'medium',
      isAIThinking: false,
      theme: 'dark',
      hoveredColumn: null,
      roomCode: null,
      myPlayer: null,
      opponentConnected: false,
      nextFirstPlayer: 2, // Next game, player 2 goes first (alternating)
      soundEnabled: true,

      setMode: (mode) => set({ mode }),
      setScreen: (screen) => set({ screen }),
      setPlayer1Name: (name) => set({ player1Name: name }),
      setPlayer2Name: (name) => set({ player2Name: name }),
      setAIDifficulty: (difficulty) => set({ aiDifficulty: difficulty }),
      setTheme: (theme) => {
        set({ theme });
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },
      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      toggleSound: () => set(state => ({ soundEnabled: !state.soundEnabled })),
      setHoveredColumn: (col) => set({ hoveredColumn: col }),
      setIsAIThinking: (thinking) => set({ isAIThinking: thinking }),

      startGame: (firstPlayer = 1) => {
        set({
          board: createEmptyBoard(),
          currentPlayer: firstPlayer,
          firstPlayer,
          status: 'playing',
          winner: null,
          winningCells: [],
          isAIThinking: false,
        });
      },

      makeMove: (col: number) => {
        const state = get();
        if (state.status !== 'playing') return null;

        const result = dropPiece(state.board, col, state.currentPlayer);
        if (!result) return null;

        const { board: newBoard, row } = result;
        const winResult = checkWin(newBoard, col, row, state.currentPlayer);
        const isDraw = !winResult.won && checkDraw(newBoard);

        if (state.soundEnabled) {
          if (winResult.won) {
            playWinSound();
          } else if (isDraw) {
            playDrawSound();
          } else {
            playDropSound(state.currentPlayer);
          }
        }

        if (winResult.won) {
          const newP1Score = state.currentPlayer === 1 ? state.player1Score + 1 : state.player1Score;
          const newP2Score = state.currentPlayer === 2 ? state.player2Score + 1 : state.player2Score;
          const newP1Streak = state.currentPlayer === 1 ? state.player1Streak + 1 : 0;
          const newP2Streak = state.currentPlayer === 2 ? state.player2Streak + 1 : 0;

          set({
            board: newBoard,
            status: 'won',
            winner: state.currentPlayer,
            winningCells: winResult.cells as [number, number][],
            player1Score: newP1Score,
            player2Score: newP2Score,
            player1Streak: newP1Streak,
            player2Streak: newP2Streak,
            lastWinner: state.currentPlayer,
            nextFirstPlayer: getOtherPlayer(state.firstPlayer),
          });
          return { won: true, draw: false, row };
        }

        if (isDraw) {
          set({
            board: newBoard,
            status: 'draw',
            draws: state.draws + 1,
            nextFirstPlayer: getOtherPlayer(state.firstPlayer),
          });
          return { won: false, draw: true, row };
        }

        set({
          board: newBoard,
          currentPlayer: getOtherPlayer(state.currentPlayer),
        });

        return { won: false, draw: false, row };
      },

      resetGame: () => {
        set({
          board: createEmptyBoard(),
          currentPlayer: 1,
          status: 'idle',
          winner: null,
          winningCells: [],
          isAIThinking: false,
        });
      },

      newGame: () => {
        set({
          mode: 'menu',
          screen: 'menu',
          board: createEmptyBoard(),
          currentPlayer: 1,
          status: 'idle',
          winner: null,
          winningCells: [],
          player1Score: 0,
          player2Score: 0,
          draws: 0,
          player1Streak: 0,
          player2Streak: 0,
          lastWinner: null,
          isAIThinking: false,
          roomCode: null,
          myPlayer: null,
          opponentConnected: false,
          nextFirstPlayer: 2,
          firstPlayer: 1,
        });
      },

      rematch: () => {
        const state = get();
        const nextFirst = state.nextFirstPlayer;
        set({
          board: createEmptyBoard(),
          currentPlayer: nextFirst,
          firstPlayer: nextFirst,
          status: 'playing',
          winner: null,
          winningCells: [],
          isAIThinking: false,
          nextFirstPlayer: getOtherPlayer(nextFirst),
        });
      },

      setRoomCode: (code) => set({ roomCode: code }),
      setMyPlayer: (player) => set({ myPlayer: player }),
      setOpponentConnected: (connected) => set({ opponentConnected: connected }),

      syncOnlineState: (data) => {
        const state = get();
        const newStatus = data.status;
        const prevStatus = state.status;

        // Play sounds for state changes
        if (state.soundEnabled) {
          if (newStatus === 'won' && prevStatus !== 'won') {
            playWinSound();
          } else if (newStatus === 'draw' && prevStatus !== 'draw') {
            playDrawSound();
          } else if (newStatus === 'playing' && prevStatus === 'playing' &&
                     data.board !== state.board) {
            // A move was made - figure out who moved
            const mover = getOtherPlayer(data.currentPlayer as Player);
            playDropSound(mover);
          }
        }

        set({
          board: data.board,
          currentPlayer: data.currentPlayer as Player,
          status: newStatus,
          winner: data.winner as Player | null,
          winningCells: (data.winningCells ?? []) as [number, number][],
          player1Score: data.player1Score,
          player2Score: data.player2Score,
          draws: data.draws,
          player1Name: data.player1Name,
          player2Name: data.player2Name,
          nextFirstPlayer: data.nextFirstPlayer as Player,
        });
      },
    }),
    {
      name: 'puissance4-storage',
      partialize: (state) => ({
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        player1Name: state.player1Name,
        player2Name: state.player2Name,
        aiDifficulty: state.aiDifficulty,
      }),
    }
  )
);

// Apply persisted theme on load
const storedTheme = useGameStore.getState().theme;
if (storedTheme === 'light') {
  document.documentElement.classList.remove('dark');
} else {
  document.documentElement.classList.add('dark');
}

// Helper type for board cells (re-export for components)
export type { Cell, Board, Player };
