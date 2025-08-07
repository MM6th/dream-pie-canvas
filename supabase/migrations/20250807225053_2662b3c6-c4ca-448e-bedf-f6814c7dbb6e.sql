
-- 1) Add artist_name to video ad opportunities
ALTER TABLE public.video_ad_opportunities
ADD COLUMN IF NOT EXISTS artist_name text;

-- 2) Update the trigger function to carry artist_name to audio_products
CREATE OR REPLACE FUNCTION public.ensure_video_ad_audio_and_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_title text;
  v_audio_url text;
  v_audio_type public.audio_type_enum;
  v_artist_name text;
  v_audio_product_id uuid;
begin
  -- Get the opportunity details (now including artist_name)
  select title, audio_file_url, audio_type, artist_name
    into v_title, v_audio_url, v_audio_type, v_artist_name
  from public.video_ad_opportunities
  where id = NEW.video_ad_opportunity_id;

  if v_audio_url is null then
    return NEW;
  end if;

  -- Find or create the audio product for this merchant + audio URL
  select id
    into v_audio_product_id
  from public.audio_products
  where merchant_id = NEW.merchant_id
    and audio_file_url = v_audio_url
  limit 1;

  if v_audio_product_id is null then
    insert into public.audio_products
      (merchant_id, title, artist_name, audio_file_url, audio_type, access_level, is_free, is_adult_content, created_at, updated_at)
    values
      (NEW.merchant_id, coalesce(v_title, 'Video Ad Audio'), v_artist_name, v_audio_url, v_audio_type::text, 'merchant_only', true, false, now(), now())
    returning id into v_audio_product_id;
  else
    -- If product already exists but artist_name is empty, update it
    update public.audio_products
       set artist_name = coalesce(artist_name, v_artist_name),
           updated_at = now()
     where id = v_audio_product_id
       and (artist_name is null or artist_name = '');
  end if;

  -- Ensure a user_purchases record exists
  if not exists (
    select 1 from public.user_purchases
    where user_id = NEW.merchant_id
      and audio_product_id = v_audio_product_id
  ) then
    insert into public.user_purchases
      (user_id, audio_product_id, is_free_download, amount_paid, created_at, purchase_date)
    values
      (NEW.merchant_id, v_audio_product_id, true, 0, now(), now());
  end if;

  return NEW;
end;
$function$;

-- 3) Backfill artist_name on existing audio products created from video ad downloads
-- Matches by merchant_id + audio_file_url to reduce accidental cross-matching
UPDATE public.audio_products ap
SET artist_name = vao.artist_name,
    updated_at = now()
FROM public.video_ad_downloads vad
JOIN public.video_ad_opportunities vao ON vao.id = vad.video_ad_opportunity_id
WHERE ap.merchant_id = vad.merchant_id
  AND ap.audio_file_url = vao.audio_file_url
  AND (ap.artist_name IS NULL OR ap.artist_name = '');
