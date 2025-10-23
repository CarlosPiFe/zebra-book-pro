import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/gmail-oauth-callback`;

  try {
    // Step 1: Redirect to Google OAuth
    if (action === 'start') {
      const scopes = [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/gmail.readonly'
      ];
      
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.append('client_id', clientId!);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scopes.join(' '));
      authUrl.searchParams.append('access_type', 'offline');
      authUrl.searchParams.append('prompt', 'consent');

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': authUrl.toString(),
        },
      });
    }

    // Step 2: Handle callback from Google
    const code = url.searchParams.get('code');
    if (code) {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();
      
      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      // Display the refresh token
      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Gmail OAuth - Refresh Token</title>
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: #f5f5f5;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }
              h1 {
                color: #333;
                margin-bottom: 20px;
              }
              .token-box {
                background: #f8f9fa;
                border: 2px solid #e9ecef;
                border-radius: 4px;
                padding: 15px;
                margin: 20px 0;
                word-break: break-all;
                font-family: monospace;
                font-size: 14px;
              }
              .success {
                color: #28a745;
                margin-bottom: 15px;
              }
              .instructions {
                color: #666;
                line-height: 1.6;
              }
              button {
                background: #007bff;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                margin-top: 10px;
              }
              button:hover {
                background: #0056b3;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>✅ OAuth Exitoso</h1>
              <p class="success">Se han obtenido los tokens correctamente.</p>
              
              <h2>Refresh Token:</h2>
              <div class="token-box" id="refreshToken">${tokens.refresh_token || 'No refresh token received'}</div>
              <button onclick="copyToken()">Copiar Refresh Token</button>
              
              <div class="instructions">
                <h3>Siguiente paso:</h3>
                <p>Copia el refresh token de arriba y agrégalo como un secreto llamado <code>GMAIL_REFRESH_TOKEN</code> en tu proyecto.</p>
                <p>Una vez agregado el secreto, puedes eliminar esta función temporal.</p>
              </div>
            </div>
            <script>
              function copyToken() {
                const token = document.getElementById('refreshToken').textContent;
                navigator.clipboard.writeText(token).then(() => {
                  alert('Refresh token copiado al portapapeles!');
                });
              }
            </script>
          </body>
        </html>
      `;

      return new Response(html, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
      });
    }

    // Default response
    return new Response('Invalid request. Add ?action=start to begin OAuth flow.', {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' },
    });

  } catch (error) {
    console.error('OAuth error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
