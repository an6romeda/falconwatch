-- Email subscriptions table for Falconwatch
-- Run this in your Supabase project's SQL Editor

-- Email subscriptions table
CREATE TABLE email_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email_hash TEXT NOT NULL UNIQUE,           -- SHA-256 hash for lookups
  encrypted_email TEXT NOT NULL,             -- AES-256-GCM encrypted
  reminder_minutes INTEGER NOT NULL DEFAULT 60,
  launch_id TEXT,                            -- NULL = all launches
  unsubscribe_token TEXT NOT NULL UNIQUE,    -- 64-char hex token
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ,              -- Track last notification sent
  is_active BOOLEAN DEFAULT TRUE,             -- Soft delete instead of hard delete
  site_ids TEXT                               -- JSON array of site IDs, NULL = all sites
);

-- Index for fast lookups
CREATE INDEX idx_email_hash ON email_subscriptions(email_hash);
CREATE INDEX idx_unsubscribe_token ON email_subscriptions(unsubscribe_token);
CREATE INDEX idx_active_subscriptions ON email_subscriptions(is_active) WHERE is_active = TRUE;

-- Row Level Security
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for API routes)
CREATE POLICY "Service role has full access" ON email_subscriptions
  FOR ALL USING (auth.role() = 'service_role');
