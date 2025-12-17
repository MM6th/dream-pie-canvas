-- Fix portfolio video mute state for already-published media
update public.portfolio_images
set is_video_muted = true
where id = 'fffe0a2b-6b57-46da-8e51-10c643b6e785'
  and portfolio_id in (
    select id from public.portfolios
    where user_id = '4516ab9a-6452-4cfe-96e0-32f3d3eeb77c'
  );
