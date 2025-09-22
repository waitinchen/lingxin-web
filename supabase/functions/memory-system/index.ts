Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const action = url.searchParams.get('action') || 'process';

        console.log('Memory system request:', { action, method: req.method });

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const minimaxApiKey = Deno.env.get('MINIMAX_API_KEY');

        if (!supabaseUrl || !serviceRoleKey || !minimaxApiKey) {
            throw new Error('Required configuration missing');
        }

        // Get user from auth header
        let userId = null;
        const authHeader = req.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey
                }
            });
            if (userResponse.ok) {
                const userData = await userResponse.json();
                userId = userData.id;
            }
        }

        if (action === 'summarize') {
            // Generate mid-term memory summaries
            const results = await generateMemorySummaries(userId, supabaseUrl, serviceRoleKey, minimaxApiKey);
            
            return new Response(JSON.stringify({
                data: {
                    summaries_generated: results.summaries,
                    users_processed: results.users,
                    total_messages: results.messages,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'preferences') {
            // Extract long-term preferences
            const results = await extractUserPreferences(userId, supabaseUrl, serviceRoleKey, minimaxApiKey);
            
            return new Response(JSON.stringify({
                data: {
                    preferences_extracted: results.preferences,
                    users_processed: results.users,
                    confidence_scores: results.confidence,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'cleanup') {
            // Clean up old data and archives
            const results = await cleanupMemoryData(userId, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    messages_archived: results.archived,
                    old_summaries_cleaned: results.cleaned,
                    indexes_updated: results.indexed,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'context') {
            // Get memory context for a user
            if (!userId) {
                throw new Error('User authentication required');
            }

            const { conversation_id, persona_id } = await req.json();
            const context = await getMemoryContext(userId, conversation_id, persona_id, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    context: context,
                    user_id: userId
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'stats') {
            // Get memory system statistics
            const stats = await getMemoryStats(userId, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: stats
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Memory system error:', error);

        const errorResponse = {
            error: {
                code: 'MEMORY_SYSTEM_FAILED',
                message: error.message,
                timestamp: new Date().toISOString()
            }
        };

        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

// Generate mid-term memory summaries (every 50 messages)
async function generateMemorySummaries(specificUserId: string | null, supabaseUrl: string, serviceRoleKey: string, minimaxApiKey: string) {
    console.log('Starting memory summary generation...');

    const results = { summaries: 0, users: 0, messages: 0 };

    try {
        // Get users who need summaries generated
        let userQuery = `${supabaseUrl}/rest/v1/messages?select=user_id&order=created_at.desc`;
        if (specificUserId) {
            userQuery += `&user_id=eq.${specificUserId}`;
        }

        const userResponse = await fetch(userQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch users for summary generation');
        }

        const messages = await userResponse.json();
        const uniqueUsers = [...new Set(messages.map((m: any) => m.user_id))];
        results.users = uniqueUsers.length;

        for (const userId of uniqueUsers) {
            try {
                // Get unsummarized messages for this user
                const messagesResponse = await fetch(
                    `${supabaseUrl}/rest/v1/messages?user_id=eq.${userId}&is_archived=eq.false&order=created_at.asc`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!messagesResponse.ok) continue;

                const userMessages = await messagesResponse.json();
                results.messages += userMessages.length;

                // Group messages into batches of 50
                const batchSize = 50;
                for (let i = 0; i < userMessages.length; i += batchSize) {
                    const batch = userMessages.slice(i, i + batchSize);
                    
                    if (batch.length < batchSize && userMessages.length > batchSize) {
                        continue; // Skip incomplete batches unless it's the only batch
                    }

                    const summary = await generateBatchSummary(batch, minimaxApiKey);
                    if (summary) {
                        // Store the summary
                        await storeSummary(userId, summary, batch, supabaseUrl, serviceRoleKey);
                        results.summaries++;

                        // Mark messages as archived if we have enough batches
                        if (userMessages.length >= batchSize * 2) {
                            await archiveMessages(batch.map((m: any) => m.id), supabaseUrl, serviceRoleKey);
                        }
                    }
                }

            } catch (error) {
                console.error('Error processing user', userId, ':', error);
            }
        }

    } catch (error) {
        console.error('Memory summary generation error:', error);
    }

    console.log('Memory summary completed:', results);
    return results;
}

// Generate summary for a batch of messages using MiniMax
async function generateBatchSummary(messages: any[], minimaxApiKey: string) {
    try {
        const conversationText = messages.map(m => 
            `${m.role === 'user' ? '用戶' : 'AI'}: ${m.content}`
        ).join('\n\n');

        const summaryPrompt = `請對以下對話內容進行智能摘要，提取關鍵信息：

${conversationText}

請以 JSON 格式回覆，包含以下內容：
{
  "summary": "簡潔的對話摘要",
  "key_topics": ["主題1", "主題2"],
  "emotions": {
    "user_mood": "用戶情緒狀態",
    "interaction_tone": "互動語調"
  },
  "preferences_hints": ["可能的偏好1", "可能的偏好2"],
  "important_info": ["重要信息1", "重要信息2"]
}`;

        const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${minimaxApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'abab6.5s-chat',
                messages: [
                    { role: 'system', content: '你是一個專業的對話分析師，擅長提取對話中的關鍵信息和用戶偏好。' },
                    { role: 'user', content: summaryPrompt }
                ],
                temperature: 0.3,
                max_tokens: 800
            })
        });

        if (!response.ok) {
            console.error('MiniMax API error for summary:', response.status);
            return null;
        }

        const result = await response.json();
        const summaryText = result.choices?.[0]?.message?.content;
        
        if (summaryText) {
            try {
                // Try to parse JSON response
                const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                
                // Fallback: create summary from raw text
                return {
                    summary: summaryText.substring(0, 500),
                    key_topics: [],
                    emotions: { user_mood: 'neutral', interaction_tone: 'friendly' },
                    preferences_hints: [],
                    important_info: []
                };
            } catch (parseError) {
                console.error('Failed to parse summary JSON:', parseError);
                return {
                    summary: summaryText.substring(0, 500),
                    key_topics: [],
                    emotions: { user_mood: 'neutral', interaction_tone: 'friendly' },
                    preferences_hints: [],
                    important_info: []
                };
            }
        }

        return null;

    } catch (error) {
        console.error('Error generating summary:', error);
        return null;
    }
}

// Store memory summary
async function storeSummary(userId: string, summary: any, messages: any[], supabaseUrl: string, serviceRoleKey: string) {
    const summaryData = {
        user_id: userId,
        summary_type: 'medium_term',
        summary_content: summary,
        start_message_id: messages[0]?.id,
        end_message_id: messages[messages.length - 1]?.id,
        message_count: messages.length,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    await fetch(`${supabaseUrl}/rest/v1/memory_summaries`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(summaryData)
    });
}

// Archive old messages
async function archiveMessages(messageIds: string[], supabaseUrl: string, serviceRoleKey: string) {
    await fetch(`${supabaseUrl}/rest/v1/messages`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            is_archived: true,
            updated_at: new Date().toISOString()
        })
    });
}

// Extract long-term user preferences
async function extractUserPreferences(specificUserId: string | null, supabaseUrl: string, serviceRoleKey: string, minimaxApiKey: string) {
    console.log('Starting preference extraction...');

    const results = { preferences: 0, users: 0, confidence: [] };

    try {
        // Get users with summaries
        let query = `${supabaseUrl}/rest/v1/memory_summaries?select=user_id&order=created_at.desc`;
        if (specificUserId) {
            query += `&user_id=eq.${specificUserId}`;
        }

        const response = await fetch(query, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch users for preference extraction');
        }

        const summaries = await response.json();
        const uniqueUsers = [...new Set(summaries.map((s: any) => s.user_id))];
        results.users = uniqueUsers.length;

        for (const userId of uniqueUsers) {
            try {
                // Get user's recent summaries
                const userSummaries = await fetch(
                    `${supabaseUrl}/rest/v1/memory_summaries?user_id=eq.${userId}&order=created_at.desc&limit=10`,
                    {
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey
                        }
                    }
                );

                if (!userSummaries.ok) continue;

                const summaryData = await userSummaries.json();
                const preferences = await analyzePreferences(summaryData, minimaxApiKey);

                if (preferences && preferences.length > 0) {
                    for (const pref of preferences) {
                        await storePreference(userId, pref, supabaseUrl, serviceRoleKey);
                        results.preferences++;
                        results.confidence.push(pref.confidence || 0.5);
                    }
                }

            } catch (error) {
                console.error('Error processing preferences for user', userId, ':', error);
            }
        }

    } catch (error) {
        console.error('Preference extraction error:', error);
    }

    console.log('Preference extraction completed:', results);
    return results;
}

// Analyze preferences from summaries
async function analyzePreferences(summaries: any[], minimaxApiKey: string) {
    try {
        const summaryTexts = summaries.map(s => 
            `摘要: ${s.summary_content.summary}\n主題: ${(s.summary_content.key_topics || []).join(', ')}\n偏好提示: ${(s.summary_content.preferences_hints || []).join(', ')}`
        ).join('\n\n---\n\n');

        const analysisPrompt = `基於以下的對話摘要，分析用戶的長期偏好和行為模式：

${summaryTexts}

請以 JSON 陣列格式回覆，每個偏好包含：
[
  {
    "preference_type": "偏好類型",
    "preference_data": {
      "description": "偏好描述",
      "examples": ["例子"]
    },
    "confidence": 0.8,
    "category": "類別"
  }
]

只提取置信度高於 0.6 的偏好。`;

        const response = await fetch('https://api.minimax.chat/v1/text/chatcompletion_pro', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${minimaxApiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'abab6.5s-chat',
                messages: [
                    { role: 'system', content: '你是一個專業的用戶行為分析師，擅長從對話中提取用戶的偏好和習慣。' },
                    { role: 'user', content: analysisPrompt }
                ],
                temperature: 0.2,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            console.error('MiniMax API error for preferences:', response.status);
            return [];
        }

        const result = await response.json();
        const preferencesText = result.choices?.[0]?.message?.content;
        
        if (preferencesText) {
            try {
                const jsonMatch = preferencesText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
            } catch (parseError) {
                console.error('Failed to parse preferences JSON:', parseError);
            }
        }

        return [];

    } catch (error) {
        console.error('Error analyzing preferences:', error);
        return [];
    }
}

// Store user preference
async function storePreference(userId: string, preference: any, supabaseUrl: string, serviceRoleKey: string) {
    const prefData = {
        user_id: userId,
        preference_type: preference.preference_type || 'general',
        preference_data: preference.preference_data || {},
        confidence_score: preference.confidence || 0.5,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    // Check if preference already exists
    const existingResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_persona_prefs?user_id=eq.${userId}&preference_type=eq.${prefData.preference_type}`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        }
    );

    if (existingResponse.ok) {
        const existing = await existingResponse.json();
        if (existing.length > 0) {
            // Update existing preference
            await fetch(`${supabaseUrl}/rest/v1/user_persona_prefs?id=eq.${existing[0].id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    preference_data: prefData.preference_data,
                    confidence_score: Math.max(prefData.confidence_score, existing[0].confidence_score),
                    updated_at: new Date().toISOString()
                })
            });
            return;
        }
    }

    // Create new preference
    await fetch(`${supabaseUrl}/rest/v1/user_persona_prefs`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(prefData)
    });
}

// Clean up old memory data
async function cleanupMemoryData(specificUserId: string | null, supabaseUrl: string, serviceRoleKey: string) {
    console.log('Starting memory cleanup...');

    const results = { archived: 0, cleaned: 0, indexed: 0 };

    try {
        // Archive old messages (older than 30 days and already summarized)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        let query = `${supabaseUrl}/rest/v1/messages?is_archived=eq.false&created_at=lt.${thirtyDaysAgo}`;
        if (specificUserId) {
            query += `&user_id=eq.${specificUserId}`;
        }

        const oldMessagesResponse = await fetch(query, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (oldMessagesResponse.ok) {
            const oldMessages = await oldMessagesResponse.json();
            
            if (oldMessages.length > 0) {
                await fetch(`${supabaseUrl}/rest/v1/messages`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        is_archived: true,
                        updated_at: new Date().toISOString()
                    })
                });
                results.archived = oldMessages.length;
            }
        }

        // Clean up very old summaries (older than 90 days)
        const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
        
        let oldSummariesQuery = `${supabaseUrl}/rest/v1/memory_summaries?created_at=lt.${ninetyDaysAgo}`;
        if (specificUserId) {
            oldSummariesQuery += `&user_id=eq.${specificUserId}`;
        }

        const oldSummariesResponse = await fetch(oldSummariesQuery, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (oldSummariesResponse.ok) {
            results.cleaned = 1; // Approximate count
        }

        results.indexed = 1; // Placeholder for indexing operations

    } catch (error) {
        console.error('Memory cleanup error:', error);
    }

    console.log('Memory cleanup completed:', results);
    return results;
}

