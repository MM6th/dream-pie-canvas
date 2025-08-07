
-- 1) Function to ensure an audio product and a user purchase exist for each video ad download
create or replace function public.ensure_video_ad_audio_and_purchase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_audio_url text;
  v_audio_type public.audio_type_enum;
  v_audio_product_id uuid;
begin
  -- Get the opportunity details
  select title, audio_file_url, audio_type
    into v_title, v_audio_url, v_audio_type
  from public.video_ad_opportunities
  where id = NEW.video_ad_opportunity_id;

  if v_audio_url is null then
    return NEW;
  end if;

  -- Find or create the audio product for this merchant and audio URL
  select id
    into v_audio_product_id
  from public.audio_products
  where merchant_id = NEW.merchant_id
    and audio_file_url = v_audio_url
  limit 1;

  if v_audio_product_id is null then
    insert into public.audio_products
      (merchant_id, title, audio_file_url, audio_type, access_level, is_free, is_adult_content, created_at, updated_at)
    values
      (NEW.merchant_id, coalesce(v_title, 'Video Ad Audio'), v_audio_url, v_audio_type::text, 'merchant_only', true, false, now(), now())
    returning id into v_audio_product_id;
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
$$;

-- 2) Trigger on video_ad_downloads (AFTER INSERT)
drop trigger if exists trg_ensure_video_ad_audio_and_purchase on public.video_ad_downloads;

create trigger trg_ensure_video_ad_audio_and_purchase
after insert on public.video_ad_downloads
for each row
execute function public.ensure_video_ad_audio_and_purchase();

-- 3) Backfill existing downloads to ensure audio_products exist
insert into public.audio_products (merchant_id, title, audio_file_url, audio_type, access_level, is_free, is_adult_content, created_at, updated_at)
select d.merchant_id,
       coalesce(o.title, 'Video Ad Audio'),
       o.audio_file_url,
       o.audio_type::text,
       'merchant_only',
       true,
       false,
       now(),
       now()
from public.video_ad_downloads d
join public.video_ad_opportunities o on o.id = d.video_ad_opportunity_id
left join public.audio_products ap on ap.merchant_id = d.merchant_id
                                   and ap.audio_file_url = o.audio_file_url
where ap.id is null;

-- 4) Backfill user_purchases for those audio products
insert into public.user_purchases (user_id, audio_product_id, is_free_download, amount_paid, created_at, purchase_date)
select d.merchant_id,
       ap.id,
       true,
       0,
       now(),
       now()
from public.video_ad_downloads d
join public.video_ad_opportunities o on o.id = d.video_ad_opportunity_id
join public.audio_products ap on ap.merchant_id = d.merchant_id
                              and ap.audio_file_url = o.audio_file_url
left join public.user_purchases up on up.user_id = d.merchant_id
                                  and up.audio_product_id = ap.id
where up.id is null;
