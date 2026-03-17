-- Monopoly Deal Tables
-- Migration: 20260317000000_monopoly_deal.sql

CREATE TABLE IF NOT EXISTS public.monopoly_deal_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  host_id TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]',
  current_player_index INTEGER NOT NULL DEFAULT 0,
  deck JSONB NOT NULL DEFAULT '[]',
  discard_pile JSONB NOT NULL DEFAULT '[]',
  cards_played_this_turn INTEGER NOT NULL DEFAULT 0,
  turn_drawn BOOLEAN NOT NULL DEFAULT false,
  pending_action JSONB DEFAULT NULL,
  winner_id TEXT DEFAULT NULL,
  youtube_url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.monopoly_deal_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.monopoly_deal_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]',
  UNIQUE(room_id, player_id)
);

ALTER TABLE public.monopoly_deal_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monopoly_deal_hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all md_rooms" ON public.monopoly_deal_rooms FOR ALL USING (true);
CREATE POLICY "Allow all md_hands" ON public.monopoly_deal_hands FOR ALL USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_monopoly_deal_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_monopoly_deal_rooms_updated_at
  BEFORE UPDATE ON public.monopoly_deal_rooms
  FOR EACH ROW
  EXECUTE PROCEDURE update_monopoly_deal_rooms_updated_at();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_deal_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.monopoly_deal_hands;
