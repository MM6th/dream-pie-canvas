-- Add preview_track_id to albums table to specify which track's preview to use for the album card
ALTER TABLE public.albums 
ADD COLUMN preview_track_id uuid REFERENCES public.audio_products(id) ON DELETE SET NULL;