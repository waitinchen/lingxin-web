Deno.serve(async (req) => {
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Max-Age': '86400',
        'Access-Control-Allow-Credentials': 'false'
    };

    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    try {
        console.log('Cron scheduler started at:', new Date().toISOString());

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        if (!supabaseUrl || !serviceRoleKey) {
            throw new Error('Supabase configuration missing');
        }

        const results = {
            timestamp: new Date().toISOString(),
            tasks_completed: [],
            errors: [],
            total_execution_time: 0
        };

        const startTime = Date.now();

        // Task 1: Run Commitment Scheduler (every 5 minutes)
        try {
            console.log('Running commitment scheduler...');
            const commitmentResponse = await fetch(`${supabaseUrl}/functions/v1/commitment-engine?action=scheduler`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (commitmentResponse.ok) {
                const commitmentResult = await commitmentResponse.json();
                results.tasks_completed.push({
                    task: 'commitment_scheduler',
                    status: 'success',
                    details: commitmentResult.data
                });
                console.log('Commitment scheduler completed:', commitmentResult.data);
            } else {
                const errorText = await commitmentResponse.text();
                results.errors.push({
                    task: 'commitment_scheduler',
                    error: errorText
                });
                console.error('Commitment scheduler failed:', errorText);
            }
        } catch (error) {
            results.errors.push({
                task: 'commitment_scheduler',
                error: error.message
            });
            console.error('Commitment scheduler error:', error);
        }

        // Task 2: Generate Memory Summaries (hourly)
        const currentHour = new Date().getHours();
        if (currentHour % 1 === 0) { // Run every hour (for demo, in production use % 1)
            try {
                console.log('Running memory summarization...');
                const memoryResponse = await fetch(`${supabaseUrl}/functions/v1/memory-system?action=summarize`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (memoryResponse.ok) {
                    const memoryResult = await memoryResponse.json();
                    results.tasks_completed.push({
                        task: 'memory_summarization',
                        status: 'success',
                        details: memoryResult.data
                    });
                    console.log('Memory summarization completed:', memoryResult.data);
                } else {
                    const errorText = await memoryResponse.text();
                    results.errors.push({
                        task: 'memory_summarization',
                        error: errorText
                    });
                    console.error('Memory summarization failed:', errorText);
                }
            } catch (error) {
                results.errors.push({
                    task: 'memory_summarization',
                    error: error.message
                });
                console.error('Memory summarization error:', error);
            }
        }

        // Task 3: Extract User Preferences (daily at 2 AM)
        if (currentHour === 2) {
            try {
                console.log('Running preference extraction...');
                const prefResponse = await fetch(`${supabaseUrl}/functions/v1/memory-system?action=preferences`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (prefResponse.ok) {
                    const prefResult = await prefResponse.json();
                    results.tasks_completed.push({
                        task: 'preference_extraction',
                        status: 'success',
                        details: prefResult.data
                    });
                    console.log('Preference extraction completed:', prefResult.data);
                } else {
                    const errorText = await prefResponse.text();
                    results.errors.push({
                        task: 'preference_extraction',
                        error: errorText
                    });
                    console.error('Preference extraction failed:', errorText);
                }
            } catch (error) {
                results.errors.push({
                    task: 'preference_extraction',
                    error: error.message
                });
                console.error('Preference extraction error:', error);
            }
        }

        // Task 4: Memory Cleanup (daily at 3 AM)
        if (currentHour === 3) {
            try {
                console.log('Running memory cleanup...');
                const cleanupResponse = await fetch(`${supabaseUrl}/functions/v1/memory-system?action=cleanup`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (cleanupResponse.ok) {
                    const cleanupResult = await cleanupResponse.json();
                    results.tasks_completed.push({
                        task: 'memory_cleanup',
                        status: 'success',
                        details: cleanupResult.data
                    });
                    console.log('Memory cleanup completed:', cleanupResult.data);
                } else {
                    const errorText = await cleanupResponse.text();
                    results.errors.push({
                        task: 'memory_cleanup',
                        error: errorText
                    });
                    console.error('Memory cleanup failed:', errorText);
                }
            } catch (error) {
                results.errors.push({
                    task: 'memory_cleanup',
                    error: error.message
                });
                console.error('Memory cleanup error:', error);
            }
        }

        // Task 5: Notion Sync (every 2 minutes)
        const currentMinute = new Date().getMinutes();
        if (currentMinute % 2 === 0) {
            try {
                console.log('Running Notion sync...');
                const notionResponse = await fetch(`${supabaseUrl}/functions/v1/notion-sync`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({})
                });

                if (notionResponse.ok) {
                    const notionResult = await notionResponse.json();
                    results.tasks_completed.push({
                        task: 'notion_sync',
                        status: 'success',
                        details: notionResult.data
                    });
                    console.log('Notion sync completed:', notionResult.data);
                } else {
                    const errorText = await notionResponse.text();
                    results.errors.push({
                        task: 'notion_sync',
                        error: errorText
                    });
                    console.error('Notion sync failed:', errorText);
                }
            } catch (error) {
                results.errors.push({
                    task: 'notion_sync',
                    error: error.message
                });
                console.error('Notion sync error:', error);
            }
        }

        // Task 6: System Health Check (every 10 minutes)
        if (currentMinute % 10 === 0) {
            try {
                console.log('Running system health check...');
                const healthCheck = await performHealthCheck(supabaseUrl, serviceRoleKey);
                results.tasks_completed.push({
                    task: 'health_check',
                    status: 'success',
                    details: healthCheck
                });
                console.log('Health check completed:', healthCheck);
            } catch (error) {
                results.errors.push({
                    task: 'health_check',
                    error: error.message
                });
                console.error('Health check error:', error);
            }
        }

        results.total_execution_time = Date.now() - startTime;
        console.log('Cron scheduler completed in', results.total_execution_time, 'ms');

        // Log scheduler execution
        try {
            await logSchedulerExecution(results, supabaseUrl, serviceRoleKey);
        } catch (logError) {
            console.error('Failed to log scheduler execution:', logError);
        }

        return new Response(JSON.stringify({
            data: {
                scheduler_completed: true,
                results: results,
                success_rate: results.tasks_completed.length / (results.tasks_completed.length + results.errors.length) * 100
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Cron scheduler error:', error);

        const errorResponse = {
            error: {
                code: 'CRON_SCHEDULER_FAILED',
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

// Perform system health check
async function performHealthCheck(supabaseUrl: string, serviceRoleKey: string) {
    const healthStatus = {
        database_connection: false,
        recent_activity: false,
        error_rate: 0,
        active_users_24h: 0,
        system_resources: 'ok',
        timestamp: new Date().toISOString()
    };

    try {
        // Test database connection
        const dbTestResponse = await fetch(`${supabaseUrl}/rest/v1/users?limit=1`, {
            headers: {
                'Authorization': `Bearer ${serviceRoleKey}`,
                'apikey': serviceRoleKey
            }
        });
        healthStatus.database_connection = dbTestResponse.ok;

        // Check recent activity (messages in last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const recentActivityResponse = await fetch(
            `${supabaseUrl}/rest/v1/messages?created_at=gte.${oneHourAgo}&limit=1`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );
        
        if (recentActivityResponse.ok) {
            const recentMessages = await recentActivityResponse.json();
            healthStatus.recent_activity = recentMessages.length > 0;
        }

        // Count active users in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const activeUsersResponse = await fetch(
            `${supabaseUrl}/rest/v1/messages?created_at=gte.${twentyFourHoursAgo}&select=user_id`,
            {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            }
        );
        
        if (activeUsersResponse.ok) {
            const userMessages = await activeUsersResponse.json();
            const uniqueUsers = new Set(userMessages.map((m: any) => m.user_id));
            healthStatus.active_users_24h = uniqueUsers.size;
        }

        // Check error rate (placeholder - in production would check actual error logs)
        healthStatus.error_rate = Math.random() * 5; // Mock error rate 0-5%

    } catch (error) {
        console.error('Health check error:', error);
        healthStatus.system_resources = 'error';
    }

    return healthStatus;
}

// Log scheduler execution for monitoring
async function logSchedulerExecution(results: any, supabaseUrl: string, serviceRoleKey: string) {
    const logData = {
        executed_at: results.timestamp,
        tasks_completed: results.tasks_completed.length,
        tasks_failed: results.errors.length,
        execution_time_ms: results.total_execution_time,
        success_rate: results.tasks_completed.length / (results.tasks_completed.length + results.errors.length) * 100,
        details: {
            completed_tasks: results.tasks_completed.map((t: any) => t.task),
            failed_tasks: results.errors.map((e: any) => ({ task: e.task, error: e.error })),
            system_status: 'running'
        }
    };

    // Create a simple log table entry (you might want to create a scheduler_logs table)
    const response = await fetch(`${supabaseUrl}/rest/v1/audit_login_events`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            email: 'system@lingxin.ai',
            login_method: 'cron_scheduler',
            success: results.errors.length === 0,
            error_message: results.errors.length > 0 ? JSON.stringify(results.errors) : null,
            user_agent: `Scheduler/1.0 (tasks: ${results.tasks_completed.length}, errors: ${results.errors.length})`,
            created_at: new Date().toISOString()
        })
    });

    if (!response.ok) {
        console.error('Failed to log scheduler execution');
    }
}