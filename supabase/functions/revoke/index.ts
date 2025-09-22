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
    const isAdmin = userData?.app_metadata?.role === 'admin' || userData?.user_metadata?.role === 'admin';

    if (!isAdmin) {
      return new Response(JSON.stringify({
        error: { code: 'FORBIDDEN', message: 'Admin privileges required' }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const spiritId = body?.spirit_id;
    const reason = (body?.reason || '').trim() || 'unspecified';

    if (!spiritId) {
      return new Response(JSON.stringify({
        error: { code: 'INVALID_PAYLOAD', message: 'spirit_id is required' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const spiritResponse = await fetch(`${supabaseUrl}/rest/v1/user_spirits?id=eq.${spiritId}`, {
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey
      }
    });

    if (!spiritResponse.ok) {
      const text = await spiritResponse.text();
      throw new Error(`Failed to load spirit: ${text}`);
    }

    const spirits = await spiritResponse.json();
    const spirit = Array.isArray(spirits) ? spirits[0] : spirits;

    if (!spirit) {
      return new Response(JSON.stringify({
        error: { code: 'NOT_FOUND', message: 'Spirit not found' }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (spirit.status === 'revoked') {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_spirits?id=eq.${spiritId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'revoked',
        revoke_reason: reason,
        persona_locked: true,
        updated_at: new Date().toISOString()
      })
    });

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      throw new Error(`Failed to revoke spirit: ${text}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Revoke function error:', error);
    return new Response(JSON.stringify({
      error: { code: 'REVOKE_FAILED', message: error.message }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
