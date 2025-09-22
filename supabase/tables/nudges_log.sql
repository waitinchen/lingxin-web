CREATE TABLE nudges_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nudge_id UUID,
    user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    scheduled_time TIMESTAMPTZ,
    executed_time TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    delivery_channel VARCHAR(50) DEFAULT 'ics',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);