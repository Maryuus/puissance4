import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  MDCard, MDPlayer, MDPendingAction,
  createMonopolyDealDeck, shuffleDeck,
} from './monopolyDealLogic';

export { isSupabaseConfigured };

// ─── Row types ────────────────────────────────────────────────────────────────

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
  youtube_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MDHandRow {
  room_id: string;
  player_id: string;
  cards: MDCard[];
}

// ─── Room CRUD ────────────────────────────────────────────────────────────────

function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export async function createMDRoom(playerName: string, playerId: string): Promise<MDRoomRow | null> {
  if (!supabase) return null;
  const player: MDPlayer = { id: playerId, name: playerName, bank: [], sets: {} };
  let code = genCode();
  for (let i = 0; i < 10; i++) {
    const { data, error } = await supabase
      .from('monopoly_deal_rooms')
      .insert({
        room_code: code, host_id: playerId, status: 'waiting',
        players: [player], current_player_index: 0,
        deck: [], discard_pile: [], cards_played_this_turn: 0,
        turn_drawn: false, pending_action: null, winner_id: null, youtube_url: '',
      })
      .select().single();
    if (!error && data) return data as MDRoomRow;
    if (error?.code === '23505') { code = genCode(); continue; }
    console.error('createMDRoom:', error);
    return null;
  }
  return null;
}

export async function joinMDRoom(roomCode: string, playerName: string, playerId: string): Promise<MDRoomRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('monopoly_deal_rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();
  if (error || !data) return null;
  const room = data as MDRoomRow;
  // Allow reconnecting to any room the player is already in
  if (room.players.find((p) => p.id === playerId)) return room;
  if (room.status !== 'waiting') return null;
  if (room.players.length >= 5) return null;
  const updated = [...room.players, { id: playerId, name: playerName, bank: [], sets: {} }];
  const { data: d2, error: e2 } = await supabase
    .from('monopoly_deal_rooms')
    .update({ players: updated })
    .eq('room_code', roomCode.toUpperCase())
    .select().single();
  if (e2) return null;
  return d2 as MDRoomRow;
}

export async function getMDRoom(roomCode: string): Promise<MDRoomRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('monopoly_deal_rooms')
    .select()
    .eq('room_code', roomCode.toUpperCase())
    .single();
  return error ? null : data as MDRoomRow;
}

export async function updateMDRoom(
  roomCode: string,
  updates: Partial<Omit<MDRoomRow, 'id' | 'room_code' | 'created_at' | 'updated_at'>>,
): Promise<MDRoomRow | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('monopoly_deal_rooms')
    .update(updates)
    .eq('room_code', roomCode)
    .select().single();
  if (error) { console.error('updateMDRoom:', error); return null; }
  return data as MDRoomRow;
}

export async function startMDGame(roomCode: string, roomId: string, players: MDPlayer[]): Promise<boolean> {
  if (!supabase) return false;
  // Create empty hand rows
  for (const p of players) {
    const { error } = await supabase
      .from('monopoly_deal_hands')
      .upsert({ room_id: roomId, player_id: p.id, cards: [] }, { onConflict: 'room_id,player_id' });
    if (error) return false;
  }
  const deck = shuffleDeck(createMonopolyDealDeck());
  const freshPlayers = players.map((p) => ({ ...p, bank: [], sets: {} }));
  const { error } = await supabase
    .from('monopoly_deal_rooms')
    .update({
      status: 'playing', players: freshPlayers, deck,
      discard_pile: [], current_player_index: 0,
      cards_played_this_turn: 0, turn_drawn: false,
      pending_action: null, winner_id: null,
    })
    .eq('room_code', roomCode);
  return !error;
}

// ─── Hand CRUD ────────────────────────────────────────────────────────────────

export async function getMDHand(roomId: string, playerId: string): Promise<MDCard[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('monopoly_deal_hands')
    .select('cards')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .single();
  if (error) return null;
  return (data as { cards: MDCard[] }).cards ?? [];
}

export async function updateMDHand(roomId: string, playerId: string, cards: MDCard[]): Promise<boolean> {
  if (!supabase) return false;
  const { error } = await supabase
    .from('monopoly_deal_hands')
    .update({ cards })
    .eq('room_id', roomId)
    .eq('player_id', playerId);
  return !error;
}

// ─── Realtime ─────────────────────────────────────────────────────────────────

let roomChannel: RealtimeChannel | null = null;
let handChannel: RealtimeChannel | null = null;

export function subscribeToMDRoom(roomCode: string, onUpdate: (r: MDRoomRow) => void): () => void {
  if (!supabase) return () => {};
  if (roomChannel) { supabase.removeChannel(roomChannel); roomChannel = null; }
  roomChannel = supabase
    .channel(`md_room:${roomCode}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'monopoly_deal_rooms',
      filter: `room_code=eq.${roomCode}`,
    }, (payload) => { if (payload.new) onUpdate(payload.new as MDRoomRow); })
    .subscribe();
  return () => { if (supabase && roomChannel) { supabase.removeChannel(roomChannel); roomChannel = null; } };
}

export function subscribeToMDHand(roomId: string, playerId: string, onUpdate: (cards: MDCard[]) => void): () => void {
  if (!supabase) return () => {};
  if (handChannel) { supabase.removeChannel(handChannel); handChannel = null; }
  handChannel = supabase
    .channel(`md_hand:${roomId}:${playerId}`)
    .on('postgres_changes', {
      event: '*', schema: 'public', table: 'monopoly_deal_hands',
      filter: `room_id=eq.${roomId}`,
    }, (payload) => {
      const row = payload.new as MDHandRow;
      if (row?.player_id === playerId) onUpdate(row.cards ?? []);
    })
    .subscribe();
  return () => { if (supabase && handChannel) { supabase.removeChannel(handChannel); handChannel = null; } };
}
