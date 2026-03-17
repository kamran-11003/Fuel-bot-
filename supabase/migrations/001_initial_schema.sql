-- Fuel Complaint System - Initial Schema
-- Run this SQL in your Supabase SQL Editor

-- User Sessions Table
-- Stores conversation state for each WhatsApp user
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  state VARCHAR(50) DEFAULT 'GREETING',
  cnic VARCHAR(13),
  region VARCHAR(100),
  complaint_type VARCHAR(100),
  details TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_text TEXT,
  image_url TEXT,
  last_interaction_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Complaints Table
-- Stores submitted complaints
CREATE TABLE IF NOT EXISTS complaints (
  id BIGSERIAL PRIMARY KEY,
  complaint_code VARCHAR(20) UNIQUE,
  phone_number VARCHAR(20) NOT NULL,
  cnic VARCHAR(13) NOT NULL,
  region VARCHAR(100) NOT NULL,
  complaint_type VARCHAR(100) NOT NULL,
  details TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location_text TEXT,
  image_url TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_complaints_cnic ON complaints(cnic);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON user_sessions(phone_number);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
-- Service role can do everything (used by the bot)
CREATE POLICY "Service role full access to sessions" ON user_sessions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access to complaints" ON complaints
  FOR ALL USING (true) WITH CHECK (true);

-- Create storage bucket for complaint images
-- Note: Run this separately if bucket creation via SQL is not supported
-- Otherwise, create manually in Supabase Dashboard > Storage
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy to allow uploads
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'complaint-images');

CREATE POLICY "Allow public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'complaint-images');
