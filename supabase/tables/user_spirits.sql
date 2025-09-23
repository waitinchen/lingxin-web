CREATE TABLE user_spirits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    enneagram JSONB NOT NULL,
    persona_locked BOOLEAN NOT NULL DEFAULT true,
    welfare_score INT NOT NULL DEFAULT 100,
    trust_level INT NOT NULL DEFAULT 0,
    dialogue_count INT NOT NULL DEFAULT 0,
    persona_badges JSONB NOT NULL DEFAULT '[]'::jsonb,
    status TEXT NOT NULL DEFAULT 'infant',
    revoke_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_spirits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "my spirits" ON user_spirits
    FOR SELECT
    USING (auth.uid() = owner_id);

CREATE POLICY "my spirits write" ON user_spirits
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "my spirits update" ON user_spirits
    FOR UPDATE
    USING (auth.uid() = owner_id);
