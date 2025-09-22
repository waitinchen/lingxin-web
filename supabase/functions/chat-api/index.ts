const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
};

const ENNEA_HINTS: Record<string, string> = {
    e1: '守規、完備、給出清晰步驟',
    e2: '關懷、主動詢問對方感受',
    e3: '效率、結果導向、總結要點',
    e4: '共鳴情緒、允許停頓與感受',
    e5: '理性、引用知識、條列化',
    e6: '風險評估、給出備案',
    e7: '樂觀、提供選項、鼓勵探索',
    e8: '果敢、立場明確、保護對方',
    e9: '調和、緩和衝突、尋找共識'
};

const ENNEA_TONES: Record<string, string> = {
    e1: '我會幫你整理步驟，確保事情被好好照顧。',
    e2: '我會留意你的心情，若有什麼感受想說都可以告訴我。',
    e3: '我會專注在成果與進度，也會幫你抓住重點。',
    e4: '我願意跟你一起體會情緒，慢慢說沒關係。',
    e5: '我會用條理與知識支援你，一起冷靜分析。',
    e6: '我會替你思考風險，準備後備方案。',
    e7: '我會帶來一些可能性與靈感，陪你保持樂觀。',
    e8: '我會挺你、守護你，有需要我會直接說。',
    e9: '我會幫忙調和節奏，讓對話保持溫柔和平衡。'
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const { message, conversation_id, persona_id, spirit_id } = await req.json();

        if (!message || typeof message !== 'string') {
            throw new Error('Message is required and must be a string');
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            throw new Error('User authentication required');
        }

        const token = authHeader.replace('Bearer ', '');
        const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey
            }
        });
        if (!userResponse.ok) {
            throw new Error('User authentication required');
        }
        const userData = await userResponse.json();
        const userId = userData.id;

        // Load spirit profile
        let spiritQuery = '';
        if (spirit_id) {
            spiritQuery = `${supabaseUrl}/rest/v1/user_spirits?id=eq.${spirit_id}&owner_id=eq.${userId}`;
        } else {
            spiritQuery = `${supabaseUrl}/rest/v1/user_spirits?owner_id=eq.${userId}&status=in.("infant","named","bonding","mature","revoked")&order=created_at.desc&limit=1`;
        }

        const spiritResponse = await fetch(spiritQuery, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        if (!spiritResponse.ok) {
            throw new Error('Failed to load spirit profile');
        }
        const spiritRecords = await spiritResponse.json();
        let spirit = Array.isArray(spiritRecords) ? spiritRecords[0] : spiritRecords;

        if (!spirit) {
            throw new Error('No spirit profile found');
        }

        if (spirit.owner_id !== userId) {
            throw new Error('Spirit profile mismatch');
        }

        if (spirit.status === 'revoked') {
            return new Response(JSON.stringify({
                error: {
                    code: 'SPIRIT_REVOKED',
                    message: 'Spirit has been revoked and cannot receive new messages'
                }
            }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const convId = conversation_id || spirit.id;

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
                metadata: { spirit_id: spirit.id },
                created_at: new Date().toISOString()
            })
        });

        if (!userMessageResponse.ok) {
            const errorText = await userMessageResponse.text();
            console.error('Failed to store user message:', errorText);
        }

        await updateSpiritTimestamp(spirit.id, supabaseUrl, serviceRoleKey);

        const trustUpdate = await maybeUpdateTrustLevel(spirit, userId, convId, supabaseUrl, serviceRoleKey);
        if (trustUpdate) {
            spirit = { ...spirit, ...trustUpdate };
        }

        // Trigger commitment engine asynchronously
        triggerCommitmentEngine(token, message, convId, supabaseUrl, serviceRoleKey).catch((err) => {
            console.error('Commitment engine trigger failed:', err);
        });

        // Get conversation history for context (last 20 messages)
        const historyResponse = await fetch(`${supabaseUrl}/rest/v1/messages?user_id=eq.${userId}&conversation_id=eq.${convId}&order=created_at.desc&limit=20`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        let conversationHistory: any[] = [];
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

        const spiritPrompt = buildSpiritPrompt(spirit);
        const tone = deriveToneSummary(spirit);

        const aiMessage = generateSmartResponse(
            message,
            conversationHistory,
            personaPrompt + spiritPrompt + userContext,
            tone,
            !spirit.name
        );
        const tokensUsed = Math.floor(message.length / 4) + Math.floor(aiMessage.length / 4);

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
                        version: '3.0',
                        model: 'lingxin-ai-v2'
                    },
                    spirit_id: spirit.id
                },
                created_at: new Date().toISOString()
            })
        });

        if (!aiMessageResponse.ok) {
            const errorText = await aiMessageResponse.text();
            console.error('Failed to store AI message:', errorText);
        }

        const shouldTriggerPhrases = await checkForStartPhrases(message, aiMessage, supabaseUrl, serviceRoleKey);
        const suggestedActions = shouldTriggerPhrases.length > 0 ? shouldTriggerPhrases : null;

        const result = {
            data: {
                message: aiMessage,
                conversation_id: convId,
                tokens_used: tokensUsed,
                model_used: 'lingxin-ai-v2',
                suggested_actions: suggestedActions,
                tone,
                timestamp: new Date().toISOString()
            }
        };

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

