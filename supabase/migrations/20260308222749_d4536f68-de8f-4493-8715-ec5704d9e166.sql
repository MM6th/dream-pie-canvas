WITH ranked_live AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY merchant_id
      ORDER BY updated_at DESC NULLS LAST, started_at DESC NULLS LAST, created_at DESC
    ) AS rn
  FROM public.live_streams
  WHERE status = 'live'
    AND ended_at IS NULL
)
UPDATE public.live_streams ls
SET
  status = 'ended',
  ended_at = now(),
  updated_at = now()
FROM ranked_live rl
WHERE ls.id = rl.id
  AND rl.rn > 1;