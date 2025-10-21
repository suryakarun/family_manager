// Check reminder_queue table structure
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://boopfwfmuulofecarecx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwNzgsImV4cCI6MjA3NTY2MzA3OH0.yC-WdWg4zfmCi7z_MCxPVAgRgQxnj5tsWxb5C8AbSrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkReminderQueue() {
  console.log('🔍 Checking reminder_queue table structure...\n');

  // Try to fetch one row to see the structure
  const { data, error } = await supabase
    .from('reminder_queue')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Error:', error.message);
  } else {
    console.log('✅ reminder_queue table exists');
    if (data && data.length > 0) {
      console.log('\n📋 Column names:');
      Object.keys(data[0]).forEach(key => {
        console.log('   -', key);
      });
    } else {
      console.log('\n⚠️  Table is empty, trying to get columns another way...');
      
      // Try inserting a test row to see what columns are required
      const { error: insertError } = await supabase
        .from('reminder_queue')
        .insert({
          event_id: '00000000-0000-0000-0000-000000000000',
          user_id: '00000000-0000-0000-0000-000000000000',
          phone_number: '+1234567890',
          message: 'test',
          send_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.log('\n📝 Error details (shows expected columns):');
        console.log('   ', insertError.message);
        console.log('   ', insertError.details);
      }
    }
  }
}

checkReminderQueue().catch(console.error);
