-- Delete the film and reset publishing status
DELETE FROM film_products WHERE id = '02f6b47e-0ce9-4e10-a012-893538599fc2';

-- Reset publishing lock for testing
UPDATE profiles 
SET can_publish_film = true, 
    active_film_id = NULL, 
    current_film_sales = 0,
    free_films_published = 0
WHERE id = 'cedd3262-be80-4af4-9675-c081107cecb5';