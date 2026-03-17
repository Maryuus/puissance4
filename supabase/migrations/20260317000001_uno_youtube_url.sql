-- Add youtube_url sync column to uno_rooms
ALTER TABLE public.uno_rooms
  ADD COLUMN IF NOT EXISTS youtube_url text DEFAULT '';
