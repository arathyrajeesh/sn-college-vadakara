-- =======================================================
-- SNG College Vadakara - Magazine & Audio App Schema
-- Run this in your Supabase Dashboard -> SQL Editor -> Run
-- =======================================================

-- 1. Create Tracks / Articles Table
CREATE TABLE IF NOT EXISTS public.tracks (
  id BIGSERIAL PRIMARY KEY,
  number TEXT DEFAULT 'X',
  title TEXT NOT NULL,
  duration TEXT DEFAULT '30 min',
  category TEXT DEFAULT 'Chapter',
  author TEXT DEFAULT 'Editorial',
  plays INTEGER DEFAULT 0,
  cover_url TEXT,
  audio_url TEXT,
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Grant Table Permissions to Supabase API Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tracks TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies and create full access policies
DROP POLICY IF EXISTS "Allow public read tracks" ON public.tracks;
DROP POLICY IF EXISTS "Allow public insert tracks" ON public.tracks;
DROP POLICY IF EXISTS "Allow public update tracks" ON public.tracks;
DROP POLICY IF EXISTS "Allow all access to tracks" ON public.tracks;

CREATE POLICY "Allow all access to tracks"
  ON public.tracks
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Seed Initial Track Data
INSERT INTO public.tracks (number, title, duration, category, author, plays)
VALUES
  ('I', 'I. The Substance of the Shadow', '35 min', 'Chapter', 'Editorial', 142),
  ('II', 'II. Ink on Borrowed Time', '28 min', 'Poetry', 'Poetry', 98),
  ('III', 'III. Roots & Reverie', '42 min', 'Fiction', 'Fiction', 74),
  ('IV', 'IV. Letters Never Sent', '19 min', 'Essay', 'Essay', 63),
  ('V', 'V. The Weight of Wings', '31 min', 'Short Story', 'Short Story', 51),
  ('VI', 'VI. Monsoon Cartography', '24 min', 'Verse', 'Verse', 39)
ON CONFLICT DO NOTHING;
