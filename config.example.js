// Copy this file to config.js and fill in your Supabase project values.
// config.js is gitignored — it's loaded by index.html via a plain <script> tag.
//
// SUPABASE_URL and SUPABASE_ANON_KEY are the publishable (client-safe) keys
// from Supabase Project Settings -> API. They are meant to be public; access
// control is enforced by the RLS policies in supabase/schema.sql, not by
// keeping this key secret.
window.APP_CONFIG = {
  SUPABASE_URL: "https://YOUR-PROJECT-REF.supabase.co",
  SUPABASE_ANON_KEY: "YOUR-ANON-PUBLIC-KEY",
};
