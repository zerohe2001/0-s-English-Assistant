// Admin script to query user data from Supabase
// Run with: node admin-query-user.js

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

const supabaseUrl = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing SUPABASE_URL in .env file');
  process.exit(1);
}

const targetEmail = 'lin.hecafa@gmail.com';

async function queryWithServiceRole() {
  if (!serviceRoleKey) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env\n');
    console.log('📝 To get the service_role key:');
    console.log('1. Go to: https://ibmjhqtxdqodohlbarnz.supabase.co');
    console.log('2. Click Settings (齿轮图标) → API');
    console.log('3. Find "service_role" key (⚠️ Secret - 不要分享)');
    console.log('4. Add to .env file:');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here\n');
    console.log('5. Re-run this script\n');
    return;
  }

  console.log('🔗 Connecting to Supabase with admin privileges...\n');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log(`🔍 Searching for user: ${targetEmail}\n`);
    console.log('='.repeat(60));

    // Query auth.users using admin API
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      return;
    }

    const targetUser = users.find(u => u.email === targetEmail);

    if (!targetUser) {
      console.log(`❌ User not found: ${targetEmail}`);
      console.log(`\n📊 Total users in database: ${users.length}`);
      if (users.length > 0) {
        console.log('\n👥 Registered users:');
        users.forEach(u => {
          console.log(`   - ${u.email} (ID: ${u.id})`);
        });
      }
      return;
    }

    console.log('✅ User found!\n');
    console.log('👤 USER INFO:');
    console.log('='.repeat(60));
    console.log(`Email: ${targetUser.email}`);
    console.log(`User ID: ${targetUser.id}`);
    console.log(`Created: ${new Date(targetUser.created_at).toLocaleString('zh-CN')}`);
    console.log(`Last Sign In: ${targetUser.last_sign_in_at ? new Date(targetUser.last_sign_in_at).toLocaleString('zh-CN') : 'Never'}`);
    console.log(`Email Confirmed: ${targetUser.email_confirmed_at ? '✅ Yes' : '❌ No'}`);

    // Get profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', targetUser.id)
      .single();

    if (!profileError && profile) {
      console.log('\n📋 PROFILE:');
      console.log('='.repeat(60));
      console.log(`Name: ${profile.name}`);
      console.log(`Level: ${profile.level}`);
      console.log(`Target: ${profile.target}`);
      console.log(`Native Language: ${profile.native_language}`);
      console.log(`Saved Contexts: ${profile.saved_contexts?.length || 0} items`);
      console.log(`Created: ${new Date(profile.created_at).toLocaleString('zh-CN')}`);
      console.log(`Updated: ${new Date(profile.updated_at).toLocaleString('zh-CN')}`);
    } else {
      console.log('\n📋 PROFILE: Not set up yet');
    }

    // Get words
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .eq('user_id', targetUser.id)
      .order('created_at', { ascending: false });

    console.log('\n📚 VOCABULARY:');
    console.log('='.repeat(60));
    if (!wordsError && words && words.length > 0) {
      console.log(`Total words: ${words.length}`);
      console.log(`Learned: ${words.filter(w => w.learned).length}`);
      console.log(`Learning: ${words.filter(w => !w.learned).length}`);
      console.log('\nRecent words:');
      words.slice(0, 10).forEach((word, i) => {
        const status = word.learned ? '✅' : '📖';
        const reviewDate = word.next_review_date
          ? new Date(word.next_review_date).toLocaleDateString('zh-CN')
          : 'N/A';
        console.log(`${i + 1}. ${status} ${word.text} (Next review: ${reviewDate})`);
      });
    } else {
      console.log('No words added yet');
    }

    // Get word explanations
    const { data: explanations, error: expError } = await supabase
      .from('word_explanations')
      .select('*')
      .eq('user_id', targetUser.id);

    if (!expError && explanations && explanations.length > 0) {
      console.log(`\n💡 Cached explanations: ${explanations.length}`);
    }

    // Get token usage
    const { data: tokenUsage, error: tokenError } = await supabase
      .from('token_usage')
      .select('*')
      .eq('user_id', targetUser.id)
      .single();

    console.log('\n💰 API USAGE:');
    console.log('='.repeat(60));
    if (!tokenError && tokenUsage) {
      console.log(`Input tokens: ${tokenUsage.input_tokens.toLocaleString()}`);
      console.log(`Output tokens: ${tokenUsage.output_tokens.toLocaleString()}`);
      console.log(`Total cost: $${parseFloat(tokenUsage.total_cost).toFixed(4)}`);
      console.log(`Last updated: ${new Date(tokenUsage.updated_at).toLocaleString('zh-CN')}`);
    } else {
      console.log('No usage data yet');
    }

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function queryWithAnonKey() {
  console.log('🔗 Attempting query with anon key...\n');
  console.log('⚠️  Due to Row Level Security (RLS), this will only show limited data.\n');

  const supabase = createClient(supabaseUrl, anonKey);

  // Try to get all profiles (will be empty due to RLS)
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');

  console.log('📊 Accessible profiles with anon key:', profiles?.length || 0);

  if (profiles && profiles.length > 0) {
    console.log('\nFound profiles:', profiles);
  } else {
    console.log('\n❌ Cannot access user data with anon key due to RLS.');
    console.log('   Need service_role key for admin access.\n');
  }
}

// Run both methods
async function main() {
  await queryWithServiceRole();

  if (!serviceRoleKey) {
    console.log('\n' + '='.repeat(60));
    console.log('Falling back to anon key query...');
    console.log('='.repeat(60) + '\n');
    await queryWithAnonKey();
  }
}

main();
