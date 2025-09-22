CREATE TABLE audit_login_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    location_data JSONB,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    session_id VARCHAR(255),
    provider VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);