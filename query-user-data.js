// Query user data from Supabase
// Run with: node query-user-data.js

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file manually
const envContent = readFileSync(join(__dirname, '.env'), 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=:#]+?)[=:](.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const targetEmail = 'lin.hecafa@gmail.com';

async function queryUserData() {
  try {
    console.log(`\n🔍 Searching for user: ${targetEmail}\n`);

    // Query auth.users table (via admin API if available, or through RPC)
    // Since we're using anon key, we can't directly query auth.users
    // We need to find the user_id from the profiles or words table

    // Try to find user through profiles table
    const { data: allProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*');

    if (profilesError) {
      console.error('❌ Error querying profiles:', profilesError.message);
      console.log('\n⚠️  Note: Due to Row Level Security (RLS), you can only see data for authenticated users.');
      console.log('   To query user data, you need to either:');
      console.log('   1. Use Supabase Dashboard SQL Editor');
      console.log('   2. Use service_role key (not recommended for client-side)');
      console.log('   3. Sign in as the user first\n');
      return;
    }

    console.log('📊 Accessible profiles:', allProfiles?.length || 0);

    if (allProfiles && allProfiles.length > 0) {
      console.log('\n👤 Profile data:');
      allProfiles.forEach(profile => {
        console.log(JSON.stringify(profile, null, 2));
      });
    }

    // Try to query words
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*');

    if (!wordsError && words) {
      console.log(`\n📝 Words found: ${words.length}`);
      if (words.length > 0) {
        console.log('Sample words:', words.slice(0, 3));
      }
    }

    // Try to query token usage
    const { data: tokenUsage, error: tokenError } = await supabase
      .from('token_usage')
      .select('*');

    if (!tokenError && tokenUsage) {
      console.log(`\n💰 Token usage records: ${tokenUsage.length}`);
      if (tokenUsage.length > 0) {
        console.log(JSON.stringify(tokenUsage, null, 2));
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📌 ALTERNATIVE: Query from Supabase Dashboard');
    console.log('='.repeat(60));
    console.log('\n1. Go to: https://ibmjhqtxdqodohlbarnz.supabase.co');
    console.log('2. Navigate to: SQL Editor');
    console.log('3. Run this query:\n');
    console.log(`
-- Find user by email
SELECT
  u.id as user_id,
  u.email,
  u.created_at as user_created_at,
  p.*
FROM auth.users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.email = '${targetEmail}';

-- Get user's words
SELECT w.*
FROM auth.users u
JOIN words w ON w.user_id = u.id
WHERE u.email = '${targetEmail}'
ORDER BY w.created_at DESC;

-- Get user's token usage
SELECT t.*
FROM auth.users u
JOIN token_usage t ON t.user_id = u.id
WHERE u.email = '${targetEmail}';

-- Get user's word explanations
SELECT we.*
FROM auth.users u
JOIN word_explanations we ON we.user_id = u.id
WHERE u.email = '${targetEmail}'
ORDER BY we.created_at DESC;
    `);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

queryUserData();
