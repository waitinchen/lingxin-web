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
        console.log('Notion sync started at:', new Date().toISOString());

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const notionApiKey = Deno.env.get('NOTION_API_KEY');

        if (!supabaseUrl || !serviceRoleKey || !notionApiKey) {
            throw new Error('Required configuration missing');
        }

        console.log('Environment variables validated');

        // Notion database IDs (these should be configurable via environment variables in production)
        const notionDatabases = {
            personas: 'personas_db_id', // Replace with actual Notion database ID
            prompts: 'prompts_db_id',
            guardrails: 'guardrails_db_id',
            datasets: 'datasets_db_id',
            start_phrases: 'start_phrases_db_id'
        };

        const syncResults = {
            personas: { synced: 0, errors: 0 },
            prompts: { synced: 0, errors: 0 },
            guardrails: { synced: 0, errors: 0 },
            datasets: { synced: 0, errors: 0 },
            start_phrases: { synced: 0, errors: 0 }
        };

        // Sync Personas
        try {
            console.log('Syncing personas...');
            const personas = await fetchNotionDatabase(notionApiKey, notionDatabases.personas);
            
            for (const item of personas) {
                try {
                    const persona = {
                        name: getNotionProperty(item, 'Name', 'title') || 'Unnamed Persona',
                        description: getNotionProperty(item, 'Description', 'rich_text'),
                        personality_data: {
                            traits: getNotionProperty(item, 'Traits', 'multi_select') || [],
                            style: getNotionProperty(item, 'Communication Style', 'select') || 'friendly',
                            knowledge: getNotionProperty(item, 'Knowledge Domains', 'multi_select') || [],
                            core_values: getNotionProperty(item, 'Core Values', 'multi_select') || []
                        },
                        is_active: getNotionProperty(item, 'Active', 'checkbox') !== false,
                        is_locked: getNotionProperty(item, 'Locked', 'checkbox') === true,
                        version: getNotionProperty(item, 'Version', 'number') || 1,
                        updated_at: new Date().toISOString()
                    };

                    // Check if persona exists (by name)
                    const existingPersona = await fetchSupabaseData(
                        `${supabaseUrl}/rest/v1/personas?name=eq.${encodeURIComponent(persona.name)}`,
                        serviceRoleKey
                    );

                    if (existingPersona.length > 0 && !existingPersona[0].is_locked) {
                        // Update existing unlocked persona
                        await updateSupabaseData(
                            `${supabaseUrl}/rest/v1/personas?id=eq.${existingPersona[0].id}`,
                            serviceRoleKey,
                            persona
                        );
                        syncResults.personas.synced++;
                    } else if (existingPersona.length === 0) {
                        // Create new persona
                        await createSupabaseData(
                            `${supabaseUrl}/rest/v1/personas`,
                            serviceRoleKey,
                            { ...persona, created_at: new Date().toISOString() }
                        );
                        syncResults.personas.synced++;
                    }
                    // Skip locked personas
                } catch (error) {
                    console.error('Error syncing persona:', error);
                    syncResults.personas.errors++;
                }
            }
        } catch (error) {
            console.error('Failed to sync personas:', error);
        }

        // Sync Start Phrases (Smart Action Chips)
        try {
            console.log('Syncing start phrases...');
            const startPhrases = await fetchNotionDatabase(notionApiKey, notionDatabases.start_phrases);
            
            for (const item of startPhrases) {
                try {
                    const phrase = {
                        phrase: getNotionProperty(item, 'Phrase', 'title') || 'Unknown Phrase',
                        context_pattern: getNotionProperty(item, 'Context Pattern', 'rich_text'),
                        trigger_probability: parseFloat(getNotionProperty(item, 'Trigger Probability', 'number')) || 0.8,
                        action_chips: getNotionProperty(item, 'Action Chips', 'multi_select')?.map(chip => ({
                            text: chip.name,
                            action: chip.name.toLowerCase().replace(/\s+/g, '_')
                        })) || [],
                        category: getNotionProperty(item, 'Category', 'select') || 'general',
                        is_active: getNotionProperty(item, 'Active', 'checkbox') !== false,
                        updated_at: new Date().toISOString()
                    };

                    // Check if phrase exists
                    const existingPhrase = await fetchSupabaseData(
                        `${supabaseUrl}/rest/v1/start_phrases?phrase=eq.${encodeURIComponent(phrase.phrase)}`,
                        serviceRoleKey
                    );

                    if (existingPhrase.length > 0) {
                        // Update existing phrase
                        await updateSupabaseData(
                            `${supabaseUrl}/rest/v1/start_phrases?id=eq.${existingPhrase[0].id}`,
                            serviceRoleKey,
                            phrase
                        );
                        syncResults.start_phrases.synced++;
                    } else {
                        // Create new phrase
                        await createSupabaseData(
                            `${supabaseUrl}/rest/v1/start_phrases`,
                            serviceRoleKey,
                            { ...phrase, created_at: new Date().toISOString() }
                        );
                        syncResults.start_phrases.synced++;
                    }
                } catch (error) {
                    console.error('Error syncing start phrase:', error);
                    syncResults.start_phrases.errors++;
                }
            }
        } catch (error) {
            console.error('Failed to sync start phrases:', error);
        }

        // Sync Guardrails
        try {
            console.log('Syncing guardrails...');
            const guardrails = await fetchNotionDatabase(notionApiKey, notionDatabases.guardrails);
            
            for (const item of guardrails) {
                try {
                    const guardrail = {
                        name: getNotionProperty(item, 'Name', 'title') || 'Unnamed Rule',
                        description: getNotionProperty(item, 'Description', 'rich_text'),
                        rule_type: getNotionProperty(item, 'Rule Type', 'select') || 'content_filter',
                        rule_content: {
                            patterns: getNotionProperty(item, 'Patterns', 'multi_select') || [],
                            keywords: getNotionProperty(item, 'Keywords', 'rich_text')?.split(',').map(k => k.trim()) || [],
                            action: getNotionProperty(item, 'Action', 'select') || 'warn'
                        },
                        severity: getNotionProperty(item, 'Severity', 'select') || 'medium',
                        is_active: getNotionProperty(item, 'Active', 'checkbox') !== false,
                        updated_at: new Date().toISOString()
                    };

                    // Check if guardrail exists
                    const existingGuardrail = await fetchSupabaseData(
                        `${supabaseUrl}/rest/v1/guardrails?name=eq.${encodeURIComponent(guardrail.name)}`,
                        serviceRoleKey
                    );

                    if (existingGuardrail.length > 0) {
                        // Update existing guardrail
                        await updateSupabaseData(
                            `${supabaseUrl}/rest/v1/guardrails?id=eq.${existingGuardrail[0].id}`,
                            serviceRoleKey,
                            guardrail
                        );
                        syncResults.guardrails.synced++;
                    } else {
                        // Create new guardrail
                        await createSupabaseData(
                            `${supabaseUrl}/rest/v1/guardrails`,
                            serviceRoleKey,
                            { ...guardrail, created_at: new Date().toISOString() }
                        );
                        syncResults.guardrails.synced++;
                    }
                } catch (error) {
                    console.error('Error syncing guardrail:', error);
                    syncResults.guardrails.errors++;
                }
            }
        } catch (error) {
            console.error('Failed to sync guardrails:', error);
        }

        // Sync Datasets
        try {
            console.log('Syncing datasets...');
            const datasets = await fetchNotionDatabase(notionApiKey, notionDatabases.datasets);
            
            for (const item of datasets) {
                try {
                    const dataset = {
                        name: getNotionProperty(item, 'Name', 'title') || 'Unnamed Dataset',
                        description: getNotionProperty(item, 'Description', 'rich_text'),
                        dataset_type: getNotionProperty(item, 'Type', 'select') || 'knowledge',
                        data_content: {
                            content: getNotionProperty(item, 'Content', 'rich_text') || '',
                            tags: getNotionProperty(item, 'Tags', 'multi_select') || [],
                            source: getNotionProperty(item, 'Source', 'rich_text') || ''
                        },
                        category: getNotionProperty(item, 'Category', 'select') || 'general',
                        is_active: getNotionProperty(item, 'Active', 'checkbox') !== false,
                        version: getNotionProperty(item, 'Version', 'number') || 1,
                        updated_at: new Date().toISOString()
                    };

                    // Check if dataset exists
                    const existingDataset = await fetchSupabaseData(
                        `${supabaseUrl}/rest/v1/datasets?name=eq.${encodeURIComponent(dataset.name)}`,
                        serviceRoleKey
                    );

                    if (existingDataset.length > 0) {
                        // Update existing dataset
                        await updateSupabaseData(
                            `${supabaseUrl}/rest/v1/datasets?id=eq.${existingDataset[0].id}`,
                            serviceRoleKey,
                            dataset
                        );
                        syncResults.datasets.synced++;
                    } else {
                        // Create new dataset
                        await createSupabaseData(
                            `${supabaseUrl}/rest/v1/datasets`,
                            serviceRoleKey,
                            { ...dataset, created_at: new Date().toISOString() }
                        );
                        syncResults.datasets.synced++;
                    }
                } catch (error) {
                    console.error('Error syncing dataset:', error);
                    syncResults.datasets.errors++;
                }
            }
        } catch (error) {
            console.error('Failed to sync datasets:', error);
        }

        const totalSynced = Object.values(syncResults).reduce((sum, result) => sum + result.synced, 0);
        const totalErrors = Object.values(syncResults).reduce((sum, result) => sum + result.errors, 0);

        console.log('Notion sync completed:', { totalSynced, totalErrors, results: syncResults });

        return new Response(JSON.stringify({
            data: {
                sync_completed: true,
                timestamp: new Date().toISOString(),
                total_synced: totalSynced,
                total_errors: totalErrors,
                details: syncResults
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Notion sync error:', error);

        const errorResponse = {
            error: {
                code: 'NOTION_SYNC_FAILED',
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

// Helper function to fetch Notion database
async function fetchNotionDatabase(apiKey: string, databaseId: string) {
    if (databaseId.includes('_db_id')) {
        // Return mock data for demonstration since we don't have actual Notion database IDs
        console.log('Using mock data for database:', databaseId);
        return getMockNotionData(databaseId);
    }

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
            page_size: 100
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Notion API error:', errorText);
        throw new Error(`Notion API error: ${errorText}`);
    }

    const data = await response.json();
    return data.results || [];
}

// Helper function to get Notion property value
function getNotionProperty(item: any, propertyName: string, type: string) {
    const property = item.properties?.[propertyName];
    if (!property) return null;

    switch (type) {
        case 'title':
            return property.title?.[0]?.plain_text || null;
        case 'rich_text':
            return property.rich_text?.map((t: any) => t.plain_text).join('') || null;
        case 'select':
            return property.select?.name || null;
        case 'multi_select':
            return property.multi_select?.map((s: any) => s.name) || [];
        case 'checkbox':
            return property.checkbox;
        case 'number':
            return property.number;
        default:
            return null;
    }
}

// Helper functions for Supabase operations
async function fetchSupabaseData(url: string, serviceRoleKey: string) {
    const response = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey
        }
    });
    return response.ok ? await response.json() : [];
}

async function createSupabaseData(url: string, serviceRoleKey: string, data: any) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create data: ${errorText}`);
    }
    return response.json();
}

async function updateSupabaseData(url: string, serviceRoleKey: string, data: any) {
    const response = await fetch(url, {
        method: 'PATCH',
        headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update data: ${errorText}`);
    }
    return response.json();
}

