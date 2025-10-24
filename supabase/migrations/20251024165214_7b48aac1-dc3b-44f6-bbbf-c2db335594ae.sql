-- First, restore original singles by removing album_id (this removes the foreign key reference)
UPDATE audio_products 
SET album_id = NULL 
WHERE id IN (
  '119f6b35-cf25-47c1-af76-885fb0e37b81', -- Cake
  '9b4c1a4b-aecc-4d35-9571-9c05e9c7e969', -- Freak
  '0ca285cc-2e60-41c9-ba30-3f0110bd8cf0', -- 2 Good 4 U
  '70c4e22f-dbb4-42e4-bef6-ec763bf17127', -- Catch 22
  '519f1a92-4830-42a6-8167-a7656a33c013', -- Goals
  '914a1db4-2d4c-41e0-877e-b71259add381', -- Oddity
  '460b3ecf-dd89-40d6-8461-3540e44a37a6', -- Aries Season
  'fd59d470-3c51-4167-b9b1-a2b253d81fee', -- Bullish
  '911ac847-c0fa-4afb-8b58-d5f83718ef68', -- Butt Holder
  '59a72008-5bcf-4c3f-a07e-38da4da29b20', -- Fuck Holes
  'a9708026-b666-40d3-8889-eaeb7a44b4fb', -- Green Skin
  'e8ad7a55-deff-482b-a076-a516fc134ed5', -- Humititties
  '73431c2a-26ee-41e4-8021-6fd9fc44c2cb', -- Letting You In
  'da8ddf1b-eae0-4e1c-8f88-8eae2f897b72', -- Plump Buns
  '9d2a3f5b-54b9-4f9a-a63b-3059a8ca9be5', -- Rose Colored Rain
  '36cc19ab-d27f-48e8-ba86-3ea436743fc6'  -- Terrified
);

-- Now delete album tracks for the old duplicate album
DELETE FROM album_tracks WHERE album_id = 'e6965355-60bd-4a71-b49b-90957d4d0ab3';

-- Finally, delete the old duplicate Forward Thinking album
DELETE FROM albums WHERE id = 'e6965355-60bd-4a71-b49b-90957d4d0ab3';