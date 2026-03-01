
-- Create sequential token ID sequence
CREATE SEQUENCE IF NOT EXISTS audio_nft_token_id_seq;

-- Create audio_nfts registry table
CREATE TABLE public.audio_nfts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_product_id UUID NOT NULL UNIQUE REFERENCES public.audio_products(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles(id),
  minted_by UUID NOT NULL REFERENCES public.profiles(id),
  token_id INTEGER NOT NULL UNIQUE DEFAULT nextval('audio_nft_token_id_seq'),
  minted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sixth_value_at_mint NUMERIC NOT NULL DEFAULT 0.00001,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_nfts ENABLE ROW LEVEL SECURITY;

-- Everyone can read NFTs
CREATE POLICY "Anyone can read audio_nfts"
  ON public.audio_nfts FOR SELECT
  TO authenticated
  USING (true);

-- Allow public (anon) reads too for profile pages
CREATE POLICY "Public can read audio_nfts"
  ON public.audio_nfts FOR SELECT
  TO anon
  USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_audio_nfts_timestamp()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_audio_nfts_updated_at
  BEFORE UPDATE ON public.audio_nfts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_audio_nfts_timestamp();

-- Auto-mint NFT trigger function
CREATE OR REPLACE FUNCTION public.auto_mint_audio_nft()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_initial_price NUMERIC := 0.00001;
  v_target_price NUMERIC := 0.01;
  v_liquidity_pool_size BIGINT := 10780000;
  v_k NUMERIC;
  v_current_supply BIGINT;
  v_spot_price NUMERIC;
BEGIN
  -- Only mint if published with thumbnail
  IF NEW.status = 'published' AND NEW.thumbnail_url IS NOT NULL THEN
    -- Don't mint if already exists
    IF EXISTS (SELECT 1 FROM public.audio_nfts WHERE audio_product_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Calculate current spot price from bonding curve
    v_k := ln(v_target_price / v_initial_price) / v_liquidity_pool_size;
    SELECT COALESCE(SUM(balance), 0) INTO v_current_supply FROM public.token_balances;
    v_spot_price := v_initial_price * exp(v_k * v_current_supply);

    INSERT INTO public.audio_nfts (
      audio_product_id, owner_id, minted_by, sixth_value_at_mint, metadata
    ) VALUES (
      NEW.id,
      NEW.merchant_id,
      NEW.merchant_id,
      v_spot_price,
      jsonb_build_object(
        'title', NEW.title,
        'artist', COALESCE(NEW.artist_name, ''),
        'thumbnail_url', NEW.thumbnail_url,
        'audio_type', NEW.audio_type
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on INSERT
CREATE TRIGGER auto_mint_nft_on_insert
  AFTER INSERT ON public.audio_products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_mint_audio_nft();

-- Trigger on UPDATE (for when thumbnail is added later or status changes to published)
CREATE TRIGGER auto_mint_nft_on_update
  AFTER UPDATE ON public.audio_products
  FOR EACH ROW
  WHEN (
    (OLD.status IS DISTINCT FROM NEW.status OR OLD.thumbnail_url IS DISTINCT FROM NEW.thumbnail_url)
  )
  EXECUTE FUNCTION public.auto_mint_audio_nft();

-- Backfill existing published audio products with thumbnails
INSERT INTO public.audio_nfts (audio_product_id, owner_id, minted_by, sixth_value_at_mint, metadata)
SELECT 
  ap.id,
  ap.merchant_id,
  ap.merchant_id,
  0.00001,
  jsonb_build_object(
    'title', ap.title,
    'artist', COALESCE(ap.artist_name, ''),
    'thumbnail_url', ap.thumbnail_url,
    'audio_type', ap.audio_type
  )
FROM public.audio_products ap
WHERE ap.status = 'published'
  AND ap.thumbnail_url IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.audio_nfts WHERE audio_product_id = ap.id);
