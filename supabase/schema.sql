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
