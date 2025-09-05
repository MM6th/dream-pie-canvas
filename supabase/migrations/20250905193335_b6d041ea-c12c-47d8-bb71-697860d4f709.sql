-- Add foreign key constraint to user_playlists table
ALTER TABLE public.user_playlists 
ADD CONSTRAINT fk_user_playlists_audio_product 
FOREIGN KEY (audio_product_id) REFERENCES public.audio_products(id) ON DELETE CASCADE;