/// <reference types="https://deno.land/x/types/deno.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log("Send Push Notification function started")

// Helper function to get OAuth2 access token for FCM
async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }

  // Encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  // Create signature (simplified - in production use proper JWT library)
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  // For now, we'll use a simpler approach with FCM legacy API
  // In production, implement proper JWT signing with RS256

  return 'dummy_token' // This will be replaced with proper OAuth2 implementation
}

serve(async (req) => {
  try {
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get request body
    const { token, title, body, data = {} } = await req.json()

    // Validate required fields
    if (!token || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, title, body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get Firebase service account
    const serviceAccount = JSON.parse(
      Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}'
    )

    if (!serviceAccount.project_id) {
      throw new Error('Firebase service account not configured')
    }

    // For now, we'll simulate successful sending and log to database
    // In production, implement proper FCM HTTP v1 API call
    console.log('Simulating FCM message send for token:', token.substring(0, 20) + '...')
    console.log('Title:', title)
    console.log('Body:', body)
    console.log('Data:', data)

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Log to Supabase for tracking
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase
        .from('notification_logs')
        .insert([{
          fcm_token: token,
          title: title,
          body: body,
          data: data,
          fcm_response: messageId,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }])
    } catch (logError) {
      console.error('Error logging notification:', logError)
      // Don't fail the main operation if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: messageId,
        message: 'Push notification sent successfully (simulated)'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error sending push notification:', error)

    // Log error to Supabase
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)

      await supabase
        .from('notification_logs')
        .insert([{
          fcm_token: 'unknown',
          title: 'Error',
          body: error.message,
          data: {},
          fcm_response: null,
          status: 'failed',
          error_message: error.message,
          sent_at: new Date().toISOString(),
        }])
    } catch (logError) {
      console.error('Error logging failed notification:', logError)
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send push notification'
      }),
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          'Content-Type': 'application/json'
        }
      }
    )
  }
})
