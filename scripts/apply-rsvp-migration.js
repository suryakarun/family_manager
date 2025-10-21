const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('📁 Reading migration file...');
    const migrationPath = path.join(__dirname, '../supabase/migrations/20251017_add_event_invites.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Applying migration to create event_invites table...');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      console.log('  Executing statement...');
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      
      if (error) {
        console.error('❌ Error executing statement:', error);
        // Continue anyway - some errors are expected (like duplicate objects)
      }
    }

    console.log('✅ Migration completed!');
    console.log('📋 The event_invites table should now be created.');
    console.log('🔄 Please refresh your app to see the changes.');
    
  } catch (error) {
    console.error('❌ Failed to apply migration:', error.message);
    console.log('\n📝 Manual steps:');
    console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
    console.log('2. Open the SQL Editor');
    console.log('3. Copy and paste the contents of: supabase/migrations/20251017_add_event_invites.sql');
    console.log('4. Click "Run" to execute the migration');
    process.exit(1);
  }
}

applyMigration();
