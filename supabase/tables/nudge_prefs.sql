CREATE TABLE nudge_prefs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    dnd_enabled BOOLEAN DEFAULT false,
    dnd_start_time TIME DEFAULT '22:00:00',
    dnd_end_time TIME DEFAULT '08:00:00',
    daily_limit INTEGER DEFAULT 3,
    preferred_channels TEXT[] DEFAULT '{"ics"}',
    timezone VARCHAR(50) DEFAULT 'Asia/Taipei',
    quiet_weekends BOOLEAN DEFAULT false,
    custom_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);