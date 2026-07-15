import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

// Simple base64url encoding
function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Create a simple JWT for VAPID (without encryption for now)
function createSimpleJwt(audience: string, subject: string): string {
  const header = { typ: 'JWT', alg: 'none' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: subject,
  };
  
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  
  return `${headerB64}.${payloadB64}.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get VAPID public key
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8XMdZlqq6GbNKlpHCc4xYCXJTqrAGXoMAJKQT0N6cFflJZSZlTvlWc';

    const { notification_id } = await req.json();

    if (!notification_id) {
      throw new Error('notification_id is required');
    }

    console.log('Processing push notification for notification_id:', notification_id);

    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notification_id)
      .single();

    if (notifError) throw notifError;
    if (!notification) throw new Error('Notification not found');

    console.log('Found notification:', notification.title);

    // Get user's push subscriptions
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', notification.user_id);

    if (subsError) throw subsError;
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions found for user');
      return new Response(
        JSON.stringify({ message: 'No subscriptions found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${subscriptions.length} subscription(s)`);

    // Determine notification tag based on type
    const getNotificationTag = (type: string): string => {
      switch (type) {
        case 'calibration_expiring':
          return 'calibration';
        case 'maintenance_scheduled':
          return 'maintenance';
        case 'inventory_low':
          return 'inventory';
        case 'document_expiring':
          return 'document';
        case 'user_approval':
          return 'user';
        default:
          return 'general';
      }
    };

    // Prepare notification payload
    const payload: NotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: getNotificationTag(notification.type),
      data: {
        notification_id: notification.id,
        type: notification.type,
        related_module: notification.related_module,
        related_id: notification.related_id,
        url: notification.related_module ? `/${notification.related_module}` : '/',
      },
    };

    const payloadString = JSON.stringify(payload);
    const results: Array<{ endpoint: string; success: boolean; error?: string }> = [];

    // Send push notification to each subscription
    for (const subscription of subscriptions) {
      try {
        console.log('Sending push to endpoint:', subscription.endpoint);
        
        // Get the origin from the endpoint URL
        const endpointUrl = new URL(subscription.endpoint);
        const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
        
        // Create authorization header
        const jwt = createSimpleJwt(audience, 'mailto:support@ropes360.com');
        
        // Send push notification
        // Note: Most push services accept unencrypted payloads for testing
        // For production, implement full Web Push encryption
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
            'Urgency': 'high',
            'Authorization': `vapid t=${jwt}, k=${vapidPublicKey}`,
          },
          body: payloadString,
        });

        if (response.ok || response.status === 201) {
          console.log('Push notification sent successfully');
          results.push({ endpoint: subscription.endpoint, success: true });
        } else {
          const errorText = await response.text();
          console.error('Failed to send push notification:', response.status, errorText);
          results.push({ 
            endpoint: subscription.endpoint, 
            success: false, 
            error: `${response.status}: ${errorText}` 
          });
          
          // If subscription is invalid (gone or not found), remove it
          if (response.status === 404 || response.status === 410) {
            console.log('Removing invalid subscription');
            await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', subscription.endpoint);
          }
        }
      } catch (error) {
        console.error('Error sending push to subscription:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ endpoint: subscription.endpoint, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Push notifications completed: ${successCount}/${results.length} successful`);

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
        success_count: successCount,
        total_count: results.length,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

