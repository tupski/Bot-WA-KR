import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Firebase Admin SDK imports
import { initializeApp, cert, getApps } from "https://esm.sh/firebase-admin@11.8.0/app"
import { getMessaging } from "https://esm.sh/firebase-admin@11.8.0/messaging"

console.log("Send Push Notification function started")

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

    // Initialize Firebase Admin if not already initialized
    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(
        Deno.env.get('FIREBASE_SERVICE_ACCOUNT') || '{}'
      )

      if (!serviceAccount.project_id) {
        throw new Error('Firebase service account not configured')
      }

      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      })
    }

    // Get Firebase Messaging instance
    const messaging = getMessaging()

    // Prepare notification message
    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
      },
      android: {
        notification: {
          channelId: data.channel || 'kakarama_notifications',
          priority: data.priority || 'high',
          sound: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    }

    console.log('Sending FCM message:', JSON.stringify(message, null, 2))

    // Send the message
    const response = await messaging.send(message)
    
    console.log('FCM message sent successfully:', response)

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
          fcm_response: response,
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
        messageId: response,
        message: 'Push notification sent successfully' 
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
