-- Fix artist name spelling for Kinetic and G Wagon tracks
UPDATE public.audio_products 
SET artist_name = 'Benjiman6th'
WHERE id IN (
  'b84a8f7b-e522-4a27-8e97-accfb760ec82',  -- G Wagon
  '5b95a38d-d1dc-46af-a95e-ede91b9ac175'   -- Kinetic
);