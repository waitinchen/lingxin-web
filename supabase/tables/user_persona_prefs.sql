CREATE TABLE user_persona_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    persona_id UUID,
    preference_key VARCHAR(100) NOT NULL,
    preference_value JSONB NOT NULL,
    confidence_score FLOAT DEFAULT 0.0,
    source_type VARCHAR(50) DEFAULT 'conversation',
    extracted_at TIMESTAMPTZ DEFAULT NOW(),
    last_reinforced_at TIMESTAMPTZ,
    frequency_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id,
    persona_id,
    preference_key)
);