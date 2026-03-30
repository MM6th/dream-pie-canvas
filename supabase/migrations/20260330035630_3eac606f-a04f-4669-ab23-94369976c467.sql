-- Delete all music-related data
-- 1. Delete audio NFTs for music products
DELETE FROM public.audio_nfts WHERE audio_product_id IN (SELECT id FROM public.audio_products WHERE audio_type = 'music');

-- 2. Delete user purchases for music products
DELETE FROM public.user_purchases WHERE audio_product_id IN (SELECT id FROM public.audio_products WHERE audio_type = 'music');

-- 3. Delete user playlists for music products
DELETE FROM public.user_playlists WHERE audio_product_id IN (SELECT id FROM public.audio_products WHERE audio_type = 'music');

-- 4. Delete song cover submissions for music products
DELETE FROM public.song_cover_submissions WHERE audio_product_id IN (SELECT id FROM public.audio_products WHERE audio_type = 'music');

-- 5. Delete album tracks
DELETE FROM public.album_tracks;

-- 6. Clear album preview track references
UPDATE public.albums SET preview_track_id = NULL;

-- 7. Clear album_id on ALL audio_products (including non-music that may reference albums)
UPDATE public.audio_products SET album_id = NULL WHERE album_id IS NOT NULL;

-- 8. Delete all music audio products
DELETE FROM public.audio_products WHERE audio_type = 'music';

-- 9. Delete all albums (now safe)
DELETE FROM public.albums;