// Check if photos are in the database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://boopfwfmuulofecarecx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwNzgsImV4cCI6MjA3NTY2MzA3OH0.yC-WdWg4zfmCi7z_MCxPVAgRgQxnj5tsWxb5C8AbSrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPhotos() {
  console.log('🔍 Checking event_photos database...\n');

  // Check if any photos exist
  const { data, error } = await supabase
    .from('event_photos')
    .select('*')
    .limit(10);

  if (error) {
    console.error('❌ Error querying event_photos:', error.message);
    console.log('   Code:', error.code);
    console.log('   Details:', error.details);
    console.log('\n💡 This might mean the table exists but RLS policies are blocking access.');
    console.log('   Or you need to be authenticated to see photos.');
  } else {
    console.log('✅ Query successful!');
    console.log(`   Found ${data.length} photo(s) in database\n`);
    
    if (data.length > 0) {
      console.log('📸 Photos in database:');
      data.forEach((photo, i) => {
        console.log(`\n   ${i + 1}. Photo ID: ${photo.id}`);
        console.log(`      Event ID: ${photo.event_id}`);
        console.log(`      File URL: ${photo.file_url}`);
        console.log(`      Uploaded by: ${photo.uploaded_by}`);
        console.log(`      Uploaded at: ${photo.uploaded_at}`);
      });
    } else {
      console.log('⚠️  No photos found in database!');
      console.log('\n🔍 Possible reasons:');
      console.log('   1. The upload is failing at the database insert step');
      console.log('   2. The trigger error is preventing the insert');
      console.log('   3. You need to apply the SQL fix first');
    }
  }

  // Check storage files
  console.log('\n\n📦 Checking storage bucket...');
  const { data: files, error: storageError } = await supabase.storage
    .from('event-photos')
    .list('', { limit: 100 });

  if (storageError) {
    console.error('❌ Storage error:', storageError.message);
  } else {
    console.log(`✅ Found ${files.length} folder(s) in storage`);
    for (const folder of files) {
      if (folder.name) {
        const { data: userFiles } = await supabase.storage
          .from('event-photos')
          .list(folder.name, { limit: 10 });
        if (userFiles && userFiles.length > 0) {
          console.log(`   📁 ${folder.name}: ${userFiles.length} file(s)`);
          userFiles.forEach(f => {
            console.log(`      - ${f.name} (${(f.metadata?.size / 1024).toFixed(1)} KB)`);
          });
        }
      }
    }
  }
}

checkPhotos().catch(console.error);
