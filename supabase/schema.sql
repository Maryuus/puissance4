-- Puissance 4 - Supabase Schema
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  board JSONB NOT NULL,
  current_player INTEGER NOT NULL DEFAULT 1,
  player1_name TEXT NOT NULL DEFAULT 'Player 1',
  player2_name TEXT NOT NULL DEFAULT 'Player 2',
  player1_score INTEGER NOT NULL DEFAULT 0,
  player2_score INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'waiting',
  winner INTEGER,
  next_first_player INTEGER NOT NULL DEFAULT 1,
  winning_cells JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for demo purposes)
CREATE POLICY "Allow all" ON public.games FOR ALL USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Enable Realtime for the games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- ============================================================
-- UNO TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.uno_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',        -- waiting | playing | finished
  host_id TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]',           -- [{id, name, cardCount}]
  current_player_index INTEGER NOT NULL DEFAULT 0,
  direction INTEGER NOT NULL DEFAULT 1,          -- 1 or -1
  deck JSONB NOT NULL DEFAULT '[]',              -- remaining draw pile
  discard_pile JSONB NOT NULL DEFAULT '[]',      -- played cards (top = last)
  current_color TEXT NOT NULL DEFAULT 'red',     -- active color (for wilds)
  draw_stack INTEGER NOT NULL DEFAULT 0,         -- pending forced draw count
  winner_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.uno_hands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.uno_rooms(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  cards JSONB NOT NULL DEFAULT '[]',
  UNIQUE(room_id, player_id)
);

ALTER TABLE public.uno_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uno_hands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all uno_rooms" ON public.uno_rooms FOR ALL USING (true);
CREATE POLICY "Allow all uno_hands" ON public.uno_hands FOR ALL USING (true);

CREATE OR REPLACE FUNCTION update_uno_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_uno_rooms_updated_at
  BEFORE UPDATE ON public.uno_rooms
  FOR EACH ROW
  EXECUTE PROCEDURE update_uno_rooms_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.uno_hands;
