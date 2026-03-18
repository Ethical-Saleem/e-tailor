// supabase/functions/notify-order-ready/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: sends a WhatsApp message when an order status becomes "ready".
// Called from the frontend via supabase.functions.invoke('notify-order-ready').
//
// Requires: WHATSAPP_TOKEN env var (Meta Business API token).
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface NotifyPayload {
  orderId:       string
  customerName:  string
  customerPhone: string
  orderNumber:   string
  shopName:      string
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const payload: NotifyPayload = await req.json()

    // Validate required fields
    if (!payload.orderId || !payload.customerPhone || !payload.orderNumber) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Clean phone number (remove spaces, dashes, ensure + prefix)
    const phone = payload.customerPhone
      .replace(/[\s\-\(\)]/g, '')
      .replace(/^0/, '+234') // Nigeria default
    if (!phone.startsWith('+')) {
      return new Response(JSON.stringify({ error: 'Invalid phone number format' }), { status: 400 })
    }

    const whatsappToken   = Deno.env.get('WHATSAPP_TOKEN')
    const whatsappPhoneId = Deno.env.get('WHATSAPP_PHONE_ID')

    if (!whatsappToken || !whatsappPhoneId) {
      // WhatsApp not configured — log and return success gracefully
      console.warn('WhatsApp not configured — skipping notification')
      return new Response(JSON.stringify({ sent: false, reason: 'WhatsApp not configured' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Build WhatsApp message
    const message = `Hello ${payload.customerName}! 🎉\n\nYour order *${payload.orderNumber}* from *${payload.shopName}* is *ready for pickup*!\n\nPlease contact us to arrange collection. Thank you for choosing us! 🙏`

    // Send via Meta WhatsApp Cloud API
    const waRes = await fetch(
      `https://graph.facebook.com/v18.0/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to:                phone,
          type:              'text',
          text:              { body: message },
        }),
      },
    )

    const waData = await waRes.json()

    if (!waRes.ok) {
      console.error('WhatsApp API error:', waData)
      return new Response(JSON.stringify({ sent: false, error: waData }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Log notification in Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    await supabase.from('order_events').insert({
      order_id:   payload.orderId,
      event_type: 'note_added',
      new_value:  'whatsapp_notification_sent',
      note:       `WhatsApp notification sent to ${phone}`,
      created_at: new Date().toISOString(),
    })

    return new Response(JSON.stringify({ sent: true, messageId: waData.messages?.[0]?.id }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    console.error('notify-order-ready error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
