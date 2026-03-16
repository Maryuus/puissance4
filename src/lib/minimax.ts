import {
  Board,
  Player,
  ROWS,
  COLS,
  WIN_LENGTH,
  getValidMoves,
  getLowestEmptyRow,
  cloneBoard,
  checkDraw,
} from './gameLogic';

export type Difficulty = 'easy' | 'medium' | 'hard';

const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  easy: 0,
  medium: 4,
  hard: 7,
};

// Score constants
const WIN_SCORE = 1_000_000;
const LOSE_SCORE = -1_000_000;

function scoreWindow(window: (Player | null)[], player: Player): number {
  const opponent = player === 1 ? 2 : 1;
  const playerCount = window.filter(c => c === player).length;
  const emptyCount = window.filter(c => c === null).length;
  const opponentCount = window.filter(c => c === opponent).length;

  if (playerCount === 4) return 100;
  if (playerCount === 3 && emptyCount === 1) return 5;
  if (playerCount === 2 && emptyCount === 2) return 2;
  if (opponentCount === 3 && emptyCount === 1) return -4;
  return 0;
}

function scoreBoard(board: Board, player: Player): number {
  let score = 0;

  // Center column preference
  const centerCol = Math.floor(COLS / 2);
  const centerArray = Array.from({ length: ROWS }, (_, r) => board[r][centerCol]);
  score += centerArray.filter(c => c === player).length * 3;

  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]];
      score += scoreWindow(window, player);
    }
  }

  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
      const window = [board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]];
      score += scoreWindow(window, player);
    }
  }

  // Diagonal down-right
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]];
      score += scoreWindow(window, player);
    }
  }

  // Diagonal up-right
  for (let r = WIN_LENGTH - 1; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      const window = [board[r][c], board[r-1][c+1], board[r-2][c+2], board[r-3][c+3]];
      score += scoreWindow(window, player);
    }
  }

  return score;
}

function checkWinFast(board: Board, player: Player): boolean {
  // Horizontal
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      if (board[r][c] === player && board[r][c+1] === player &&
          board[r][c+2] === player && board[r][c+3] === player) return true;
    }
  }
  // Vertical
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
      if (board[r][c] === player && board[r+1][c] === player &&
          board[r+2][c] === player && board[r+3][c] === player) return true;
    }
  }
  // Diagonal down-right
  for (let r = 0; r <= ROWS - WIN_LENGTH; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      if (board[r][c] === player && board[r+1][c+1] === player &&
          board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
    }
  }
  // Diagonal up-right
  for (let r = WIN_LENGTH - 1; r < ROWS; r++) {
    for (let c = 0; c <= COLS - WIN_LENGTH; c++) {
      if (board[r][c] === player && board[r-1][c+1] === player &&
          board[r-2][c+2] === player && board[r-3][c+3] === player) return true;
    }
  }
  return false;
}

function minimax(
  board: Board,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  aiPlayer: Player
): number {
  const humanPlayer: Player = aiPlayer === 1 ? 2 : 1;

  if (checkWinFast(board, aiPlayer)) return WIN_SCORE + depth;
  if (checkWinFast(board, humanPlayer)) return LOSE_SCORE - depth;
  if (checkDraw(board)) return 0;
  if (depth === 0) return scoreBoard(board, aiPlayer);

  const validMoves = getValidMoves(board);

  if (maximizing) {
    let maxScore = -Infinity;
    for (const col of validMoves) {
      const row = getLowestEmptyRow(board, col);
      if (row === null) continue;
      const newBoard = cloneBoard(board);
      newBoard[row][col] = aiPlayer;
      const score = minimax(newBoard, depth - 1, alpha, beta, false, aiPlayer);
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const col of validMoves) {
      const row = getLowestEmptyRow(board, col);
      if (row === null) continue;
      const newBoard = cloneBoard(board);
      newBoard[row][col] = humanPlayer;
      const score = minimax(newBoard, depth - 1, alpha, beta, true, aiPlayer);
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

// Order moves by center preference for better pruning
function orderMoves(moves: number[]): number[] {
  const center = Math.floor(COLS / 2);
  return [...moves].sort((a, b) => Math.abs(a - center) - Math.abs(b - center));
}

export function getBestMove(board: Board, aiPlayer: Player, difficulty: Difficulty): number {
  const validMoves = getValidMoves(board);
  if (validMoves.length === 0) return -1;

  // Easy: random move
  if (difficulty === 'easy') {
    return validMoves[Math.floor(Math.random() * validMoves.length)];
  }

  const depth = DIFFICULTY_DEPTH[difficulty];

  // Check for immediate win
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    if (row === null) continue;
    const testBoard = cloneBoard(board);
    testBoard[row][col] = aiPlayer;
    if (checkWinFast(testBoard, aiPlayer)) return col;
  }

  // Check to block opponent's immediate win
  const human: Player = aiPlayer === 1 ? 2 : 1;
  for (const col of validMoves) {
    const row = getLowestEmptyRow(board, col);
    if (row === null) continue;
    const testBoard = cloneBoard(board);
    testBoard[row][col] = human;
    if (checkWinFast(testBoard, human)) return col;
  }

  // Run minimax with ordered moves
  const orderedMoves = orderMoves(validMoves);
  let bestScore = -Infinity;
  let bestCol = orderedMoves[0];

  for (const col of orderedMoves) {
    const row = getLowestEmptyRow(board, col);
    if (row === null) continue;
    const newBoard = cloneBoard(board);
    newBoard[row][col] = aiPlayer;
    const score = minimax(newBoard, depth - 1, -Infinity, Infinity, false, aiPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestCol = col;
    }
  }

  return bestCol;
}

export function getBestMoveAsync(
  board: Board,
  aiPlayer: Player,
  difficulty: Difficulty
): Promise<number> {
  return new Promise(resolve => {
    // Use setTimeout to not block the UI thread
    setTimeout(() => {
      resolve(getBestMove(board, aiPlayer, difficulty));
    }, 0);
  });
}
