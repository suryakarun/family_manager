// Create event-photos storage bucket
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://boopfwfmuulofecarecx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJvb3Bmd2ZtdXVsb2ZlY2FyZWN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAwODcwNzgsImV4cCI6MjA3NTY2MzA3OH0.yC-WdWg4zfmCi7z_MCxPVAgRgQxnj5tsWxb5C8AbSrY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  console.log('📦 Creating event-photos storage bucket...\n');

  const { data, error } = await supabase.storage.createBucket('event-photos', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/quicktime'
    ]
  });

  if (error) {
    console.error('❌ Error creating bucket:', error.message);
    console.log('   This might require admin permissions.');
    console.log('   Please create the bucket manually in Supabase Dashboard:');
    console.log('   1. Go to: https://supabase.com/dashboard/project/boopfwfmuulofecarecx/storage/buckets');
    console.log('   2. Click "New Bucket"');
    console.log('   3. Name: event-photos');
    console.log('   4. Make it public: ✓');
    console.log('   5. File size limit: 50 MB');
    console.log('   6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp, video/mp4, video/quicktime');
  } else {
    console.log('✅ event-photos bucket created successfully!');
    console.log('   Data:', data);
  }
}

createBucket().catch(console.error);
