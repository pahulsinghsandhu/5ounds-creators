ALTER TABLE producers ENABLE ROW LEVEL SECURITY;

CREATE POLICY producers_select_own ON producers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY producers_insert_own ON producers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY producers_update_own ON producers
  FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE producer_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY producer_tracks_select ON producer_tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM producers p
      WHERE p.id = producer_tracks.producer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY producer_tracks_insert ON producer_tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM producers p
      WHERE p.id = producer_tracks.producer_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY producer_tracks_update ON producer_tracks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM producers p
      WHERE p.id = producer_tracks.producer_id AND p.user_id = auth.uid()
    )
  );

ALTER TABLE producer_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY producer_versions_select ON producer_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM producer_tracks t
      JOIN producers p ON p.id = t.producer_id
      WHERE t.id = producer_versions.track_id AND p.user_id = auth.uid()
    )
  );

ALTER TABLE producer_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY producer_payouts_select ON producer_payouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM producers p
      WHERE p.id = producer_payouts.producer_id AND p.user_id = auth.uid()
    )
  );
