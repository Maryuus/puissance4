export type Player = 1 | 2;
export type Cell = Player | null;
export type Board = Cell[][];

export const ROWS = 6;
export const COLS = 7;
export const WIN_LENGTH = 4;

export function createEmptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

export function getLowestEmptyRow(board: Board, col: number): number | null {
  for (let row = ROWS - 1; row >= 0; row--) {
    if (board[row][col] === null) return row;
  }
  return null;
}

export function getValidMoves(board: Board): number[] {
  const moves: number[] = [];
  for (let col = 0; col < COLS; col++) {
    if (board[0][col] === null) moves.push(col);
  }
  return moves;
}

export function dropPiece(board: Board, col: number, player: Player): { board: Board; row: number } | null {
  const row = getLowestEmptyRow(board, col);
  if (row === null) return null;
  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  return { board: newBoard, row };
}

export interface WinResult {
  won: boolean;
  cells: [number, number][];
}

export function checkWin(board: Board, lastCol: number, lastRow: number, player: Player): WinResult {
  const directions: [number, number][] = [
    [0, 1],   // horizontal
    [1, 0],   // vertical
    [1, 1],   // diagonal down-right
    [1, -1],  // diagonal down-left
  ];

  for (const [dr, dc] of directions) {
    const cells: [number, number][] = [[lastRow, lastCol]];

    // Check positive direction
    let r = lastRow + dr;
    let c = lastCol + dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
      cells.push([r, c]);
      r += dr;
      c += dc;
    }

    // Check negative direction
    r = lastRow - dr;
    c = lastCol - dc;
    while (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === player) {
      cells.push([r, c]);
      r -= dr;
      c -= dc;
    }

    if (cells.length >= WIN_LENGTH) {
      return { won: true, cells };
    }
  }

  return { won: false, cells: [] };
}

export function checkWinFull(board: Board, player: Player): WinResult {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (board[row][col] === player) {
        const result = checkWin(board, col, row, player);
        if (result.won) return result;
      }
    }
  }
  return { won: false, cells: [] };
}

export function checkDraw(board: Board): boolean {
  return getValidMoves(board).length === 0;
}

export function getOtherPlayer(player: Player): Player {
  return player === 1 ? 2 : 1;
}
