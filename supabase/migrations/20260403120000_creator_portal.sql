-- Creator portal schema (run in Supabase SQL editor or via CLI)

CREATE TABLE IF NOT EXISTS producers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id),
  name text NOT NULL,
  real_name text NOT NULL,
  country text NOT NULL,
  pro_affiliation text,
  status text DEFAULT 'pending',
  stripe_account_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS producer_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid REFERENCES producers (id),
  title text NOT NULL,
  file_url text,
  status text DEFAULT 'processing',
  quality_score int,
  vocal_detection_result jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS producer_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id uuid REFERENCES producer_tracks (id),
  scene_slug text NOT NULL,
  hz_value int,
  status text DEFAULT 'processing',
  quality_score int,
  stream_count int DEFAULT 0
);

CREATE TABLE IF NOT EXISTS producer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid REFERENCES producers (id),
  amount decimal(10, 2),
  period_start date,
  period_end date,
  stripe_payout_id text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);