// Mock data for demonstration
function getMockNotionData(databaseId: string) {
    if (databaseId === 'personas_db_id') {
        return [
            {
                properties: {
                    'Name': { title: [{ plain_text: '靈信助理' }] },
                    'Description': { rich_text: [{ plain_text: '溫暖、智慧的生活助理，具備記憶能力和承諾管理功能' }] },
                    'Traits': { multi_select: [{ name: '溫暖' }, { name: '智慧' }, { name: '可靠' }] },
                    'Communication Style': { select: { name: 'friendly' } },
                    'Knowledge Domains': { multi_select: [{ name: '生活管理' }, { name: '時間規劃' }] },
                    'Core Values': { multi_select: [{ name: '信守承諾' }, { name: '用戶為中心' }] },
                    'Active': { checkbox: true },
                    'Locked': { checkbox: false },
                    'Version': { number: 1 }
                }
            }
        ];
    }

    if (databaseId === 'start_phrases_db_id') {
        return [
            {
                properties: {
                    'Phrase': { title: [{ plain_text: '提醒' }] },
                    'Context Pattern': { rich_text: [{ plain_text: '.*(?:提醒|記得|別忘了).*' }] },
                    'Trigger Probability': { number: 0.9 },
                    'Action Chips': { multi_select: [{ name: '設定提醒' }, { name: '加到行事曆' }, { name: '稍後提醒' }] },
                    'Category': { select: { name: 'reminder' } },
                    'Active': { checkbox: true }
                }
            },
            {
                properties: {
                    'Phrase': { title: [{ plain_text: '明天' }] },
                    'Context Pattern': { rich_text: [{ plain_text: '.*明天.*(?:做|要|記得).*' }] },
                    'Trigger Probability': { number: 0.8 },
                    'Action Chips': { multi_select: [{ name: '明天提醒' }, { name: '設定行程' }, { name: '加入待辦' }] },
                    'Category': { select: { name: 'schedule' } },
                    'Active': { checkbox: true }
                }
            }
        ];
    }

    return [];
}