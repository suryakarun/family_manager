// Check if photo gallery tables exist
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://boopfwfmuulofecarecx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwNzgsImV4cCI6MjA3NTY2MzA3OH0.yC-WdWg4zfmCi7z_MCxPVAgRgQxnj5tsWxb5C8AbSrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotoTables() {
  console.log('🔍 Checking photo gallery database setup...\n');

  // Check event_photos table
  console.log('1️⃣ Checking event_photos table...');
  const { data: photosData, error: photosError } = await supabase
    .from('event_photos')
    .select('id')
    .limit(1);

  if (photosError) {
    console.error('❌ event_photos table error:', photosError.message);
    console.log('   Code:', photosError.code);
    console.log('   Details:', photosError.details);
  } else {
    console.log('✅ event_photos table exists');
  }

  // Check photo_reactions table
  console.log('\n2️⃣ Checking photo_reactions table...');
  const { data: reactionsData, error: reactionsError } = await supabase
    .from('photo_reactions')
    .select('id')
    .limit(1);

  if (reactionsError) {
    console.error('❌ photo_reactions table error:', reactionsError.message);
    console.log('   Code:', reactionsError.code);
    console.log('   Details:', reactionsError.details);
  } else {
    console.log('✅ photo_reactions table exists');
  }

  // Check storage bucket
  console.log('\n3️⃣ Checking event-photos storage bucket...');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

  if (bucketsError) {
    console.error('❌ Storage buckets error:', bucketsError.message);
  } else {
    const eventPhotosBucket = buckets.find(b => b.id === 'event-photos');
    if (eventPhotosBucket) {
      console.log('✅ event-photos bucket exists');
      console.log('   Public:', eventPhotosBucket.public);
      console.log('   File size limit:', eventPhotosBucket.file_size_limit / 1024 / 1024, 'MB');
    } else {
      console.error('❌ event-photos bucket not found');
      console.log('   Available buckets:', buckets.map(b => b.id).join(', '));
    }
  }

  console.log('\n✨ Check complete!');
}

checkPhotoTables().catch(console.error);
