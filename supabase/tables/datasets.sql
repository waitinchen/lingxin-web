CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    data_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    tags TEXT[],
    source_type VARCHAR(50) DEFAULT 'manual',
    is_public BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    version INTEGER DEFAULT 1,
    file_size BIGINT,
    last_accessed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);