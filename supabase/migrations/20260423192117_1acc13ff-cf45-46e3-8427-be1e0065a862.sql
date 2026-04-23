-- Per-contestant overtime opt-in & clock anchors for live contest sessions
ALTER TABLE public.contest_sessions
  ADD COLUMN IF NOT EXISTS champion_overtime_choice text,
  ADD COLUMN IF NOT EXISTS challenger_overtime_choice text,
  ADD COLUMN IF NOT EXISTS champion_overtime_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS champion_overtime_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS challenger_overtime_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS challenger_overtime_ended_at timestamptz;

ALTER TABLE public.contest_sessions
  DROP CONSTRAINT IF EXISTS contest_sessions_champion_overtime_choice_check;
ALTER TABLE public.contest_sessions
  ADD CONSTRAINT contest_sessions_champion_overtime_choice_check
  CHECK (champion_overtime_choice IS NULL OR champion_overtime_choice IN ('yes','no'));

ALTER TABLE public.contest_sessions
  DROP CONSTRAINT IF EXISTS contest_sessions_challenger_overtime_choice_check;
ALTER TABLE public.contest_sessions
  ADD CONSTRAINT contest_sessions_challenger_overtime_choice_check
  CHECK (challenger_overtime_choice IS NULL OR challenger_overtime_choice IN ('yes','no'));

-- Ensure realtime broadcasts full row state for overtime sync
ALTER TABLE public.contest_sessions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'contest_sessions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_sessions';
  END IF;
END $$;