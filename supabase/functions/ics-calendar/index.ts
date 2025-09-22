Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        const url = new URL(req.url);
        const pathSegments = url.pathname.split('/');
        const userToken = pathSegments[pathSegments.length - 1]?.replace('.ics', '');
        const tokenParam = url.searchParams.get('token');
        const finalToken = userToken || tokenParam;

        console.log('ICS Calendar request for token:', finalToken?.substring(0, 8) + '...');

        if (!finalToken) {
            throw new Error('Calendar token is required');
        }

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        // Verify token and get user ID (simple token format: base64(userId:timestamp))
        const userId = await verifyCalendarToken(finalToken, supabaseUrl, serviceRoleKey);
        if (!userId) {
            throw new Error('Invalid or expired calendar token');
        }

        console.log('Token verified for user:', userId);

        // Get user's scheduled commitments/nudges
        const commitmentsResponse = await fetch(
            `${supabaseUrl}/rest/v1/scheduled_nudges?user_id=eq.${userId}&status=in.(scheduled,completed)&order=when_time.asc`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        if (!commitmentsResponse.ok) {
            throw new Error('Failed to fetch commitments');
        }

        const commitments = await commitmentsResponse.json();
        console.log('Retrieved', commitments.length, 'commitments for calendar');

        // Get user profile for calendar metadata
        const profileResponse = await fetch(
            `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${userId}`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );

        let userProfile = { full_name: '靈信用戶', timezone: 'Asia/Taipei' };
        if (profileResponse.ok) {
            const profiles = await profileResponse.json();
            if (profiles.length > 0) {
                userProfile = profiles[0];
            }
        }

        // Generate ICS calendar content
        const icsContent = generateICSContent(commitments, userProfile);
        
        console.log('Generated ICS calendar with', commitments.length, 'events');

        return new Response(icsContent, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="lingxin-calendar.ics"`,
                'Cache-Control': 'no-cache, must-revalidate',
                'Expires': '0'
            }
        });

    } catch (error) {
        console.error('ICS Calendar error:', error);

        // Return a simple error calendar
        const errorICS = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Lingxin//Calendar Error//CN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:靈信行事曆 (錯誤)',
            'X-WR-CALDESC:行事曆載入錯誤',
            'BEGIN:VEVENT',
            `UID:error-${Date.now()}@lingxin.ai`,
            `DTSTAMP:${formatICSDateTime(new Date())}`,
            `DTSTART:${formatICSDateTime(new Date())}`,
            `DTEND:${formatICSDateTime(new Date(Date.now() + 60000))}`,
            'SUMMARY:行事曆載入錯誤',
            `DESCRIPTION:錯誤訊息: ${error.message}`,
            'STATUS:CONFIRMED',
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        return new Response(errorICS, {
            status: 500,
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/calendar; charset=utf-8'
            }
        });
    }
});

// Verify calendar token and return user ID
async function verifyCalendarToken(token: string, supabaseUrl: string, serviceRoleKey: string): Promise<string | null> {
    try {
        // Simple token format: base64(userId:timestamp:signature)
        const decoded = atob(token);
        const [userId, timestamp, signature] = decoded.split(':');
        
        if (!userId || !timestamp) {
            return null;
        }

        // Check if token is not too old (30 days)
        const tokenDate = new Date(parseInt(timestamp));
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        if (tokenDate < thirtyDaysAgo) {
            console.log('Token expired');
            return null;
        }

        // Verify user exists
        const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${userId}&is_active=eq.true`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });

        if (userResponse.ok) {
            const users = await userResponse.json();
            if (users.length > 0) {
                return userId;
            }
        }

        return null;

    } catch (error) {
        console.error('Token verification error:', error);
        return null;
    }
}

// Generate ICS calendar content
function generateICSContent(commitments: any[], userProfile: any): string {
    const now = new Date();
    const calendarName = `${userProfile.full_name || '用戶'}的靈信行事曆`;
    const timezone = userProfile.timezone || 'Asia/Taipei';

    // ICS header
    const icsLines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Lingxin AI Assistant//Smart Calendar//CN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${calendarName}`,
        'X-WR-CALDESC:靈信智能助理 - 承諾與提醒行事曆',
        `X-WR-TIMEZONE:${timezone}`,
        'X-PUBLISHED-TTL:PT15M',
        ''
    ];

    // Add timezone definition for Asia/Taipei
    icsLines.push(
        'BEGIN:VTIMEZONE',
        'TZID:Asia/Taipei',
        'BEGIN:STANDARD',
        'DTSTART:19700101T000000',
        'TZOFFSETFROM:+0800',
        'TZOFFSETTO:+0800',
        'TZNAME:CST',
        'END:STANDARD',
        'END:VTIMEZONE',
        ''
    );

    // Add events
    for (const commitment of commitments) {
        try {
            const event = generateICSEvent(commitment, timezone);
            icsLines.push(event, '');
        } catch (error) {
            console.error('Error generating event for commitment:', commitment.id, error);
        }
    }

    // ICS footer
    icsLines.push('END:VCALENDAR');

    return icsLines.join('\r\n');
}

