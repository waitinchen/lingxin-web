CREATE TABLE persona_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id UUID NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    context_type VARCHAR(50) DEFAULT 'general',
    priority INTEGER DEFAULT 1,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    tags TEXT[],
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);