// Runs as the Netlify build command. Writes config.js from env vars set in
// Netlify site settings (Project Settings -> Environment variables), since
// config.js is gitignored and this repo has no other build tooling.
//
// Local dev: this script isn't run automatically. Copy config.example.js to
// config.js by hand instead (see README).

const fs = require("fs");

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing SUPABASE_URL and/or SUPABASE_ANON_KEY env vars. Set them in " +
      "Netlify: Site settings -> Environment variables."
  );
  process.exit(1);
}

const contents = `// Generated at build time by scripts/write-config.js — do not edit by hand.
window.APP_CONFIG = {
  SUPABASE_URL: ${JSON.stringify(SUPABASE_URL)},
  SUPABASE_ANON_KEY: ${JSON.stringify(SUPABASE_ANON_KEY)},
};
`;

fs.writeFileSync("config.js", contents);
console.log("Wrote config.js from Netlify environment variables.");
