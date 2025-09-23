CREATE TABLE spirit_events (
    id BIGSERIAL PRIMARY KEY,
    spirit_id UUID NOT NULL REFERENCES user_spirits(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    payload JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE spirit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "events by owner" ON spirit_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM user_spirits s
            WHERE s.id = spirit_id
              AND s.owner_id = auth.uid()
        )
    );
