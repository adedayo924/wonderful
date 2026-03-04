const SUPABASE_URL = 'https://hgjaqurtcqkratbkqrgp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnamFxdXJ0Y3FrcmF0YmtxcmdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1NDQyNzAsImV4cCI6MjA4ODEyMDI3MH0.WKt7-4wJVwma8xUxutFg4eE4lhkz2aBAXKUXXUq7QL8';

const OPAY_MERCHANT_ID = '256626030359533';
const OPAY_PUBLIC_KEY = 'OPAYPUB17725454795800.07492404697304189';
const OPAY_MODE = 'test';

var supabase = null;

function initSupabase() {
  console.log('Initializing Supabase (local)...');
  return new Promise((resolve) => {
    if (window.supabase) {
      console.log('Supabase already available on window');
      supabase = window.supabase;
      resolve(supabase);
      return;
    }
    function check() {
      if (window.supabase) {
        console.log('Supabase found on window');
        supabase = window.supabase;
        resolve(supabase);
      } else {
        setTimeout(check, 50);
      }
    }
    check();
  });
}

async function waitForSupabase() {
  console.log('waitForSupabase called');
  if (supabase) return supabase;
  return initSupabase();
}
