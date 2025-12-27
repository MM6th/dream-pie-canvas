-- Delete the Confessional film and its related purchases
DELETE FROM film_purchases WHERE film_product_id = '4a7ed870-4eab-4f0d-8019-8cdbbc1662e8';
DELETE FROM film_products WHERE id = '4a7ed870-4eab-4f0d-8019-8cdbbc1662e8';