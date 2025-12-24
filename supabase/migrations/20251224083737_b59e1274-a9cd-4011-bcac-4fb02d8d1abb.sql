-- Update the duration for the existing recording (38 minutes = 2280 seconds)
UPDATE podcast_recordings 
SET duration_seconds = 2280 
WHERE id = 'a6b54e32-eac8-4adf-b5cd-d6f24f169c4a';