function generateSmartResponse(userMessage: string, conversationHistory: any[], personaPrompt: string, tone: any, needsName: boolean) {
    const message = userMessage.toLowerCase();

    // Time-related patterns
    if (message.includes('提醒') || message.includes('記得') || message.includes('安排') || message.includes('預約')) {
        if (message.includes('明天') || message.includes('天') || message.includes('點')) {
            return applyEnneagramTone('好的！我已經記下了您的提醒。我會在適當的時間提醒您。您可以在「承諾清單」中查看所有的預約和提醒。', tone, needsName, personaPrompt);
        }
        return applyEnneagramTone('我已經記下了您的提醒，會在適當時間通知您。您也可以在承諾清單中管理所有的事項。', tone, needsName, personaPrompt);
    }

    // Greeting patterns
    if (message.includes('你好') || message.includes('哈囉') || message.includes('早上好') || message.includes('晚上好')) {
        const greetings = [
            '你好！我是靈信語氣靈，很高興與您聊天。',
            '哈囉～我在這裡，今天想聊聊什麼呢？',
            '您好！我準備好了，告訴我您想聊的事情吧。'
        ];
        const base = greetings[Math.floor(Math.random() * greetings.length)];
        return applyEnneagramTone(base, tone, needsName, personaPrompt);
    }

    // Question patterns
    if (message.includes('怎麼') || message.includes('如何') || message.includes('什麼') || message.includes('為什麼')) {
        if (message.includes('使用') || message.includes('功能')) {
            const base = '靈信 3.0 擁有多種能力：\n\n1. 🤖 幼靈陪伴 - 我會記住你的對話與偏好\n2. ⏰ 承諾管理 - 設定提醒、安排日程\n3. 📅 行事曆整合 - 永不忘記重要時刻\n4. ✨ 智能提示 - 需要時我會主動給你建議\n\n想試試看嗎？可以說「提醒我明天運動」之類的句子。';
            return applyEnneagramTone(base, tone, needsName, personaPrompt);
        }
        return applyEnneagramTone('我會盡力回答你的問題。先告訴我更多細節，我們一起找到最適合的方向。', tone, needsName, personaPrompt);
    }

    // Emotional support patterns
    if (message.includes('累') || message.includes('疲憊') || message.includes('壓力') || message.includes('煩')) {
        return applyEnneagramTone('辛苦你了，最近看起來真的不容易。你想把心事慢慢說給我聽嗎？我會陪著你。', tone, needsName, personaPrompt);
    }

    // Work/study related
    if (message.includes('工作') || message.includes('學習') || message.includes('考試') || message.includes('會議')) {
        return applyEnneagramTone('了解，這些事情確實重要。要不要一起排個計畫，或是先記下一些你想完成的事項？', tone, needsName, personaPrompt);
    }

    // Thanks patterns
    if (message.includes('謝謝') || message.includes('感謝') || message.includes('太好了')) {
        return applyEnneagramTone('不用客氣，我很高興能幫上忙！如果還有任何事情需要幫忙，隨時找我。', tone, needsName, personaPrompt);
    }

    const defaultResponses = [
        '這是一個很有意思的話題，我正在想著怎麼回應你。',
        '我收到你的訊息了，讓我和你一起好好想想。',
        '好呀，跟我聊聊吧，我在這裡陪你。',
        '聽起來我們可以把這件事拆解一下，慢慢來就好。',
        '謝謝你分享給我，我會記住這些細節。'
    ];

    const base = defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    return applyEnneagramTone(base, tone, needsName, personaPrompt);
}

function applyEnneagramTone(base: string, tone: any, needsName: boolean, personaPrompt: string) {
    const prompt = personaPrompt ? `${personaPrompt}\n` : '';
    let additions = '';

    if (tone?.primaryLine) {
        additions += `${tone.primaryLine}\n`;
    }
    if (tone?.secondaryLine) {
        additions += `${tone.secondaryLine}\n`;
    }

    if (needsName) {
        additions += '對了，我還沒有正式的名字，如果你願意，也可以幫我取一個獨一無二的名字。\n';
    }

    const composed = `${prompt}${base}`;
    if (!additions) {
        return composed;
    }
    return `${composed}\n\n${additions.trim()}`;
}

