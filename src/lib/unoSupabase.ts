import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { UnoCard, UnoPlayer, createDeck, shuffleDeck } from './unoLogic';

export { isSupabaseConfigured };

export interface UnoRoomRow {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  host_id: string;
  players: UnoPlayer[];
  current_player_index: number;
  direction: number;
  deck: UnoCard[];
  discard_pile: UnoCard[];
  current_color: string;
  draw_stack: number;
  winner_id: string | null;
  youtube_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UnoHandRow {
  id: string;
  room_id: string;
  player_id: string;
  cards: UnoCard[];
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createUnoRoom(
  playerName: string,
  playerId: string
): Promise<UnoRoomRow | null> {
  if (!supabase) return null;

  let roomCode = generateRoomCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data, error } = await supabase
      .from('uno_rooms')
      .insert({
        room_code: roomCode,
        host_id: playerId,
        status: 'waiting',
        players: [{ id: playerId, name: playerName, cardCount: 0 }],
        current_player_index: 0,
        direction: 1,
        deck: [],
        discard_pile: [],
        current_color: 'red',
        draw_stack: 0,
        winner_id: null,
      })
      .select()
      .single();

    if (!error && data) return data as UnoRoomRow;
    if (error?.code === '23505') {
      roomCode = generateRoomCode();
      attempts++;
    } else {
      console.error('Error creating UNO room:', error);
      return null;
    }
  }
  return null;
}

export async function joinUnoRoom(
  roomCode: string,
  playerName: string,
  playerId: string
): Promise<UnoRoomRow | null> {
  if (!supabase) return null;

  const { data: existing, error } = await supabase
    .from('uno_rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error || !existing) return null;

  const room = existing as UnoRoomRow;
  if (room.status !== 'waiting') return null;
  if (room.players.length >= 10) return null;
  if (room.players.find((p) => p.id === playerId)) return room;

  const updatedPlayers = [...room.players, { id: playerId, name: playerName, cardCount: 0 }];

  const { data, error: updateError } = await supabase
    .from('uno_rooms')
    .update({ players: updatedPlayers })
    .eq('room_code', roomCode.toUpperCase())
    .select()
    .single();

  if (updateError) return null;
  return data as UnoRoomRow;
}

export async function getUnoRoom(roomCode: string): Promise<UnoRoomRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('uno_rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) return null;
  return data as UnoRoomRow;
}

export async function startUnoGame(
  roomCode: string,
  roomId: string,
  players: UnoPlayer[]
): Promise<boolean> {
  if (!supabase) return false;

  const deck = shuffleDeck(createDeck());
  const hands: Record<string, UnoCard[]> = {};
  let deckIndex = 0;

  for (const player of players) {
    hands[player.id] = deck.slice(deckIndex, deckIndex + 7);
    deckIndex += 7;
  }

  let remaining = deck.slice(deckIndex);

  // First card on discard can't be wild
  let startIdx = remaining.findIndex((c) => c.color !== 'wild');
  if (startIdx === -1) startIdx = 0;
  const startCard = remaining[startIdx];
  remaining = [...remaining.slice(0, startIdx), ...remaining.slice(startIdx + 1)];

  // Upsert hands for all players
  for (const player of players) {
    const { error } = await supabase
      .from('uno_hands')
      .upsert(
        { room_id: roomId, player_id: player.id, cards: hands[player.id] },
        { onConflict: 'room_id,player_id' }
      );
    if (error) {
      console.error('Error setting hand:', error);
      return false;
    }
  }

  const updatedPlayers = players.map((p) => ({ ...p, cardCount: 7 }));
  let firstPlayerIndex = 0;
  let direction = 1;
  let drawStack = 0;

  if (startCard.value === 'skip') {
    firstPlayerIndex = 1 % players.length;
  } else if (startCard.value === 'reverse') {
    direction = -1;
    firstPlayerIndex = (players.length - 1 + players.length) % players.length;
  } else if (startCard.value === 'draw2') {
    drawStack = 2;
  }

  const { error } = await supabase
    .from('uno_rooms')
    .update({
      status: 'playing',
      players: updatedPlayers,
      deck: remaining,
      discard_pile: [startCard],
      current_color: startCard.color === 'wild' ? 'red' : startCard.color,
      current_player_index: firstPlayerIndex,
      direction,
      draw_stack: drawStack,
    })
    .eq('room_code', roomCode);

  return !error;
}

export async function updateUnoRoom(
  roomCode: string,
  updates: Partial<Omit<UnoRoomRow, 'id' | 'room_code' | 'created_at' | 'updated_at'>>
): Promise<UnoRoomRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('uno_rooms')
    .update(updates)
    .eq('room_code', roomCode)
    .select()
    .single();

  if (error) return null;
  return data as UnoRoomRow;
}

export async function getUnoHand(
  roomId: string,
  playerId: string
): Promise<UnoCard[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('uno_hands')
    .select('cards')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .single();

  if (error) return null;
  return (data as { cards: UnoCard[] }).cards;
}

export async function updateUnoHand(
  roomId: string,
  playerId: string,
  cards: UnoCard[]
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('uno_hands')
    .update({ cards })
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  return !error;
}

let activeRoomChannel: RealtimeChannel | null = null;
let activeHandChannel: RealtimeChannel | null = null;

export function subscribeToUnoRoom(
  roomCode: string,
  onUpdate: (room: UnoRoomRow) => void
): () => void {
  if (!supabase) return () => {};

  if (activeRoomChannel) {
    supabase.removeChannel(activeRoomChannel);
    activeRoomChannel = null;
  }

  const channel = supabase
    .channel(`uno_room:${roomCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'uno_rooms', filter: `room_code=eq.${roomCode}` },
      (payload) => { if (payload.new) onUpdate(payload.new as UnoRoomRow); }
    )
    .subscribe();

  activeRoomChannel = channel;

  return () => {
    if (supabase && activeRoomChannel) {
      supabase.removeChannel(activeRoomChannel);
      activeRoomChannel = null;
    }
  };
}

export function subscribeToUnoHand(
  roomId: string,
  playerId: string,
  onUpdate: (cards: UnoCard[]) => void
): () => void {
  if (!supabase) return () => {};

  if (activeHandChannel) {
    supabase.removeChannel(activeHandChannel);
    activeHandChannel = null;
  }

  const channel = supabase
    .channel(`uno_hand:${roomId}:${playerId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'uno_hands', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const row = payload.new as UnoHandRow;
        if (row && row.player_id === playerId) onUpdate(row.cards);
      }
    )
    .subscribe();

  activeHandChannel = channel;

  return () => {
    if (supabase && activeHandChannel) {
      supabase.removeChannel(activeHandChannel);
      activeHandChannel = null;
    }
  };
}
