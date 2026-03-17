-- UNO rooms
CREATE TABLE IF NOT EXISTS public.uno_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  host_id TEXT NOT NULL,
  players JSONB NOT NULL DEFAULT '[]',
  current_player_index INTEGER NOT NULL DEFAULT 0,
  direction INTEGER NOT NULL DEFAULT 1,
  deck JSONB NOT NULL DEFAULT '[]',
  discard_pile JSONB NOT NULL DEFAULT '[]',
  current_color TEXT NOT NULL DEFAULT 'red',
  draw_stack INTEGER NOT NULL DEFAULT 0,
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
