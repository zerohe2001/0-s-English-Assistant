// Script to fix check-in dates in Supabase
// Run with: node fix-checkin-dates.js

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

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const targetEmail = 'lin.hecafa@gmail.com';

async function fixCheckInDates() {
  console.log('🔗 Connecting to Supabase with admin privileges...\n');

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Find user
    console.log(`🔍 Searching for user: ${targetEmail}`);
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error('❌ Error listing users:', usersError.message);
      return;
    }

    const targetUser = users.find(u => u.email === targetEmail);

    if (!targetUser) {
      console.log(`❌ User not found: ${targetEmail}`);
      return;
    }

    console.log(`✅ User found: ${targetUser.id}\n`);

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('check_in_history')
      .eq('user_id', targetUser.id)
      .single();

    if (profileError) {
      console.error('❌ Error fetching profile:', profileError.message);
      return;
    }

    console.log('📊 Current check-in history:', profile.check_in_history?.length || 0, 'records');

    // Show current records
    if (profile.check_in_history && profile.check_in_history.length > 0) {
      console.log('\n📅 Current records:');
      profile.check_in_history.forEach(record => {
        console.log(`   ${record.date}: ${record.groupsCompleted} group(s)`);
      });
    }

    // Filter out 2026-01-22 and any 2025 dates
    let newHistory = (profile.check_in_history || []).filter(record => {
      if (record.date === '2026-01-22') {
        console.log(`\n🗑️  Removing: ${record.date}`);
        return false;
      }
      if (record.date.startsWith('2025-')) {
        console.log(`🗑️  Removing: ${record.date} (wrong year)`);
        return false;
      }
      return true;
    });

    // Add 2026-01-19 if it doesn't exist
    const has19 = newHistory.some(r => r.date === '2026-01-19');
    if (!has19) {
      console.log('\n✅ Adding: 2026-01-19 (1 group)');
      newHistory.push({
        date: '2026-01-19',
        groupsCompleted: 1,
        wordsLearned: [],
        createdAt: new Date().toISOString()
      });
    } else {
      console.log('\n⚠️  2026-01-19 already exists, skipping');
    }

    // Sort by date (newest first)
    newHistory.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ check_in_history: newHistory })
      .eq('user_id', targetUser.id);

    if (updateError) {
      console.error('❌ Error updating profile:', updateError.message);
      return;
    }

    console.log('\n🎉 Check-in history fixed successfully!');
    console.log(`📊 Total check-in records: ${newHistory.length}`);
    console.log('\n📅 Updated check-in dates:');
    newHistory.forEach(record => {
      console.log(`   ${record.date}: ${record.groupsCompleted} group(s)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixCheckInDates();
