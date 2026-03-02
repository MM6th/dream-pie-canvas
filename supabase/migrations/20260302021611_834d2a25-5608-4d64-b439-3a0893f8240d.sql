
-- Update auto_mint_audio_nft to skip merchant_only products
CREATE OR REPLACE FUNCTION public.auto_mint_audio_nft()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Skip merchant_only products - they mint after contract approval
    IF NEW.access_level = 'merchant_only' THEN
      RETURN NEW;
    END IF;

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
$function$;

-- Update contract approval function to also mint NFT for merchant_only products
CREATE OR REPLACE FUNCTION public.update_audio_product_on_contract_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_audio_product_id UUID;
  v_audio_product RECORD;
  v_initial_price NUMERIC := 0.00001;
  v_target_price NUMERIC := 0.01;
  v_liquidity_pool_size BIGINT := 10780000;
  v_k NUMERIC;
  v_current_supply BIGINT;
  v_spot_price NUMERIC;
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.cover_submission_id IS NOT NULL THEN
    -- Get the audio product id from the cover submission
    SELECT audio_product_id INTO v_audio_product_id
    FROM public.song_cover_submissions
    WHERE id = NEW.cover_submission_id;

    -- Update access level
    UPDATE public.audio_products 
    SET access_level = CASE 
      WHEN is_free = true THEN 'public'::access_level
      ELSE 'paid'::access_level
    END,
    updated_at = NOW()
    WHERE id = v_audio_product_id;

    -- Now mint the NFT for this product if it doesn't already exist
    SELECT * INTO v_audio_product
    FROM public.audio_products
    WHERE id = v_audio_product_id;

    IF v_audio_product.status = 'published' 
       AND v_audio_product.thumbnail_url IS NOT NULL 
       AND NOT EXISTS (SELECT 1 FROM public.audio_nfts WHERE audio_product_id = v_audio_product_id) THEN
      
      v_k := ln(v_target_price / v_initial_price) / v_liquidity_pool_size;
      SELECT COALESCE(SUM(balance), 0) INTO v_current_supply FROM public.token_balances;
      v_spot_price := v_initial_price * exp(v_k * v_current_supply);

      INSERT INTO public.audio_nfts (
        audio_product_id, owner_id, minted_by, sixth_value_at_mint, metadata
      ) VALUES (
        v_audio_product_id,
        v_audio_product.merchant_id,
        v_audio_product.merchant_id,
        v_spot_price,
        jsonb_build_object(
          'title', v_audio_product.title,
          'artist', COALESCE(v_audio_product.artist_name, ''),
          'thumbnail_url', v_audio_product.thumbnail_url,
          'audio_type', v_audio_product.audio_type
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
