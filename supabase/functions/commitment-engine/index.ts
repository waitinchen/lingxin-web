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

        console.log('Commitment engine request:', { action, method: req.method });

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
            }
        }

        if (!userId) {
            throw new Error('User authentication required');
        }

        if (action === 'parse') {
            // Parse user message for commitment intent
            const { message, conversation_id } = await req.json();
            
            if (!message) {
                throw new Error('Message is required');
            }

            console.log('Parsing commitment from message:', message.substring(0, 100));

            const commitment = await parseCommitmentIntent(message, userId, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    commitment_detected: commitment !== null,
                    commitment: commitment,
                    requires_clarification: commitment?.status === 'needs_clarification',
                    suggestions: commitment?.suggestions || null
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'create') {
            // Create a new commitment
            const commitmentData = await req.json();
            
            const commitment = await createCommitment(userId, commitmentData, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    commitment: commitment,
                    ics_updated: true
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'list') {
            // List user's commitments
            const status = url.searchParams.get('status') || 'all';
            const limit = parseInt(url.searchParams.get('limit') || '50');
            
            const commitments = await listCommitments(userId, status, limit, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    commitments: commitments,
                    total: commitments.length
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'update') {
            // Update a commitment
            const { commitment_id, ...updates } = await req.json();
            
            if (!commitment_id) {
                throw new Error('Commitment ID is required');
            }

            const updatedCommitment = await updateCommitment(userId, commitment_id, updates, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    commitment: updatedCommitment,
                    ics_updated: true
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'delete') {
            // Delete a commitment
            const { commitment_id } = await req.json();
            
            if (!commitment_id) {
                throw new Error('Commitment ID is required');
            }

            await deleteCommitment(userId, commitment_id, supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    deleted: true,
                    commitment_id: commitment_id,
                    ics_updated: true
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'scheduler') {
            // Run the commitment scheduler (check for due commitments)
            const results = await runCommitmentScheduler(supabaseUrl, serviceRoleKey);
            
            return new Response(JSON.stringify({
                data: {
                    scheduler_run: true,
                    processed: results.processed,
                    sent: results.sent,
                    errors: results.errors,
                    timestamp: new Date().toISOString()
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Commitment engine error:', error);

        const errorResponse = {
            error: {
                code: 'COMMITMENT_ENGINE_FAILED',
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

// Parse commitment intent from natural language
async function parseCommitmentIntent(message: string, userId: string, supabaseUrl: string, serviceRoleKey: string) {
    const lowerMessage = message.toLowerCase();
    
    // Commitment intent patterns
    const intentPatterns = [
        // Reminder patterns
        { pattern: /(?:提醒|記得|別忘).*?([\u4e00-\u9fa5\w\s]+)/, type: 'reminder' },
        { pattern: /(明天|後天|下週|下個月).*?(早上|中午|下午|晚上|\d{1,2}[:：]\d{2})?.*?([\u4e00-\u9fa5\w\s]+)/, type: 'scheduled' },
        { pattern: /每(天|週|月).*?([\u4e00-\u9fa5\w\s]+)/, type: 'recurring' }
    ];

    for (const { pattern, type } of intentPatterns) {
        const match = message.match(pattern);
        if (match) {
            console.log('Commitment intent detected:', { type, match });
            
            const commitment = {
                id: crypto.randomUUID(),
                user_id: userId,
                intent_type: type,
                title: extractTitle(match, type),
                what_action: match[match.length - 1] || message,
                when_time: null,
                when_rrule: null,
                status: 'draft',
                needs_clarification: true,
                suggestions: generateSuggestions(type, match),
                source_message: message,
                created_at: new Date().toISOString()
            };

            // Try to parse time if present
            const timeInfo = parseTimeFromMessage(message, type);
            if (timeInfo.when_time) {
                commitment.when_time = timeInfo.when_time;
                commitment.needs_clarification = false;
            }
            if (timeInfo.rrule) {
                commitment.when_rrule = timeInfo.rrule;
                commitment.needs_clarification = false;
            }

            return commitment;
        }
    }

    return null;
}

// Extract title from regex match
function extractTitle(match: RegExpMatchArray, type: string): string {
    switch (type) {
        case 'reminder':
            return `提醒: ${match[1] || '未命名任務'}`;
        case 'scheduled':
            return `${match[1] || ''} ${match[3] || '任務'}`;
        case 'recurring':
            return `每${match[1]} ${match[2] || '任務'}`;
        default:
            return '未命名承諾';
    }
}

// Generate suggestions for clarification
function generateSuggestions(type: string, match: RegExpMatchArray) {
    switch (type) {
        case 'reminder':
            return {
                time_options: ['今天晚點', '明天早上 9:00', '明天下午 2:00'],
                action_options: [match[1], `關於 ${match[1]}`, `完成 ${match[1]}`]
            };
        case 'scheduled':
            return {
                time_options: ['08:00', '09:00', '10:00'],
                repeat_options: ['不重複', '每天', '每週同時間']
            };
        case 'recurring':
            return {
                time_options: ['早上 8:00', '中午 12:00', '下午 6:00'],
                frequency_options: ['每天', '每週', '每月']
            };
        default:
            return {};
    }
}

// Parse time information from message
function parseTimeFromMessage(message: string, type: string) {
    const result = { when_time: null, rrule: null };
    
    // Simple time parsing patterns
    const timePatterns = [
        { pattern: /(\d{1,2})[:：](\d{2})/, format: 'HH:MM' },
        { pattern: /(早上|上午)/, time: '09:00' },
        { pattern: /(中午)/, time: '12:00' },
        { pattern: /(下午)/, time: '15:00' },
        { pattern: /(晚上|晩上)/, time: '20:00' }
    ];

    // Date patterns
    const datePatterns = [
        { pattern: /明天/, days: 1 },
        { pattern: /後天/, days: 2 },
        { pattern: /下週/, days: 7 },
        { pattern: /下個月/, days: 30 }
    ];

    // Recurring patterns
    if (type === 'recurring') {
        if (message.includes('每天')) {
            result.rrule = 'FREQ=DAILY';
        } else if (message.includes('每週')) {
            result.rrule = 'FREQ=WEEKLY';
        } else if (message.includes('每月')) {
            result.rrule = 'FREQ=MONTHLY';
        }
    }

    // Parse specific time
    let timeStr = '09:00'; // default
    for (const { pattern, time, format } of timePatterns) {
        const match = message.match(pattern);
        if (match) {
            if (format === 'HH:MM') {
                timeStr = `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}`;
            } else if (time) {
                timeStr = time;
            }
            break;
        }
    }

    // Parse date
    let targetDate = new Date();
    for (const { pattern, days } of datePatterns) {
        if (message.match(pattern)) {
            targetDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
            break;
        }
    }

    // Combine date and time
    if (type !== 'recurring') {
        const [hours, minutes] = timeStr.split(':');
        targetDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        result.when_time = targetDate.toISOString();
    }

    return result;
}

// Create a new commitment
async function createCommitment(userId: string, commitmentData: any, supabaseUrl: string, serviceRoleKey: string) {
    const commitment = {
        user_id: userId,
        title: commitmentData.title || '未命名承諾',
        description: commitmentData.description,
        intent_type: commitmentData.intent_type || 'reminder',
        what_action: commitmentData.what_action || commitmentData.title,
        when_time: commitmentData.when_time,
        when_rrule: commitmentData.when_rrule,
        where_location: commitmentData.where_location,
        notes: commitmentData.notes,
        status: 'scheduled',
        version: 1,
        dnd_respect: true,
        priority: commitmentData.priority || 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/scheduled_nudges`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(commitment)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create commitment: ${errorText}`);
    }

    const result = await response.json();
    return result[0];
}

// List user commitments
async function listCommitments(userId: string, status: string, limit: number, supabaseUrl: string, serviceRoleKey: string) {
    let query = `${supabaseUrl}/rest/v1/scheduled_nudges?user_id=eq.${userId}&order=created_at.desc&limit=${limit}`;
    
    if (status !== 'all') {
        query += `&status=eq.${status}`;
    }

    const response = await fetch(query, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!response.ok) {
        throw new Error('Failed to fetch commitments');
    }

    return await response.json();
}

// Update a commitment
async function updateCommitment(userId: string, commitmentId: string, updates: any, supabaseUrl: string, serviceRoleKey: string) {
    const updateData = {
        ...updates,
        version: (updates.version || 1) + 1,
        updated_at: new Date().toISOString()
    };

    const response = await fetch(`${supabaseUrl}/rest/v1/scheduled_nudges?id=eq.${commitmentId}&user_id=eq.${userId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        },
        body: JSON.stringify(updateData)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update commitment: ${errorText}`);
    }

    const result = await response.json();
    return result[0];
}

// Delete a commitment
async function deleteCommitment(userId: string, commitmentId: string, supabaseUrl: string, serviceRoleKey: string) {
    const response = await fetch(`${supabaseUrl}/rest/v1/scheduled_nudges?id=eq.${commitmentId}&user_id=eq.${userId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });

    if (!response.ok) {
        throw new Error('Failed to delete commitment');
    }
}

// Run commitment scheduler (check for due commitments)
async function runCommitmentScheduler(supabaseUrl: string, serviceRoleKey: string) {
    console.log('Running commitment scheduler...');

    const results = { processed: 0, sent: 0, errors: 0 };
    const now = new Date();

    try {
        // Get due commitments (scheduled and not yet processed)
        const response = await fetch(
            `${supabaseUrl}/rest/v1/scheduled_nudges?status=eq.scheduled&when_time=lte.${now.toISOString()}&order=when_time.asc&limit=50`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch due commitments');
        }

        const dueCommitments = await response.json();
        results.processed = dueCommitments.length;

        for (const commitment of dueCommitments) {
            try {
                // Check user DND preferences
                const userPrefs = await getUserNudgePrefs(commitment.user_id, supabaseUrl, serviceRoleKey);
                
                if (shouldSkipDueToNDND(commitment, userPrefs, now)) {
                    // Log as skipped due to DND
                    await logNudgeEvent(commitment.id, commitment.user_id, 'skipped_dnd', supabaseUrl, serviceRoleKey);
                    continue;
                }

                // Check daily limit
                const todayCount = await getTodayNudgeCount(commitment.user_id, supabaseUrl, serviceRoleKey);
                if (todayCount >= (userPrefs.max_daily_nudges || 3)) {
                    await logNudgeEvent(commitment.id, commitment.user_id, 'skipped_limit', supabaseUrl, serviceRoleKey);
                    continue;
                }

                // Send the nudge (mark as completed for now)
                await updateCommitmentStatus(commitment.id, 'completed', supabaseUrl, serviceRoleKey);
                await logNudgeEvent(commitment.id, commitment.user_id, 'sent', supabaseUrl, serviceRoleKey);
                
                results.sent++;

                // Handle recurring commitments
                if (commitment.when_rrule) {
                    await createNextRecurrence(commitment, supabaseUrl, serviceRoleKey);
                }

            } catch (error) {
                console.error('Error processing commitment:', commitment.id, error);
                await logNudgeEvent(commitment.id, commitment.user_id, 'error', supabaseUrl, serviceRoleKey, error.message);
                results.errors++;
            }
        }

    } catch (error) {
        console.error('Scheduler error:', error);
        results.errors++;
    }

    console.log('Scheduler completed:', results);
    return results;
}

// Helper functions for scheduler
async function getUserNudgePrefs(userId: string, supabaseUrl: string, serviceRoleKey: string) {
    const response = await fetch(`${supabaseUrl}/rest/v1/nudge_prefs?user_id=eq.${userId}`, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });
    
    if (response.ok) {
        const prefs = await response.json();
        return prefs[0] || { dnd_enabled: false, max_daily_nudges: 3, timezone: 'Asia/Taipei' };
    }
    
    return { dnd_enabled: false, max_daily_nudges: 3, timezone: 'Asia/Taipei' };
}

function shouldSkipDueToNDND(commitment: any, userPrefs: any, now: Date): boolean {
    if (!userPrefs.dnd_enabled) return false;
    
    const currentHour = now.getHours();
    const dndStart = userPrefs.dnd_start_time ? parseInt(userPrefs.dnd_start_time.split(':')[0]) : 22;
    const dndEnd = userPrefs.dnd_end_time ? parseInt(userPrefs.dnd_end_time.split(':')[0]) : 8;
    
    // Check if current time is in DND period
    if (dndStart > dndEnd) { // DND crosses midnight
        return currentHour >= dndStart || currentHour <= dndEnd;
    } else {
        return currentHour >= dndStart && currentHour <= dndEnd;
    }
}

async function getTodayNudgeCount(userId: string, supabaseUrl: string, serviceRoleKey: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const response = await fetch(
        `${supabaseUrl}/rest/v1/nudges_log?user_id=eq.${userId}&sent_at=gte.${today.toISOString()}&sent_at=lt.${tomorrow.toISOString()}&delivery_status=eq.sent`,
        {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        }
    );
    
    if (response.ok) {
        const logs = await response.json();
        return logs.length;
    }
    
    return 0;
}

async function updateCommitmentStatus(commitmentId: string, status: string, supabaseUrl: string, serviceRoleKey: string) {
    await fetch(`${supabaseUrl}/rest/v1/scheduled_nudges?id=eq.${commitmentId}`, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, updated_at: new Date().toISOString() })
    });
}

async function logNudgeEvent(nudgeId: string, userId: string, status: string, supabaseUrl: string, serviceRoleKey: string, errorMessage?: string) {
    await fetch(`${supabaseUrl}/rest/v1/nudges_log`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            nudge_id: nudgeId,
            user_id: userId,
            delivery_status: status,
            delivery_channel: 'ics',
            sent_at: new Date().toISOString(),
            metadata: errorMessage ? { error: errorMessage } : null
        })
    });
}

async function createNextRecurrence(commitment: any, supabaseUrl: string, serviceRoleKey: string) {
    // Simple recurrence logic
    const nextTime = new Date(commitment.when_time);
    
    if (commitment.when_rrule?.includes('DAILY')) {
        nextTime.setDate(nextTime.getDate() + 1);
    } else if (commitment.when_rrule?.includes('WEEKLY')) {
        nextTime.setDate(nextTime.getDate() + 7);
    } else if (commitment.when_rrule?.includes('MONTHLY')) {
        nextTime.setMonth(nextTime.getMonth() + 1);
    } else {
        return; // Unknown recurrence pattern
    }
    
    const nextCommitment = {
        ...commitment,
        id: undefined, // Let database generate new ID
        when_time: nextTime.toISOString(),
        status: 'scheduled',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    
    await fetch(`${supabaseUrl}/rest/v1/scheduled_nudges`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(nextCommitment)
    });
}