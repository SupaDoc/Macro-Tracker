// Loaded by index.html via a plain <script> tag before the app script.
//
// SUPABASE_URL and SUPABASE_ANON_KEY are the publishable (client-safe) keys
// from Supabase Project Settings -> API. They are meant to be public; access
// control is enforced by the RLS policies in supabase/schema.sql, not by
// keeping this key secret — so this file is committed directly rather than
// generated at build time. (An earlier attempt generated it via a Netlify
// build command reading env vars, but Netlify was reusing a cached deploy
// for the same commit SHA and never actually re-ran the build script —
// committing the file sidesteps that entirely.)
window.APP_CONFIG = {
  SUPABASE_URL: "https://jioouufgjdglrnskvorf.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imppb291dWZnamRnbHJuc2t2b3JmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMzA5MzcsImV4cCI6MjA5ODYwNjkzN30.PXn4eVi4PzQjncZiq_a43ZncOfv1b320-yhdTg3Zs5s",
};
