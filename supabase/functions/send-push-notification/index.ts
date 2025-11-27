import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    // VAPID keys - In production, generate your own at https://vapidkeys.com/
    const vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib37J8XMdZlqq6GbNKlpHCc4xYCXJTqrAGXoMAJKQT0N6cFflJZSZlTvlWc';
    const vapidPrivateKey = 'q5UhzBEjO44-5WVKC5-XsE5WuJKPX0w9nNJNkxQKQkE';

    // Prepare notification payload
    const payload: NotificationPayload = {
      title: notification.title,
      body: notification.message,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: {
        notification_id: notification.id,
        type: notification.type,
        related_module: notification.related_module,
        related_id: notification.related_id,
      },
    };

    const results = [];

    // Send push notification to each subscription
    for (const subscription of subscriptions) {
      try {
        // Use web-push library equivalent in Deno
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        };

        // For simplicity, we'll use the fetch API to send to the push service
        // In production, consider using a proper web-push library
        console.log('Sending push to endpoint:', subscription.endpoint);

        // Note: This is a simplified version. In production, you should:
        // 1. Implement proper VAPID authentication
        // 2. Use a web-push library for Deno
        // 3. Handle different push service endpoints properly
        
        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log('Push notification sent successfully');
          results.push({ endpoint: subscription.endpoint, success: true });
        } else {
          console.error('Failed to send push notification:', response.statusText);
          results.push({ endpoint: subscription.endpoint, success: false, error: response.statusText });
        }
      } catch (error) {
        console.error('Error sending push to subscription:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({ endpoint: subscription.endpoint, success: false, error: errorMessage });
      }
    }

    return new Response(
      JSON.stringify({ 
        message: 'Push notifications processed',
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
