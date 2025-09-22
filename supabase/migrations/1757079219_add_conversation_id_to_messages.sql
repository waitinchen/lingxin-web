-- Migration: add_conversation_id_to_messages
-- Created at: 1757079219

ALTER TABLE messages ADD COLUMN conversation_id UUID;
ALTER TABLE messages ADD COLUMN role VARCHAR DEFAULT 'user';
ALTER TABLE messages ADD COLUMN content_type VARCHAR DEFAULT 'text';
ALTER TABLE messages ADD COLUMN tokens_used INTEGER;
ALTER TABLE messages ADD COLUMN model_used VARCHAR;
ALTER TABLE messages ADD COLUMN persona_id UUID;;