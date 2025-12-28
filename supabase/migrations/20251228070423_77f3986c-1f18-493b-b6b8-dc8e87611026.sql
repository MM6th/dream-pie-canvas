-- Disable the bypass lock for the admin
UPDATE profiles 
SET disable_film_publish_lock = false
WHERE id = 'cedd3262-be80-4af4-9675-c081107cecb5';

-- Lock "The Confessional" as the active film
UPDATE profiles 
SET active_film_id = '815b0917-9029-4766-8ed2-e102396b3417',
    can_publish_film = false,
    current_film_sales = 0
WHERE id = 'cedd3262-be80-4af4-9675-c081107cecb5';