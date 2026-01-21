// Admin script to backfill check-in history
// Run with: node backfill-checkin.js

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

// Check-in data to backfill
const checkInData = [
  {
    date: '2026-01-19',
    groupsCompleted: 1,
    wordsLearned: [] // We don't have actual word IDs, using empty array
  },
  {
    date: '2026-01-20',
    groupsCompleted: 1,
    wordsLearned: []
  },
  {
    date: '2026-01-21',
    groupsCompleted: 1,
    wordsLearned: []
  }
];

async function backfillCheckInHistory() {
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

    console.log('📊 Current check-in history:', profile.check_in_history?.length || 0, 'records\n');

    // Prepare new check-in history
    const existingHistory = profile.check_in_history || [];
    const newHistory = [...existingHistory];

    // Add backfill data
    checkInData.forEach(checkIn => {
      const existingIndex = newHistory.findIndex(record => record.date === checkIn.date);

      if (existingIndex >= 0) {
        console.log(`⚠️  ${checkIn.date} already exists, skipping...`);
      } else {
        newHistory.push({
          date: checkIn.date,
          groupsCompleted: checkIn.groupsCompleted,
          wordsLearned: checkIn.wordsLearned,
          createdAt: new Date().toISOString()
        });
        console.log(`✅ Added check-in for ${checkIn.date} (${checkIn.groupsCompleted} group)`);
      }
    });

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

    console.log('\n🎉 Check-in history backfilled successfully!');
    console.log(`📊 Total check-in records: ${newHistory.length}`);
    console.log('\n📅 Check-in dates:');
    newHistory.slice(0, 10).forEach(record => {
      console.log(`   ${record.date}: ${record.groupsCompleted} group(s)`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

backfillCheckInHistory();
