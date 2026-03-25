-- Add youtube_url sync column to games (Puissance 4)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT '';
