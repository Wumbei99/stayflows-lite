import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aumfdgzeausgwsapeqsk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1bWZkZ3plYXVzZ3dzYXBlcXNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjg1MjMsImV4cCI6MjEwMDk0NDUyM30.d1NnFzuvZw5RwhZsR2Yvs0cYFPZbnFVXYkgJx7Ov2fs';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createSuperAdmin() {
  const email = 'gwumbei181@gmail.com';
  const password = '2120'; // If it fails due to length, we'll try 212021

  console.log(`Attempting to sign up ${email}...`);
  // 1. Sign up the user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Error signing up:', authError.message);
    if (authError.message.includes('Password should be at least')) {
        console.log('Trying with 6-char password "212021"...');
        const { data: authData2, error: authError2 } = await supabase.auth.signUp({
            email,
            password: '212021',
        });
        if (authError2) {
            console.error('Error signing up again:', authError2.message);
            return;
        }
        console.log('Sign up successful with "212021".');
        await addAdmin(authData2.user.id);
    }
    return;
  }
  
  if (authData?.user) {
    console.log('Sign up successful.');
    await addAdmin(authData.user.id);
  }
}

async function addAdmin(userId) {
  console.log(`Adding ${userId} to platform_admins...`);
  // 2. Insert into platform_admins
  const { error: insertError } = await supabase
    .from('platform_admins')
    .insert({ user_id: userId });

  if (insertError) {
    // If it's an RLS error, it's because anon key can't insert into platform_admins.
    // In that case, we need to bypass RLS or use the service_role key.
    console.error('Error inserting into platform_admins:', insertError.message);
  } else {
    console.log('Successfully created Super Admin!');
  }
}

createSuperAdmin();
