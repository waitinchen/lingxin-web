-- Migration: fix_message_role_column
-- Created at: 1757079260

-- Update existing message_type values to match role expectations
UPDATE messages SET message_type = 'user' WHERE message_type IS NULL;
UPDATE messages SET role = message_type WHERE role IS NULL;
-- Drop the old column
ALTER TABLE messages DROP COLUMN IF EXISTS message_type;;