import { createClient, RealtimeChannel } from '@supabase/supabase-js';
import { Board, Player, createEmptyBoard } from './gameLogic';
import { generateRoomCode } from './utils';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface GameRow {
  id: string;
  room_code: string;
  board: Board;
  current_player: number;
  player1_name: string;
  player2_name: string;
  player1_score: number;
  player2_score: number;
  draws: number;
  status: 'waiting' | 'playing' | 'won' | 'draw';
  winner: number | null;
  next_first_player: number;
  winning_cells: [number, number][] | null;
  youtube_url: string | null;
  created_at: string;
  updated_at: string;
}


export async function createRoom(playerName: string): Promise<GameRow | null> {
  if (!supabase) return null;

  let roomCode = generateRoomCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data, error } = await supabase
      .from('games')
      .insert({
        room_code: roomCode,
        board: createEmptyBoard(),
        current_player: 1,
        player1_name: playerName,
        player2_name: 'Waiting...',
        status: 'waiting',
      })
      .select()
      .single();

    if (!error && data) return data as GameRow;
    if (error?.code === '23505') {
      // Unique constraint violation, try a new code
      roomCode = generateRoomCode();
      attempts++;
    } else {
      console.error('Error creating room:', error);
      return null;
    }
  }

  return null;
}

export async function joinRoom(roomCode: string, playerName: string): Promise<GameRow | null> {
  if (!supabase) return null;

  const { data: existing, error: fetchError } = await supabase
    .from('games')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (fetchError || !existing) {
    console.error('Room not found:', fetchError);
    return null;
  }

  const game = existing as GameRow;

  if (game.status !== 'waiting') {
    console.error('Room is not available');
    return null;
  }

  const { data, error } = await supabase
    .from('games')
    .update({
      player2_name: playerName,
      status: 'playing',
    })
    .eq('room_code', roomCode.toUpperCase())
    .select()
    .single();

  if (error) {
    console.error('Error joining room:', error);
    return null;
  }

  return data as GameRow;
}

export async function getRoom(roomCode: string): Promise<GameRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('games')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) return null;
  return data as GameRow;
}

export async function updateGame(
  roomCode: string,
  updates: Partial<Omit<GameRow, 'id' | 'room_code' | 'created_at' | 'updated_at'>>
): Promise<GameRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('games')
    .update(updates)
    .eq('room_code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error updating game:', error);
    return null;
  }

  return data as GameRow;
}

export interface OnlineMoveOptions {
  board: Board;
  currentPlayer: Player;
  status: 'playing' | 'won' | 'draw';
  winner: Player | null;
  winningCells: [number, number][] | null;
  player1Score: number;
  player2Score: number;
  draws: number;
  nextFirstPlayer: number;
}

export async function makeOnlineMove(
  roomCode: string,
  opts: OnlineMoveOptions,
): Promise<GameRow | null> {
  return updateGame(roomCode, {
    board: opts.board,
    current_player: opts.currentPlayer,
    status: opts.status,
    winner: opts.winner,
    winning_cells: opts.winningCells,
    player1_score: opts.player1Score,
    player2_score: opts.player2Score,
    draws: opts.draws,
    next_first_player: opts.nextFirstPlayer,
  });
}

export async function resetOnlineGame(
  roomCode: string,
  firstPlayer: Player,
  player1Score: number,
  player2Score: number,
  draws: number,
  nextFirstPlayer: number
): Promise<GameRow | null> {
  return updateGame(roomCode, {
    board: createEmptyBoard(),
    current_player: firstPlayer,
    status: 'playing',
    winner: null,
    winning_cells: null,
    player1_score: player1Score,
    player2_score: player2Score,
    draws,
    next_first_player: nextFirstPlayer,
  });
}

export function subscribeToRoom(
  roomCode: string,
  onUpdate: (game: GameRow) => void
): () => void {
  if (!supabase) return () => {};

  let channel: RealtimeChannel | null = supabase
    .channel(`game:${roomCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'games', filter: `room_code=eq.${roomCode}` },
      (payload) => { if (payload.new) onUpdate(payload.new as GameRow); }
    )
    .subscribe();

  return () => {
    if (supabase && channel) {
      supabase.removeChannel(channel);
      channel = null;
    }
  };
}
