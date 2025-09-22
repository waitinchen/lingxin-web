CREATE TABLE personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avatar_url TEXT,
    personality_traits JSONB,
    core_values JSONB,
    communication_style JSONB,
    knowledge_domains TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_global BOOLEAN DEFAULT true,
    created_by UUID,
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);