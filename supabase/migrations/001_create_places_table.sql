-- Create places table for TokTrip Planner
-- This table stores travel video locations and AI-extracted data

CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'demo-user',
  video_url TEXT NOT NULL,
  video_path TEXT NOT NULL,
  place_name TEXT,
  address_search_query TEXT,
  category TEXT CHECK (category IN ('Food', 'Activity', 'Stay')),
  vibe_keywords TEXT[], -- Array of keywords
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  thumbnail_url TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_places_user_id ON places(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_places_status ON places(status);

-- Create index on created_at for ordering
CREATE INDEX IF NOT EXISTS idx_places_created_at ON places(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for MVP (public access)
-- In production, restrict to authenticated users
CREATE POLICY "Allow all for MVP"
  ON places
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_places_updated_at
  BEFORE UPDATE ON places
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time for this table
ALTER PUBLICATION supabase_realtime ADD TABLE places;

