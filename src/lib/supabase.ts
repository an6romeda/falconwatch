/**
 * Supabase client initialization
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

if (!supabaseServiceKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

// Use service role key for server-side operations (API routes)
// This bypasses RLS for full CRUD access
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Database types
export interface EmailSubscription {
  id: string;
  email_hash: string;
  encrypted_email: string;
  reminder_minutes: number;
  launch_id: string | null;
  unsubscribe_token: string;
  created_at: string;
  last_notified_at: string | null;
  is_active: boolean;
  site_ids: string | null;
}