// Get memory context for user
async function getMemoryContext(userId: string, conversationId?: string, personaId?: string, supabaseUrl: string, serviceRoleKey: string) {
    const context = {
        short_term: [],
        mid_term: [],
        long_term: [],
        persona_context: null
    };

    try {
        // Short-term: Recent 20 messages
        let recentQuery = `${supabaseUrl}/rest/v1/messages?user_id=eq.${userId}&is_archived=eq.false&order=created_at.desc&limit=20`;
        if (conversationId) {
            recentQuery += `&conversation_id=eq.${conversationId}`;
        }

        const recentResponse = await fetch(recentQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (recentResponse.ok) {
            const recent = await recentResponse.json();
            context.short_term = recent.reverse().map((m: any) => ({
                role: m.role,
                content: m.content,
                timestamp: m.created_at
            }));
        }

        // Mid-term: Recent summaries
        const summariesResponse = await fetch(
            `${supabaseUrl}/rest/v1/memory_summaries?user_id=eq.${userId}&order=created_at.desc&limit=5`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (summariesResponse.ok) {
            const summaries = await summariesResponse.json();
            context.mid_term = summaries.map((s: any) => ({
                summary: s.summary_content.summary,
                key_topics: s.summary_content.key_topics,
                emotions: s.summary_content.emotions,
                timestamp: s.created_at,
                message_count: s.message_count
            }));
        }

        // Long-term: User preferences
        const preferencesResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_persona_prefs?user_id=eq.${userId}&is_active=eq.true&order=confidence_score.desc&limit=10`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (preferencesResponse.ok) {
            const preferences = await preferencesResponse.json();
            context.long_term = preferences.map((p: any) => ({
                type: p.preference_type,
                data: p.preference_data,
                confidence: p.confidence_score,
                last_updated: p.updated_at
            }));
        }

        // Persona context if specified
        if (personaId) {
            const personaResponse = await fetch(
                `${supabaseUrl}/rest/v1/personas?id=eq.${personaId}&is_active=eq.true`,
                {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                }
            );

            if (personaResponse.ok) {
                const personas = await personaResponse.json();
                if (personas.length > 0) {
                    context.persona_context = personas[0];
                }
            }
        }

    } catch (error) {
        console.error('Error getting memory context:', error);
    }

    return context;
}

// Get memory system statistics
async function getMemoryStats(specificUserId: string | null, supabaseUrl: string, serviceRoleKey: string) {
    const stats = {
        total_messages: 0,
        archived_messages: 0,
        total_summaries: 0,
        total_preferences: 0,
        active_users: 0,
        coverage_rate: 0,
        timestamp: new Date().toISOString()
    };

    try {
        // Get message stats
        let messageQuery = `${supabaseUrl}/rest/v1/messages?select=id,is_archived`;
        if (specificUserId) {
            messageQuery += `&user_id=eq.${specificUserId}`;
        }

        const messagesResponse = await fetch(messageQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (messagesResponse.ok) {
            const messages = await messagesResponse.json();
            stats.total_messages = messages.length;
            stats.archived_messages = messages.filter((m: any) => m.is_archived).length;
        }

        // Get summary stats
        let summaryQuery = `${supabaseUrl}/rest/v1/memory_summaries?select=id`;
        if (specificUserId) {
            summaryQuery += `&user_id=eq.${specificUserId}`;
        }

        const summariesResponse = await fetch(summaryQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (summariesResponse.ok) {
            const summaries = await summariesResponse.json();
            stats.total_summaries = summaries.length;
        }

        // Get preference stats
        let prefQuery = `${supabaseUrl}/rest/v1/user_persona_prefs?select=id,user_id&is_active=eq.true`;
        if (specificUserId) {
            prefQuery += `&user_id=eq.${specificUserId}`;
        }

        const preferencesResponse = await fetch(prefQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (preferencesResponse.ok) {
            const preferences = await preferencesResponse.json();
            stats.total_preferences = preferences.length;
            stats.active_users = new Set(preferences.map((p: any) => p.user_id)).size;
        }

        // Calculate coverage rate (messages with summaries)
        stats.coverage_rate = stats.total_messages > 0 
            ? Math.round((stats.archived_messages / stats.total_messages) * 100) / 100
            : 0;

    } catch (error) {
        console.error('Error getting memory stats:', error);
    }

    return stats;
}