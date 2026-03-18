// supabase/functions/generate-invoice/index.ts
// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: returns structured invoice data for client-side PDF rendering.
// The actual PDF is rendered on the client using the browser's print API
// or a library like jsPDF.
// ─────────────────────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req: Request) => {
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
    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId required' }), { status: 400 })
    }

    // Auth check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    // Fetch order (RLS ensures user can only access their own data)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select(`
        *,
        customers (name, phone, email, address)
      `)
      .eq('id', orderId)
      .single()

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404 })
    }

    // Fetch shop
    const { data: shop } = await supabase
      .from('shops')
      .select('name, phone, address, currency, settings')
      .eq('id', order.shop_id)
      .single()

    // Fetch payments for this order
    const { data: payments } = await supabase
      .from('payments')
      .select('amount, method, created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })

    // Build invoice data
    const invoice = {
      invoiceNumber: order.order_number,
      date:          new Date().toISOString().slice(0, 10),
      dueDate:       order.due_date,
      status:        order.payment_status,

      shop: {
        name:     shop?.name ?? 'My Shop',
        phone:    shop?.phone,
        address:  shop?.address,
        currency: shop?.currency ?? 'NGN',
        footer:   shop?.settings?.invoiceFooter,
      },

      customer: {
        name:    order.customers?.name ?? order.customer_name,
        phone:   order.customers?.phone ?? order.customer_phone,
        email:   order.customers?.email,
        address: order.customers?.address,
      },

      items: order.items ?? [],

      pricing: {
        subtotal:    order.subtotal,
        discount:    order.discount,
        discountType: order.discount_type,
        tax:         order.tax,
        total:       order.total,
        amountPaid:  order.amount_paid,
        balance:     Math.max(0, order.total - order.amount_paid),
      },

      payments: (payments ?? []).map((p: Record<string, unknown>) => ({
        amount:    p.amount,
        method:    p.method,
        date:      (p.created_at as string).slice(0, 10),
      })),

      styleNotes: order.style_notes,
    }

    return new Response(JSON.stringify(invoice), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })

  } catch (err) {
    console.error('generate-invoice error:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
})
