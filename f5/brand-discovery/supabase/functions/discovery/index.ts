import { createClient } from 'npm:@supabase/supabase-js@2';
import { makeHandler } from './handler.ts';

const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

Deno.serve(makeHandler({
  db,
  env: (key, fallback = '') => Deno.env.get(key) ?? fallback,
  fetch,
  now: () => Date.now(),
}));
