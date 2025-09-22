CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_sign_in_at TIMESTAMPTZ,
    email_confirmed_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true
);