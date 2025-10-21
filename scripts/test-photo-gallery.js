// Test photo gallery functionality
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://boopfwfmuulofecarecx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwNzgsImV4cCI6MjA3NTY2MzA3OH0.yC-WdWg4zfmCi7z_MCxPVAgRgQxnj5tsWxb5C8AbSrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPhotoGallery() {
  console.log('🔍 Testing photo gallery functionality...\n');

  // First, login to test as authenticated user
  console.log('1️⃣ Testing as anonymous user (what the app does)...');
  
  // Test the exact query from eventgallery.tsx
  const { data: photosData, error: photosError } = await supabase
    .from('event_photos')
    .select(`
      id,
      file_url,
      file_type,
      caption,
      uploaded_at,
      uploaded_by,
      profiles:uploaded_by (
        full_name,
        avatar_url
      )
    `)
    .limit(10);

  if (photosError) {
    console.error('❌ Error fetching photos:', photosError.message);
    console.log('   Code:', photosError.code);
    console.log('   Details:', photosError.details);
    console.log('   Hint:', photosError.hint);
    
    if (photosError.message.includes('relation') && photosError.message.includes('does not exist')) {
      console.log('\n💡 The event_photos table might not exist!');
    } else if (photosError.code === 'PGRST301') {
      console.log('\n💡 This is a Row Level Security (RLS) error.');
      console.log('   You need to be logged in to view photos.');
      console.log('   Or the RLS policies are blocking access.');
    } else if (photosError.message.includes('profiles')) {
      console.log('\n💡 There might be an issue with the join to profiles table.');
    }
  } else {
    console.log('✅ Successfully fetched photos!');
    console.log(`   Found ${photosData.length} photo(s)`);
    if (photosData.length > 0) {
      console.log('\n📸 Photos:');
      photosData.forEach((p, i) => {
        console.log(`   ${i + 1}. ${p.file_url}`);
        console.log(`      Uploader: ${p.profiles?.full_name || 'Unknown'}`);
      });
    }
  }

  // Check RLS policies
  console.log('\n\n2️⃣ Checking RLS policies on event_photos...');
  const { data: policies, error: policyError } = await supabase
    .rpc('exec_sql', { 
      sql_string: `
        SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
        FROM pg_policies 
        WHERE tablename = 'event_photos';
      ` 
    });

  if (policyError) {
    console.log('⚠️  Cannot check policies (requires admin access)');
  } else {
    console.log('✅ RLS Policies:', policies);
  }
}

testPhotoGallery().catch(console.error);
