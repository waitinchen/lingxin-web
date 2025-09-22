CREATE TABLE guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    rule_content JSONB NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium',
    is_global BOOLEAN DEFAULT true,
    applies_to_personas UUID[],
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);