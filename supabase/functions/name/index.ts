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
    const spiritId = body?.spirit_id;
    const name = (body?.name || '').trim();

    if (!spiritId) {
      return new Response(JSON.stringify({
        error: { code: 'INVALID_PAYLOAD', message: 'spirit_id is required' }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!name) {
      return new Response(JSON.stringify({
        error: { code: 'INVALID_NAME', message: 'name is required' }
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

    if (!spirit || spirit.owner_id !== userId) {
      return new Response(JSON.stringify({
        error: { code: 'NOT_FOUND', message: 'Spirit not found' }
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (spirit.status === 'revoked') {
      return new Response(JSON.stringify({
        error: { code: 'SPIRIT_REVOKED', message: 'Revoked spirits cannot be renamed' }
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (spirit.name) {
      return new Response(JSON.stringify({
        error: { code: 'NAME_LOCKED', message: 'Spirit has already been named' }
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const updatePayload: Record<string, unknown> = {
      name,
      status: spirit.status === 'infant' ? 'named' : spirit.status,
      updated_at: new Date().toISOString()
    };

    const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_spirits?id=eq.${spiritId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    if (!updateResponse.ok) {
      const text = await updateResponse.text();
      throw new Error(`Failed to update spirit: ${text}`);
    }

    await logSpiritEvent(supabaseUrl, serviceRoleKey, spiritId, 'named', { name });
    await pushBadgeIfNeeded(supabaseUrl, serviceRoleKey, spirit, '好學');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Name function error:', error);
    return new Response(JSON.stringify({
      error: { code: 'NAME_FAILED', message: error.message }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function logSpiritEvent(
  supabaseUrl: string,
  serviceRoleKey: string,
  spiritId: string,
  kind: string,
  payload: Record<string, unknown>
) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/spirit_events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ spirit_id: spiritId, kind, payload, created_at: new Date().toISOString() })
    });
  } catch (error) {
    console.error('Failed to record spirit event:', error);
  }
}

async function pushBadgeIfNeeded(
  supabaseUrl: string,
  serviceRoleKey: string,
  spirit: any,
  badge: string
) {
  try {
    const existingBadges = Array.isArray(spirit?.persona_badges) ? spirit.persona_badges : [];
    if (existingBadges.includes(badge)) {
      return;
    }

    const updatedBadges = [...existingBadges, badge];
    await fetch(`${supabaseUrl}/rest/v1/user_spirits?id=eq.${spirit.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        persona_badges: updatedBadges,
        updated_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('Failed to push badge:', error);
  }
}
