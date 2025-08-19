-- Migration to add last_activity column to user_sessions table
-- This script adds support for tracking user activity for active users metric

-- Add last_activity column if it doesn't exist
ALTER TABLE user_sessions ADD COLUMN last_activity DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions (last_activity);

-- Update existing sessions to have last_activity set to created_at
UPDATE user_sessions SET last_activity = created_at WHERE last_activity IS NULL;
