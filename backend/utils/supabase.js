const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail-fast: crash immediately with a clear message if any required env var is missing.
const missing = [];
if (!supabaseUrl) missing.push('SUPABASE_URL');
if (!supabaseServiceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

if (missing.length > 0) {
  throw new Error(
    `FATAL: Missing required environment variable(s): ${missing.join(', ')}. ` +
    'Ensure your .env file exists and contains all required Supabase credentials.'
  );
}

// Admin client (service role key) — used for all server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = { supabaseAdmin };
