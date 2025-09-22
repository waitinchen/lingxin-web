CREATE TABLE memory_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    conversation_id UUID,
    summary_type VARCHAR(50) NOT NULL,
    summary_content JSONB NOT NULL,
    start_message_id UUID,
    end_message_id UUID,
    message_count INTEGER DEFAULT 0,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    emotion_analysis JSONB,
    key_topics TEXT[],
    preferences_extracted JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);