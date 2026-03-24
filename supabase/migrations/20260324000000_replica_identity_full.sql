-- Fix: Supabase Realtime only sends changed columns when REPLICA IDENTITY is DEFAULT.
-- With FULL, every UPDATE event includes the complete row in payload.new,
-- preventing partial-update bugs where missing columns default to null on the client.

ALTER TABLE public.monopoly_deal_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.monopoly_deal_hands REPLICA IDENTITY FULL;
ALTER TABLE public.uno_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.uno_hands REPLICA IDENTITY FULL;
ALTER TABLE public.games REPLICA IDENTITY FULL;
