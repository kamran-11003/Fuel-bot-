/**
 * Supabase Database Setup Script
 * 
 * Run this ONCE to create tables and storage bucket:
 *   node setup-db.js
 * 
 * Requires .env with SUPABASE_URL and SUPABASE_SERVICE_KEY
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Extract project ref from URL (https://xxxx.supabase.co -> xxxx)
const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];

// Full DDL to create all required tables
const DDL = `
-- User Sessions Table
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_complaints_cnic ON complaints(cnic);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON user_sessions(phone_number);

-- Row Level Security
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_sessions' AND policyname = 'Service role full access to sessions'
  ) THEN
    CREATE POLICY "Service role full access to sessions" ON user_sessions
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'complaints' AND policyname = 'Service role full access to complaints'
  ) THEN
    CREATE POLICY "Service role full access to complaints" ON complaints
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow public read complaint images'
  ) THEN
    CREATE POLICY "Allow public read complaint images" ON storage.objects
      FOR SELECT USING (bucket_id = 'complaint-images');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Allow service uploads complaint images'
  ) THEN
    CREATE POLICY "Allow service uploads complaint images" ON storage.objects
      FOR INSERT WITH CHECK (bucket_id = 'complaint-images');
  END IF;
END $$;
`;

/**
 * Run SQL via Supabase Management API
 * Requires service key which has full postgres access
 */
async function runSQL(sql) {
  // Supabase exposes a direct postgres REST endpoint for service roles
  const url = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

  // First try: use exec_sql RPC if it exists
  try {
    const res = await axios.post(
      url,
      { sql },
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, data: res.data };
  } catch (err) {
    // exec_sql function may not exist — fall through to management API
  }

  // Second try: Supabase Management API (needs PAT, not service key)
  // This is a best-effort — if it fails, print manual instructions
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  try {
    const res = await axios.post(
      mgmtUrl,
      { query: sql },
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return { success: true, data: res.data };
  } catch (err) {
    return { success: false, error: err.response?.data || err.message };
  }
}

/**
 * Check if a table exists by trying to query it
 */
async function tableExists(tableName) {
  const { error } = await supabase
    .from(tableName)
    .select('id')
    .limit(1);

  // PGRST116 = no rows (table exists but empty) - that's fine
  // 42P01 = table does not exist
  if (!error) return true;
  if (error.code === 'PGRST116') return true;
  return false;
}

/**
 * Create storage bucket via supabase-js
 */
async function createStorageBucket() {
  const { data, error } = await supabase.storage.createBucket('complaint-images', {
    public: true,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    fileSizeLimit: 10485760 // 10MB
  });

  if (error && error.message !== 'The resource already exists') {
    return { success: false, error: error.message };
  }
  return { success: true };
}

async function main() {
  console.log('\n🔧 Fuel Complaint System — Database Setup');
  console.log('==========================================');
  console.log(`📡 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Project ref:  ${projectRef}\n`);

  // Step 1: Test connection
  console.log('1️⃣  Testing Supabase connection...');
  const { error: pingError } = await supabase.from('user_sessions').select('id').limit(0);

  const sessionsExist = await tableExists('user_sessions');
  const complaintsExist = await tableExists('complaints');

  if (sessionsExist && complaintsExist) {
    console.log('   ✅ Tables already exist!\n');
  } else {
    console.log('   ⚠️  Tables not found. Attempting to create...\n');

    // Step 2: Try to run DDL automatically
    console.log('2️⃣  Running DDL SQL...');
    const result = await runSQL(DDL);

    if (result.success) {
      console.log('   ✅ Tables created successfully!\n');
    } else {
      console.log('   ⚠️  Automatic DDL failed (this is normal).');
      console.log('   📋 Please run the SQL MANUALLY in Supabase Dashboard:\n');
      console.log('   1. Go to https://supabase.com/dashboard/project/' + projectRef);
      console.log('   2. Click "SQL Editor" in the left sidebar');
      console.log('   3. Paste and run the contents of:');
      console.log('      supabase/migrations/001_initial_schema.sql\n');
      console.log('   ─────────────────────────────────────────────');
      console.log('   ALTERNATIVE: Copy and run this SQL directly:\n');
      console.log(DDL);
      console.log('   ─────────────────────────────────────────────\n');
    }
  }

  // Step 3: Create storage bucket
  console.log('3️⃣  Setting up storage bucket (complaint-images)...');
  const bucketResult = await createStorageBucket();
  if (bucketResult.success) {
    console.log('   ✅ Storage bucket ready\n');
  } else {
    console.log(`   ⚠️  Bucket note: ${bucketResult.error}`);
    console.log('   (If it already exists, this is fine)\n');
  }

  // Step 4: Verify final state
  console.log('4️⃣  Verifying tables...');
  const finalSessions = await tableExists('user_sessions');
  const finalComplaints = await tableExists('complaints');

  const sessionStatus = finalSessions ? '✅ user_sessions' : '❌ user_sessions (not found)';
  const complaintsStatus = finalComplaints ? '✅ complaints' : '❌ complaints (not found)';

  console.log(`   ${sessionStatus}`);
  console.log(`   ${complaintsStatus}\n`);

  if (finalSessions && finalComplaints) {
    console.log('🎉 Setup complete! Your database is ready.');
    console.log('\n📌 Next steps:');
    console.log('   • Fill in WHATSAPP_PHONE_NUMBER_ID in .env');
    console.log('   • Fill in WHATSAPP_ACCESS_TOKEN in .env');
    console.log('   • Run: npm start');
    console.log('   • Open: http://localhost:3000  (bot prototype)');
    console.log('   • Open: http://localhost:3000/dashboard  (admin)');
  } else {
    console.log('⚠️  Some tables are missing. Please run the SQL manually (see above).');
    console.log('   Then run this script again to verify.\n');
  }
}

main().catch(err => {
  console.error('\n❌ Setup failed:', err.message);
  process.exit(1);
});
