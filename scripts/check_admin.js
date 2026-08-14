import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://aumfdgzeausgwsapeqsk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bWZkZ3plYXVzZ3dzYXBlcXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjg1MjMsImV4cCI6MjEwMDk0NDUyM30.d1NnFzuvZw5RwhZsR2Yvs0cYFPZbnFVXYkgJx7Ov2fs';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deepDive() {
  // Sign in
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'gwumbei181@gmail.com',
    password: '212021'
  });
  
  if (authError) {
      console.error("Login failed:", authError);
      return;
  }
  
  console.log("Logged in user ID:", authData.user.id);
  
  // Can we read platform_admins?
  const { data: adminData, error: readErr } = await supabase
    .from('platform_admins')
    .select('*');
  console.log("Read platform_admins:", adminData, "Error:", readErr);
}

deepDive();
