const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are supported' }
      }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase configuration missing');
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'Missing authorization header' }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': serviceRoleKey
      }
    });

    if (!userResponse.ok) {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'Invalid user session' }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userData = await userResponse.json();
    const userId = userData?.id;

    if (!userId) {
      return new Response(JSON.stringify({
        error: { code: 'UNAUTHORIZED', message: 'User not found' }
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const enneagram = body?.enneagram;

    if (!enneagram || typeof enneagram !== 'object') {
      return new Response(JSON.stringify({
        error: { code: 'INVALID_PAYLOAD', message: 'enneagram payload is required' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const requiredKeys = ['e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9'];
    for (const key of requiredKeys) {
      const value = enneagram[key];
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 10) {
        return new Response(JSON.stringify({
          error: {
            code: 'INVALID_ENNEAGRAM_VALUE',
            message: `Enneagram value for ${key} must be an integer between 1 and 10`
          }
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    const existingResponse = await fetch(`${supabaseUrl}/rest/v1/user_spirits?owner_id=eq.${userId}&status=in.("infant","named","bonding","mature")`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!existingResponse.ok) {
      const text = await existingResponse.text();
      throw new Error(`Failed to check existing spirits: ${text}`);
    }

    const existingSpirits = await existingResponse.json();
    if (Array.isArray(existingSpirits) && existingSpirits.length > 0) {
      return new Response(JSON.stringify({
        error: {
          code: 'ACTIVE_SPIRIT_EXISTS',
          message: 'You already have an active spirit'
        }
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/user_spirits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        owner_id: userId,
        enneagram,
        persona_locked: true,
        welfare_score: 100,
        trust_level: 0,
        status: 'infant'
      })
    });

    if (!createResponse.ok) {
      const text = await createResponse.text();
      throw new Error(`Failed to create spirit: ${text}`);
    }

    const created = await createResponse.json();
    const spirit = Array.isArray(created) ? created[0] : created;

    return new Response(JSON.stringify({
      ok: true,
      spirit_id: spirit?.id
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Adopt function error:', error);
    return new Response(JSON.stringify({
      error: { code: 'ADOPT_FAILED', message: error.message }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
