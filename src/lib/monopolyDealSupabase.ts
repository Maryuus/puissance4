import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  MDCard,
  MDPlayer,
  MDPendingAction,
  createMonopolyDealDeck,
  shuffleDeck,
} from './monopolyDealLogic';

export { isSupabaseConfigured };

export interface MDRoomRow {
  id: string;
  room_code: string;
  status: 'waiting' | 'playing' | 'finished';
  host_id: string;
  players: MDPlayer[];
  current_player_index: number;
  deck: MDCard[];
  discard_pile: MDCard[];
  cards_played_this_turn: number;
  turn_drawn: boolean;
  pending_action: MDPendingAction | null;
  winner_id: string | null;
  youtube_url: string;
  created_at: string;
  updated_at: string;
}

export interface MDHandRow {
  id: string;
  room_id: string;
  player_id: string;
  cards: MDCard[];
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function createMDRoom(
  playerName: string,
  playerId: string
): Promise<MDRoomRow | null> {
  if (!supabase) return null;

  const initialPlayer: MDPlayer = {
    id: playerId,
    name: playerName,
    bank: [],
    sets: {},
  };

  let roomCode = generateRoomCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data, error } = await supabase
      .from('monopoly_deal_rooms')
      .insert({
        room_code: roomCode,
        host_id: playerId,
        status: 'waiting',
        players: [initialPlayer],
        current_player_index: 0,
        deck: [],
        discard_pile: [],
        cards_played_this_turn: 0,
        turn_drawn: false,
        pending_action: null,
        winner_id: null,
        youtube_url: '',
      })
      .select()
      .single();

    if (!error && data) return data as MDRoomRow;
    if (error?.code === '23505') {
      roomCode = generateRoomCode();
      attempts++;
    } else {
      console.error('Error creating MD room:', error);
      return null;
    }
  }
  return null;
}

export async function joinMDRoom(
  roomCode: string,
  playerName: string,
  playerId: string
): Promise<MDRoomRow | null> {
  if (!supabase) return null;

  const { data: existing, error } = await supabase
    .from('monopoly_deal_rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error || !existing) return null;

  const room = existing as MDRoomRow;
  if (room.status !== 'waiting') return null;
  if (room.players.length >= 5) return null;
  if (room.players.find((p) => p.id === playerId)) return room;

  const newPlayer: MDPlayer = {
    id: playerId,
    name: playerName,
    bank: [],
    sets: {},
  };

  const updatedPlayers = [...room.players, newPlayer];

  const { data, error: updateError } = await supabase
    .from('monopoly_deal_rooms')
    .update({ players: updatedPlayers })
    .eq('room_code', roomCode.toUpperCase())
    .select()
    .single();

  if (updateError) return null;
  return data as MDRoomRow;
}

export async function getMDRoom(roomCode: string): Promise<MDRoomRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('monopoly_deal_rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();

  if (error) return null;
  return data as MDRoomRow;
}

export async function startMDGame(
  roomCode: string,
  roomId: string,
  players: MDPlayer[]
): Promise<boolean> {
  if (!supabase) return false;

  const deck = shuffleDeck(createMonopolyDealDeck());
  let deckIndex = 0;

  // Deal 5 cards to each player
  for (const player of players) {
    const hand = deck.slice(deckIndex, deckIndex + 5);
    deckIndex += 5;

    const { error } = await supabase
      .from('monopoly_deal_hands')
      .upsert(
        { room_id: roomId, player_id: player.id, cards: hand },
        { onConflict: 'room_id,player_id' }
      );
    if (error) {
      console.error('Error dealing hand:', error);
      return false;
    }
  }

  const remaining = deck.slice(deckIndex);

  // Reset player bank/sets for fresh start
  const freshPlayers = players.map((p) => ({ ...p, bank: [], sets: {} }));

  const { error } = await supabase
    .from('monopoly_deal_rooms')
    .update({
      status: 'playing',
      players: freshPlayers,
      deck: remaining,
      discard_pile: [],
      current_player_index: 0,
      cards_played_this_turn: 0,
      turn_drawn: false,
      pending_action: null,
      winner_id: null,
    })
    .eq('room_code', roomCode);

  return !error;
}

export async function updateMDRoom(
  roomCode: string,
  updates: Partial<Omit<MDRoomRow, 'id' | 'room_code' | 'created_at' | 'updated_at'>>
): Promise<MDRoomRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('monopoly_deal_rooms')
    .update(updates)
    .eq('room_code', roomCode)
    .select()
    .single();

  if (error) {
    console.error('Error updating MD room:', error);
    return null;
  }
  return data as MDRoomRow;
}

export async function getMDHand(
  roomId: string,
  playerId: string
): Promise<MDCard[] | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('monopoly_deal_hands')
    .select('cards')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .single();

  if (error) return null;
  return (data as { cards: MDCard[] }).cards;
}

export async function updateMDHand(
  roomId: string,
  playerId: string,
  cards: MDCard[]
): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('monopoly_deal_hands')
    .update({ cards })
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  return !error;
}

let activeMDRoomChannel: RealtimeChannel | null = null;
let activeMDHandChannel: RealtimeChannel | null = null;

export function subscribeToMDRoom(
  roomCode: string,
  onUpdate: (room: MDRoomRow) => void
): () => void {
  if (!supabase) return () => {};

  if (activeMDRoomChannel) {
    supabase.removeChannel(activeMDRoomChannel);
    activeMDRoomChannel = null;
  }

  const channel = supabase
    .channel(`md_room:${roomCode}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'monopoly_deal_rooms', filter: `room_code=eq.${roomCode}` },
      (payload) => { if (payload.new) onUpdate(payload.new as MDRoomRow); }
    )
    .subscribe();

  activeMDRoomChannel = channel;

  return () => {
    if (supabase && activeMDRoomChannel) {
      supabase.removeChannel(activeMDRoomChannel);
      activeMDRoomChannel = null;
    }
  };
}

export function subscribeToMDHand(
  roomId: string,
  playerId: string,
  onUpdate: (cards: MDCard[]) => void
): () => void {
  if (!supabase) return () => {};

  if (activeMDHandChannel) {
    supabase.removeChannel(activeMDHandChannel);
    activeMDHandChannel = null;
  }

  const channel = supabase
    .channel(`md_hand:${roomId}:${playerId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'monopoly_deal_hands', filter: `room_id=eq.${roomId}` },
      (payload) => {
        const row = payload.new as MDHandRow;
        if (row && row.player_id === playerId) onUpdate(row.cards);
      }
    )
    .subscribe();

  activeMDHandChannel = channel;

  return () => {
    if (supabase && activeMDHandChannel) {
      supabase.removeChannel(activeMDHandChannel);
      activeMDHandChannel = null;
    }
  };
}