// Generate individual ICS event
function generateICSEvent(commitment: any, timezone: string): string {
    const uid = `lingxin-${commitment.id}@lingxin.ai`;
    const now = new Date();
    const createdDate = new Date(commitment.created_at);
    const updatedDate = new Date(commitment.updated_at);
    
    // Handle when_time
    let startTime = new Date(commitment.when_time || now);
    let endTime = new Date(startTime.getTime() + 30 * 60 * 1000); // Default 30 minutes

    // Determine event duration based on intent_type
    const duration = getDurationByIntentType(commitment.intent_type);
    endTime = new Date(startTime.getTime() + duration * 60 * 1000);

    // Format title and description
    const title = escapeICSText(commitment.title || '靈信提醒');
    const description = generateEventDescription(commitment);
    const location = escapeICSText(commitment.where_location || '');
    
    // Determine event status
    const status = commitment.status === 'completed' ? 'CONFIRMED' : 'TENTATIVE';
    
    // Event lines
    const eventLines = [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatICSDateTime(now)}`,
        `DTSTART;TZID=${timezone}:${formatICSLocalDateTime(startTime)}`,
        `DTEND;TZID=${timezone}:${formatICSLocalDateTime(endTime)}`,
        `CREATED:${formatICSDateTime(createdDate)}`,
        `LAST-MODIFIED:${formatICSDateTime(updatedDate)}`,
        `SUMMARY:${title}`,
        `DESCRIPTION:${escapeICSText(description)}`,
        `STATUS:${status}`,
        'TRANSP:OPAQUE',
        'CLASS:PRIVATE'
    ];

    // Add location if provided
    if (location) {
        eventLines.push(`LOCATION:${location}`);
    }

    // Add categories based on intent_type
    const category = getCategoryByIntentType(commitment.intent_type);
    eventLines.push(`CATEGORIES:${category}`);

    // Add recurrence rule if present
    if (commitment.when_rrule) {
        eventLines.push(`RRULE:${commitment.when_rrule}`);
    }

    // Add reminder (15 minutes before)
    eventLines.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        'TRIGGER:-PT15M',
        `DESCRIPTION:靈信提醒: ${title}`,
        'END:VALARM'
    );

    eventLines.push('END:VEVENT');

    return eventLines.join('\r\n');
}

// Generate event description
function generateEventDescription(commitment: any): string {
    const parts = [];
    
    if (commitment.description) {
        parts.push(commitment.description);
        parts.push('');
    }
    
    if (commitment.what_action) {
        parts.push(`行動: ${commitment.what_action}`);
    }
    
    if (commitment.notes) {
        parts.push(`備註: ${commitment.notes}`);
    }
    
    parts.push('', '由靈信智能助理創建');
    parts.push(`承諾ID: ${commitment.id}`);
    parts.push(`類型: ${commitment.intent_type}`);
    parts.push(`版本: ${commitment.version}`);
    
    if (commitment.priority > 1) {
        parts.push(`優先級: ${commitment.priority}`);
    }
    
    return parts.join('\\n');
}

// Get duration by intent type (in minutes)
function getDurationByIntentType(intentType: string): number {
    switch (intentType) {
        case 'reminder':
            return 15; // 15 minutes
        case 'scheduled':
            return 60; // 1 hour
        case 'recurring':
            return 30; // 30 minutes
        case 'meeting':
            return 90; // 1.5 hours
        case 'task':
            return 120; // 2 hours
        default:
            return 30; // 30 minutes default
    }
}

// Get category by intent type
function getCategoryByIntentType(intentType: string): string {
    switch (intentType) {
        case 'reminder':
            return '提醒,靈信';
        case 'scheduled':
            return '行程,靈信';
        case 'recurring':
            return '習慣,靈信';
        case 'meeting':
            return '會議,靈信';
        case 'task':
            return '任務,靈信';
        default:
            return '靈信';
    }
}

// Format date for ICS (UTC)
function formatICSDateTime(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Format date for ICS (local time)
function formatICSLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

// Escape text for ICS format
function escapeICSText(text: string): string {
    if (!text) return '';
    
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n')
        .substring(0, 998); // ICS line length limit
}