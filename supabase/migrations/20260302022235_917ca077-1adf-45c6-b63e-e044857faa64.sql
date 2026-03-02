
-- Delete NFTs that were incorrectly minted for merchant_only audio products
DELETE FROM public.audio_nfts
WHERE audio_product_id IN (
  SELECT id FROM public.audio_products WHERE access_level = 'merchant_only'
);
