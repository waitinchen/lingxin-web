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
        let action;
        
        if (req.method === 'GET') {
            action = url.searchParams.get('action') || 'callback';
        } else {
            // For POST requests, get action from body
            const body = await req.json();
            action = body.action || 'callback';
        }

        // Get environment variables
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

        if (!supabaseUrl || !serviceRoleKey || !googleClientId || !googleClientSecret) {
            throw new Error('Required configuration missing');
        }

        console.log('Google OAuth request:', { action, method: req.method });

        if (action === 'url') {
            // Generate OAuth URL - redirect to frontend callback page
            const frontendUrl = url.searchParams.get('frontend_url') || 'https://a3v9mxlldxc6.space.minimax.io';
            const redirectUri = `${frontendUrl}/oauth/google/callback`;
            const scope = 'openid email profile';
            const state = crypto.randomUUID();
            
            const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
            oauthUrl.searchParams.set('client_id', googleClientId);
            oauthUrl.searchParams.set('redirect_uri', redirectUri);
            oauthUrl.searchParams.set('response_type', 'code');
            oauthUrl.searchParams.set('scope', scope);
            oauthUrl.searchParams.set('state', state);
            oauthUrl.searchParams.set('access_type', 'offline');
            oauthUrl.searchParams.set('prompt', 'consent');

            return new Response(JSON.stringify({
                data: {
                    oauth_url: oauthUrl.toString(),
                    state: state,
                    redirect_uri: redirectUri
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'exchange') {
            // Handle token exchange from frontend
            const requestData = await req.json();
            const { code, redirect_uri } = requestData;

            if (!code || !redirect_uri) {
                throw new Error('Authorization code and redirect_uri are required');
            }

            console.log('Processing OAuth token exchange with code:', code.substring(0, 20) + '...');

            // Exchange code for tokens
            const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: googleClientId,
                    client_secret: googleClientSecret,
                    code: code,
                    grant_type: 'authorization_code',
                    redirect_uri: redirect_uri
                }).toString()
            });

            if (!tokenResponse.ok) {
                const errorData = await tokenResponse.text();
                console.error('Token exchange failed:', errorData);
                throw new Error(`Token exchange failed: ${errorData}`);
            }

            const tokenData = await tokenResponse.json();
            console.log('Token exchange successful');

            // Get user info from Google
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    'Authorization': `Bearer ${tokenData.access_token}`
                }
            });

            if (!userInfoResponse.ok) {
                throw new Error('Failed to get user info from Google');
            }

            const googleUser = await userInfoResponse.json();
            console.log('Google user info retrieved:', { id: googleUser.id, email: googleUser.email });

            // Check if user exists
            const existingUserResponse = await fetch(`${supabaseUrl}/rest/v1/user_identities?provider=eq.google&provider_id=eq.${googleUser.id}`, {
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey
                }
            });

            let userId;
            let isNewUser = false;

            if (existingUserResponse.ok) {
                const existingIdentities = await existingUserResponse.json();
                if (existingIdentities.length > 0) {
                    userId = existingIdentities[0].user_id;
                    console.log('Existing user found:', userId);
                } else {
                    // Create new user
                    isNewUser = true;
                    const newUserResponse = await fetch(`${supabaseUrl}/rest/v1/users`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify({
                            email: googleUser.email,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            is_active: true
                        })
                    });

                    if (!newUserResponse.ok) {
                        const errorText = await newUserResponse.text();
                        console.error('Failed to create user:', errorText);
                        throw new Error('Failed to create user account');
                    }

                    const newUser = await newUserResponse.json();
                    userId = newUser[0].id;
                    console.log('New user created:', userId);

                    // Create user profile
                    await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            full_name: googleUser.name,
                            avatar_url: googleUser.picture,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                    });

                    // Create user identity
                    await fetch(`${supabaseUrl}/rest/v1/user_identities`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            provider: 'google',
                            provider_id: googleUser.id,
                            provider_data: {
                                email: googleUser.email,
                                name: googleUser.name,
                                picture: googleUser.picture,
                                verified_email: googleUser.verified_email
                            },
                            created_at: new Date().toISOString()
                        })
                    });

                    // Initialize nudge preferences
                    await fetch(`${supabaseUrl}/rest/v1/nudge_prefs`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'apikey': serviceRoleKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            user_id: userId,
                            dnd_enabled: false,
                            max_daily_nudges: 3,
                            timezone: 'Asia/Taipei',
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString()
                        })
                    });
                }
            } else {
                throw new Error('Failed to check existing user');
            }

            // Log the login event
            await fetch(`${supabaseUrl}/rest/v1/audit_login_events`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${serviceRoleKey}`,
                    'apikey': serviceRoleKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: userId,
                    email: googleUser.email,
                    login_method: 'google',
                    success: true,
                    ip_address: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
                    user_agent: req.headers.get('user-agent'),
                    created_at: new Date().toISOString()
                })
            });

            // Create session token (JWT)
            const jwtPayload = {
                sub: userId,
                email: googleUser.email,
                name: googleUser.name,
                picture: googleUser.picture,
                provider: 'google',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
                aud: 'lingxin-2.0',
                iss: 'lingxin-auth'
            };

            // Simple JWT encoding (for demo - in production use proper JWT library)
            const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
            const payload = btoa(JSON.stringify(jwtPayload));
            const signature = btoa('simple_signature'); // In production, use proper HMAC
            const jwt = `${header}.${payload}.${signature}`;

            // Return user data as JSON instead of redirecting
            console.log('OAuth exchange successful for user:', userId);

            return new Response(JSON.stringify({
                data: {
                    user: {
                        id: userId,
                        email: googleUser.email,
                        name: googleUser.name,
                        picture: googleUser.picture
                    },
                    token: jwt,
                    is_new_user: isNewUser,
                    provider: 'google'
                }
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        if (action === 'verify') {
            // Verify JWT token
            const { token } = await req.json();
            
            if (!token) {
                throw new Error('Token is required');
            }

            try {
                // Simple JWT decoding (in production use proper verification)
                const parts = token.split('.');
                if (parts.length !== 3) {
                    throw new Error('Invalid token format');
                }

                const payload = JSON.parse(atob(parts[1]));
                
                // Check expiration
                if (payload.exp < Math.floor(Date.now() / 1000)) {
                    throw new Error('Token expired');
                }

                // Get user data
                const userResponse = await fetch(`${supabaseUrl}/rest/v1/users?id=eq.${payload.sub}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                if (!userResponse.ok) {
                    throw new Error('User not found');
                }

                const users = await userResponse.json();
                if (users.length === 0) {
                    throw new Error('User not found');
                }

                const user = users[0];

                // Get user profile
                const profileResponse = await fetch(`${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${serviceRoleKey}`,
                        'apikey': serviceRoleKey
                    }
                });

                let profile = null;
                if (profileResponse.ok) {
                    const profiles = await profileResponse.json();
                    profile = profiles[0] || null;
                }

                return new Response(JSON.stringify({
                    data: {
                        user: {
                            id: user.id,
                            email: user.email,
                            created_at: user.created_at,
                            is_active: user.is_active
                        },
                        profile: profile,
                        token_valid: true
                    }
                }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });

            } catch (error) {
                console.error('Token verification failed:', error);
                throw new Error('Invalid token');
            }
        }

        throw new Error('Invalid action');

    } catch (error) {
        console.error('Google OAuth error:', error);

        const errorResponse = {
            error: {
                code: 'OAUTH_FAILED',
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