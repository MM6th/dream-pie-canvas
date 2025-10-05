-- Create album_tracks junction table
CREATE TABLE album_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  audio_product_id UUID REFERENCES audio_products(id) ON DELETE CASCADE NOT NULL,
  track_number INTEGER NOT NULL,
  featuring_artist_name TEXT,
  featuring_artist_paypal TEXT,
  featuring_artist_user_id UUID REFERENCES profiles(id),
  featuring_percentage NUMERIC DEFAULT 30.0 CHECK (featuring_percentage >= 10 AND featuring_percentage <= 50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, track_number),
  UNIQUE(album_id, audio_product_id)
);

-- Enable RLS
ALTER TABLE album_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view album tracks"
  ON album_tracks FOR SELECT
  USING (true);

CREATE POLICY "Main artist can manage their album tracks"
  ON album_tracks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM albums
      WHERE albums.id = album_tracks.album_id
      AND albums.merchant_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_album_tracks_updated_at
  BEFORE UPDATE ON album_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_birth_data_timestamp();

-- Create revenue distribution function
CREATE OR REPLACE FUNCTION distribute_featuring_artist_revenue(
  p_purchase_id UUID,
  p_audio_product_id UUID,
  p_total_net_revenue NUMERIC,
  p_album_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track_record RECORD;
  v_main_artist_id UUID;
  v_main_artist_share NUMERIC;
  v_featuring_artist_share NUMERIC;
  v_per_track_value NUMERIC;
  v_track_count INTEGER;
BEGIN
  -- Get main artist
  SELECT merchant_id INTO v_main_artist_id
  FROM audio_products
  WHERE id = p_audio_product_id;

  -- Check if this is an album purchase
  IF p_album_id IS NOT NULL THEN
    -- Calculate per-track value for album purchase
    SELECT COUNT(*) INTO v_track_count
    FROM album_tracks
    WHERE album_id = p_album_id;

    v_per_track_value := p_total_net_revenue / v_track_count;

    -- Distribute for each track in album
    FOR v_track_record IN
      SELECT * FROM album_tracks
      WHERE album_id = p_album_id
      ORDER BY track_number
    LOOP
      IF v_track_record.featuring_artist_user_id IS NOT NULL THEN
        -- Calculate split
        v_featuring_artist_share := v_per_track_value * (v_track_record.featuring_percentage / 100);
        v_main_artist_share := v_per_track_value - v_featuring_artist_share;

        -- Update quarterly income for main artist
        PERFORM update_quarterly_income(
          v_main_artist_id,
          'merchant_revenue',
          v_main_artist_share
        );

        -- Update quarterly income for featuring artist
        PERFORM update_quarterly_income(
          v_track_record.featuring_artist_user_id,
          'featuring_revenue',
          v_featuring_artist_share
        );
      ELSE
        -- No featuring artist, all goes to main artist
        PERFORM update_quarterly_income(
          v_main_artist_id,
          'merchant_revenue',
          v_per_track_value
        );
      END IF;
    END LOOP;

  ELSE
    -- Single track purchase
    SELECT * INTO v_track_record
    FROM album_tracks
    WHERE audio_product_id = p_audio_product_id
    LIMIT 1;

    IF v_track_record.featuring_artist_user_id IS NOT NULL THEN
      -- Calculate split
      v_featuring_artist_share := p_total_net_revenue * (v_track_record.featuring_percentage / 100);
      v_main_artist_share := p_total_net_revenue - v_featuring_artist_share;

      -- Update quarterly income for main artist
      PERFORM update_quarterly_income(
        v_main_artist_id,
        'merchant_revenue',
        v_main_artist_share
      );

      -- Update quarterly income for featuring artist
      PERFORM update_quarterly_income(
        v_track_record.featuring_artist_user_id,
        'featuring_revenue',
        v_featuring_artist_share
      );
    ELSE
      -- No featuring artist, all goes to main artist
      PERFORM update_quarterly_income(
        v_main_artist_id,
        'merchant_revenue',
        p_total_net_revenue
      );
    END IF;
  END IF;
END;
$$;