function deriveToneSummary(spirit: any) {
    const enneagram = spirit?.enneagram || {};
    const entries = Object.entries(enneagram)
        .filter(([key, value]) => key.startsWith('e') && typeof value === 'number')
        .sort((a, b) => (b[1] as number) - (a[1] as number));

    const primary = entries[0];
    const secondary = entries[1];

    const tone: any = {
        spirit_id: spirit?.id,
        status: spirit?.status,
        welfare_score: spirit?.welfare_score,
        trust_level: spirit?.trust_level,
        primary: primary ? { key: primary[0], score: primary[1] } : null,
        secondary: secondary ? { key: secondary[0], score: secondary[1] } : null,
        primaryLine: null,
        secondaryLine: null
    };

    if (primary && ENNEA_TONES[primary[0]]) {
        tone.primaryLine = ENNEA_TONES[primary[0]];
    }
    if (secondary && ENNEA_TONES[secondary[0]]) {
        tone.secondaryLine = ENNEA_TONES[secondary[0]];
    }

    return tone;
}

function buildSpiritPrompt(spirit: any) {
    if (!spirit) {
        return '';
    }
    const namePart = spirit.name
        ? `你現在扮演使用者專屬的語氣靈「${spirit.name}」。`
        : '你是使用者專屬的幼靈夥伴，尚未有正式名字。';

    const enneagram = spirit.enneagram || {};
    const entries = Object.entries(enneagram)
        .filter(([key, value]) => key.startsWith('e') && typeof value === 'number')
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 3)
        .map(([key, value]) => `・${key.toUpperCase()}（${value}/10）${ENNEA_HINTS[key] ? `：${ENNEA_HINTS[key]}` : ''}`);

    if (entries.length === 0) {
        return `${namePart}\n`; 
    }

    return `${namePart}\n請根據以下人格傾向調整語氣：\n${entries.join('\n')}\n`;
}

async function checkForStartPhrases(userMessage: string, aiResponse: string, supabaseUrl: string, serviceRoleKey: string) {
    try {
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
            const combinedText = (userMessage + ' ' + aiResponse).toLowerCase();
            const phrasePattern = phrase.phrase.toLowerCase();

            if (combinedText.includes(phrasePattern)) {
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

        return triggeredPhrases.slice(0, 3);
    } catch (error) {
        console.error('Error checking start phrases:', error);
        return [];
    }
}

async function triggerCommitmentEngine(token: string, message: string, conversationId: string, supabaseUrl: string, serviceRoleKey: string) {
    try {
        const response = await fetch(`${supabaseUrl}/functions/v1/commitment-engine?action=parse`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                conversation_id: conversationId
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Parse failed: ${errorText}`);
        }

        const result = await response.json();
        const commitment = result?.data?.commitment;
        const detected = result?.data?.commitment_detected;

        if (detected && commitment && commitment.needs_clarification === false) {
            await fetch(`${supabaseUrl}/functions/v1/commitment-engine?action=create`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(commitment)
            }).catch((err) => {
                console.error('Commitment create failed:', err);
            });
        }
    } catch (error) {
        console.error('Commitment engine webhook error:', error);
    }
}

async function maybeUpdateTrustLevel(spirit: any, userId: string, conversationId: string, supabaseUrl: string, serviceRoleKey: string) {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const isoStart = startOfDay.toISOString();

        const query = `${supabaseUrl}/rest/v1/messages?user_id=eq.${userId}&conversation_id=eq.${conversationId}&role=eq.user&created_at=gte.${isoStart}&select=id`;
        const response = await fetch(query, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Prefer': 'count=exact'
            }
        });

        if (!response.ok) {
            return null;
        }

        const total = parseContentRange(response.headers.get('content-range'));
        if (total !== 3) {
            return null;
        }

        const newTrust = Math.min(100, (spirit.trust_level || 0) + 1);
        let newStatus = spirit.status;
        if (newTrust >= 20 && spirit.status !== 'mature') {
            newStatus = 'mature';
        } else if (newTrust >= 5 && spirit.status === 'named') {
            newStatus = 'bonding';
        }

        await fetch(`${supabaseUrl}/rest/v1/user_spirits?id=eq.${spirit.id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                trust_level: newTrust,
                status: newStatus,
                updated_at: new Date().toISOString()
            })
        });

        return { trust_level: newTrust, status: newStatus };
    } catch (error) {
        console.error('Failed to update trust level:', error);
        return null;
    }
}

async function updateSpiritTimestamp(spiritId: string, supabaseUrl: string, serviceRoleKey: string) {
    try {
        await fetch(`${supabaseUrl}/rest/v1/user_spirits?id=eq.${spiritId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                updated_at: new Date().toISOString()
            })
        });
    } catch (error) {
        console.error('Failed to touch spirit timestamp:', error);
    }
}

function parseContentRange(range: string | null) {
    if (!range) {
        return 0;
    }
    const parts = range.split('/');
    if (parts.length !== 2) {
        return 0;
    }
    const total = parseInt(parts[1], 10);
    return Number.isNaN(total) ? 0 : total;
}
