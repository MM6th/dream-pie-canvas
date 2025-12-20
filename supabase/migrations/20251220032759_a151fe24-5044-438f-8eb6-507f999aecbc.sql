-- Delete the album tracks first (foreign key constraint)
DELETE FROM album_tracks WHERE album_id = '7fb1474d-4fc5-4bd1-822c-e226f6972c38';

-- Delete the audio products
DELETE FROM audio_products WHERE album_id = '7fb1474d-4fc5-4bd1-822c-e226f6972c38';

-- Delete the album
DELETE FROM albums WHERE id = '7fb1474d-4fc5-4bd1-822c-e226f6972c38';