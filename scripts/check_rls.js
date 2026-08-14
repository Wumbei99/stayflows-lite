import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://aumfdgzeausgwsapeqsk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bWZkZ3plYXVzZ3dzYXBlcXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjg1MjMsImV4cCI6MjEwMDk0NDUyM30.d1NnFzuvZw5RwhZsR2Yvs0cYFPZbnFVXYkgJx7Ov2fs';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkRLS() {
  const { data, error } = await supabase.rpc('query_rls', { table_name: 'platform_admins' });
  console.log("RPC Error:", error);
  // since we don't have an RPC, let's just use the Supabase CLI if possible
}
checkRLS();
