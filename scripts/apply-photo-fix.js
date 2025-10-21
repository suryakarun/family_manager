// Apply photo notification fix migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://boopfwfmuulofecarecx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwNzgsImV4cCI6MjA3NTY2MzA3OH0.yC-WdWg4zfmCi7z_MCxPVAgRgQxnj5tsWxb5C8AbSrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🔧 Applying photo notification fix migration...\n');

  const sql = readFileSync('supabase/migrations/20251018_fix_photo_notification.sql', 'utf8');

  const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

  if (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📝 Please run this SQL in Supabase Dashboard SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/boopfwfmuulofecarecx/sql/new');
    console.log('\nSQL to run:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
  } else {
    console.log('✅ Migration applied successfully!');
    console.log('   Photo upload notifications should now work.');
  }
}

applyMigration().catch(console.error);
