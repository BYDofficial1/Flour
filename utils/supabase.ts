import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

// --- ⚠️ IMPORTANT: SUPABASE SETUP GUIDE ⚠️ ---
// To connect this app to your Supabase backend, follow these steps.
//
// STEP 1: SET ENVIRONMENT VARIABLES (RECOMMENDED FOR PRODUCTION)
// In your hosting provider's settings (e.g., Vercel), add these two variables:
//   - SUPABASE_URL="https://your-project-id.supabase.co"
//   - SUPABASE_KEY="your-public-anon-key"
// (Find these in your Supabase project under Settings > API)
//
// STEP 2: RUN THE DATABASE SETUP SCRIPT
// You MUST run the commands in `database_setup.sql` in your Supabase SQL Editor.
// This will create the necessary tables, policies, and storage configurations.
//
// --------------------------------------------------------------------

// --- ⚠️ WARNING: Development Keys Hardcoded ⚠️ ---
// The Supabase URL and Key below are hardcoded for ease of setup in this specific environment.
// For a real-world application, you MUST use environment variables to keep your keys secure.
// Storing keys directly in your code can lead to security vulnerabilities.
// --------------------------------------------------------------------
const supabaseUrl = "https://uywayhjzjxwtkoibladb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV5d2F5aGp6anh3dGtvaWJsYWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDA3ODUsImV4cCI6MjA3NjgxNjc4NX0.yin744V_V--MNP3UfzM-Am_YgnJlkifTsgyrHKn88g4";

// The `createClient` function is called with the URL and key.
const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

export { supabase };
