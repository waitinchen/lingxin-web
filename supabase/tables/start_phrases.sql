CREATE TABLE start_phrases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phrase TEXT NOT NULL,
    intent_category VARCHAR(100) NOT NULL,
    context_triggers TEXT[],
    confidence_threshold FLOAT DEFAULT 0.7,
    response_suggestions TEXT[],
    auto_trigger BOOLEAN DEFAULT false,
    priority INTEGER DEFAULT 1,
    usage_count INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(phrase,
    intent_category)
);