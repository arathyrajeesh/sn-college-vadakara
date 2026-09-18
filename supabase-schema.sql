-- =======================================================
-- “Viral Paad” — Clean Supabase Database Schema
-- Run this script in: Supabase Dashboard -> SQL Editor -> Run
-- (No hardcoded sample data: only real data added by Admin)
-- =======================================================

-- 1. Create `songs` Table
CREATE TABLE IF NOT EXISTS public.songs (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT 'Editorial',
  cover_image TEXT,
  audio_file TEXT,
  duration TEXT DEFAULT '30 min',
  display_order INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT TRUE,
  plays INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backward-compatibility table for `tracks`
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
  display_order INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create `articles` Table
CREATE TABLE IF NOT EXISTS public.articles (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Editorial',
  cover_image TEXT,
  content TEXT,
  published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Grant Table & Sequence Permissions to Supabase API Roles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.songs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.tracks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.articles TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies (Full access for app)
DROP POLICY IF EXISTS "Allow all access to songs" ON public.songs;
CREATE POLICY "Allow all access to songs"
  ON public.songs
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to tracks" ON public.tracks;
CREATE POLICY "Allow all access to tracks"
  ON public.tracks
  FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to articles" ON public.articles;
CREATE POLICY "Allow all access to articles"
  ON public.articles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Create Media Storage Buckets
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('song-covers', 'song-covers', true),
  ('song-audio', 'song-audio', true),
  ('article-covers', 'article-covers', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies
DROP POLICY IF EXISTS "Allow all storage access" ON storage.objects;
CREATE POLICY "Allow all storage access"
  ON storage.objects
  FOR ALL
  USING (true)
  WITH CHECK (true);
