// scripts/test-supabase.js
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    const { data, error } = await supabase.from('family_members').select('*').limit(1);

    if (error) throw error;
    console.log('✅ Supabase connection successful!');
    console.log('Sample data:', data);
  } catch (err) {
    console.error('❌ Supabase connection failed:', err.message);
  }
}

testConnection();
