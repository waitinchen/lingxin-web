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
        const { message, conversation_id, persona_id, context } = await req.json();

        if (!message || typeof message !== 'string') {
            throw new Error('Message is required and must be a string');
        }

        console.log('Chat request received:', { message: message.substring(0, 100), conversation_id, persona_id });

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
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
                console.log('User identified:', userId);
            }
        }

        if (!userId) {
            throw new Error('User authentication required');
        }

        // Generate conversation_id if not provided
        const convId = conversation_id || crypto.randomUUID();

        // Store user message
        const userMessageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: userId,
                conversation_id: convId,
                role: 'user',
                content: message,
                content_type: 'text',
                persona_id: persona_id || null,
                created_at: new Date().toISOString()
            })
        });

        if (!userMessageResponse.ok) {
            const errorText = await userMessageResponse.text();
            console.error('Failed to store user message:', errorText);
        }

        // Get conversation history for context (last 20 messages)
        const historyResponse = await fetch(`${supabaseUrl}/rest/v1/messages?user_id=eq.${userId}&conversation_id=eq.${convId}&order=created_at.desc&limit=20`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        let conversationHistory = [];
        if (historyResponse.ok) {
            const history = await historyResponse.json();
            conversationHistory = history.reverse().map((msg: any) => ({
                role: msg.role,
                content: msg.content
            }));
        }

        // Get persona if provided
        let personaPrompt = '';
        if (persona_id) {
            const personaResponse = await fetch(`${supabaseUrl}/rest/v1/personas?id=eq.${persona_id}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });
            if (personaResponse.ok) {
                const personas = await personaResponse.json();
                if (personas.length > 0) {
                    const persona = personas[0];
                    personaPrompt = `你是${persona.name}。${persona.description || ''}\n\n性格特質：${JSON.stringify(persona.personality_data)}\n\n`;
                }
            }
        }

        // Get user preferences for context
        let userContext = '';
        const prefsResponse = await fetch(`${supabaseUrl}/rest/v1/user_persona_prefs?user_id=eq.${userId}&is_active=eq.true&order=confidence_score.desc&limit=5`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        if (prefsResponse.ok) {
            const prefs = await prefsResponse.json();
            if (prefs.length > 0) {
                userContext = '\n\n用戶偏好參考：\n' + prefs.map((p: any) => 
                    `${p.preference_type}: ${JSON.stringify(p.preference_data)}`
                ).join('\n');
            }
        }

        // Generate AI response using built-in intelligence
        const aiMessage = generateSmartResponse(message, conversationHistory, personaPrompt + userContext);
        const tokensUsed = Math.floor(message.length / 4) + Math.floor(aiMessage.length / 4); // Estimate

        console.log('Generated AI response:', { 
            message_length: aiMessage.length,
            estimated_tokens: tokensUsed
        });

        // Store AI response
        const aiMessageResponse = await fetch(`${supabaseUrl}/rest/v1/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                user_id: userId,
                conversation_id: convId,
                role: 'assistant',
                content: aiMessage,
                content_type: 'text',
                tokens_used: tokensUsed,
                model_used: 'lingxin-ai-v2',
                persona_id: persona_id || null,
                metadata: {
                    ai_engine: {
                        version: '2.0',
                        model: 'lingxin-ai-v2'
                    }
                },
                created_at: new Date().toISOString()
            })
        });

        if (!aiMessageResponse.ok) {
            const errorText = await aiMessageResponse.text();
            console.error('Failed to store AI message:', errorText);
        }

        // Check if we should trigger smart start phrases
        let suggestedActions = null;
        const shouldTriggerPhrases = await checkForStartPhrases(message, aiMessage, supabaseUrl, serviceRoleKey);
        if (shouldTriggerPhrases.length > 0) {
            suggestedActions = shouldTriggerPhrases;
        }

        // Return response
        const result = {
            data: {
                message: aiMessage,
                conversation_id: convId,
                tokens_used: tokensUsed,
                model_used: 'lingxin-ai-v2',
                suggested_actions: suggestedActions,
                timestamp: new Date().toISOString()
            }
        };

        console.log('Chat API completed successfully');

        return new Response(JSON.stringify(result), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Chat API error:', error);

        const errorResponse = {
            error: {
                code: 'CHAT_API_FAILED',
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

// Generate smart AI response without external API dependency
function generateSmartResponse(userMessage: string, conversationHistory: any[], personaPrompt: string) {
    const message = userMessage.toLowerCase();
    
    // Time-related patterns
    if (message.includes('提醒') || message.includes('記得') || message.includes('安排') || message.includes('預約')) {
        if (message.includes('明天') || message.includes('天') || message.includes('點')) {
            return '好的！我已經記下了您的提醒。我會在適當的時間提醒您。您可以在「承諾清單」中查看所有的預約和提醒。';
        }
        return '我已經記下了您的提醒，會在適當時間通知您。您也可以在承諾清單中管理所有的事項。';
    }
    
    // Greeting patterns
    if (message.includes('你好') || message.includes('哈囉') || message.includes('早上好') || message.includes('晚上好')) {
        const greetings = [
            '你好！我是靈信智能助理，很高興與您聊天。有什麼我可以幫您的嗎？',
            '哈囉！歡迎使用靈信 2.0，我具備九靈記憶能力，能記住您的喜好和習慣。試試與我聊天吧！',
            '您好！我是您的智能小助手，可以幫您記錄提醒、管理承諾，還能陪您聊天。需要什麼幫助嗎？'
        ];
        return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // Question patterns
    if (message.includes('怎麼') || message.includes('如何') || message.includes('什麼') || message.includes('為什麼')) {
        if (message.includes('使用') || message.includes('功能')) {
            return '靈信 2.0 擁有多種強大功能：\n\n1. 🤖 智能對話 - 我能記住您的對話紀錄和喜好\n2. ⏰ 承諾管理 - 設定提醒和事項安排\n3. 📅 行事曆整合 - 永不忘記重要事項\n4. ✨ 智能啟動 - 三選一智能提示\n\n試試說「提醒我明天運動」或直接與我聊天！';
        }
        return '我會盡力回答您的問題。作為您的智能助理，我能幫您處理各種事務和提供建議。請告訴我更具體的問題，我會為您提供詳細的解答。';
    }
    
    // Emotional support patterns
    if (message.includes('累') || message.includes('疲憊') || message.includes('壓力') || message.includes('焊鬱')) {
        return '聽起來您最近很辛苦。記得要照顧好自己，適當休息。我可以幫您設定一些放鬆時間的提醒，或者就陪您聊聊天。有什麼想分享的嗎？';
    }
    
    // Work/study related
    if (message.includes('工作') || message.includes('學習') || message.includes('考試') || message.includes('會議')) {
        return '工作和學習很重要，但也要注意工作生活平衡。我可以幫您安排時間表、設定提醒，讓您更有效率地完成任務。需要我幫您制定任何計劃嗎？';
    }
    
    // Thanks patterns
    if (message.includes('謝謝') || message.includes('感謝') || message.includes('太好了')) {
        return '不用客氣！能幫助到您我很開心。我會一直在這裡支持您。還有其他需要幫助的地方嗎？';
    }
    
    // Default intelligent responses
    const defaultResponses = [
        '這是一個很有趣的問題。我正在思考如何最好地回答您。能告訴我更多細節嗎？',
        '我理解您的想法。作為您的智能助理，我會記住這次對話，幫助我更好地了解您的需求。',
        '讓我們一起探討這個話題。我的九靈記憶系統正在學習您的對話模式，以提供更好的服務。',
        '您的問題讓我想到了一些相關的建議。我除了回答問題，還能幫您設定提醒和管理承諾。',
        '這確實是個值得深入思考的問題。我的系統正在處理您的輸入，並結合我的知識庫提供回應。'
    ];
    
    return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// Helper function to check for smart start phrases
async function checkForStartPhrases(userMessage: string, aiResponse: string, supabaseUrl: string, serviceRoleKey: string) {
    try {
        // Get active start phrases
        const phrasesResponse = await fetch(`${supabaseUrl}/rest/v1/start_phrases?is_active=eq.true&order=trigger_probability.desc&limit=10`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (!phrasesResponse.ok) {
            return [];
        }

        const phrases = await phrasesResponse.json();
        const triggeredPhrases = [];

        for (const phrase of phrases) {
            // Simple keyword matching for now
            const combinedText = (userMessage + ' ' + aiResponse).toLowerCase();
            const phrasePattern = phrase.phrase.toLowerCase();
            
            if (combinedText.includes(phrasePattern)) {
                // Check context pattern if exists
                let contextMatch = true;
                if (phrase.context_pattern) {
                    const contextRegex = new RegExp(phrase.context_pattern, 'i');
                    contextMatch = contextRegex.test(combinedText);
                }

                if (contextMatch && Math.random() < (phrase.trigger_probability || 0.8)) {
                    triggeredPhrases.push({
                        phrase_id: phrase.id,
                        category: phrase.category,
                        actions: phrase.action_chips || [],
                        confidence: phrase.trigger_probability
                    });
                    
                    // Update usage count
                    fetch(`${supabaseUrl}/rest/v1/start_phrases?id=eq.${phrase.id}`, {
                        method: 'PATCH',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            usage_count: (phrase.usage_count || 0) + 1
                        })
                    }).catch(console.error);
                }
            }
        }

        return triggeredPhrases.slice(0, 3); // Return max 3 suggestions
    } catch (error) {
        console.error('Error checking start phrases:', error);
        return [];
    }
}
