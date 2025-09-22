CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    full_name VARCHAR(255),
    nickname VARCHAR(100),
    avatar_url TEXT,
    timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
    language VARCHAR(10) DEFAULT 'zh-TW',
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(20),
    bio TEXT,
    preferences JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);