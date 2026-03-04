import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPAY_MERCHANT_ID = Deno.env.get('OPAY_MERCHANT_ID') || '256626030359533'
const OPAY_PUBLIC_KEY = Deno.env.get('OPAY_PUBLIC_KEY') || ''
const OPAY_MODE = Deno.env.get('OPAY_MODE') || 'test'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { items, customerName, customerPhone, customerAddress } = await req.json()

    if (!items || items.length === 0) {
      throw new Error('No items provided')
    }

    let totalAmount = 0
    for (const item of items) {
      totalAmount += item.price * item.quantity
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        total_amount: totalAmount,
        status: 'pending',
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress
      })
      .select()
      .single()

    if (orderError) throw orderError

    for (const item of items) {
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      })
    }

    const reference = `WP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    await supabase.from('orders').update({ opay_reference: reference }).eq('id', order.id)

    const currency = 'NGN'
    const callbackUrl = `${req.headers.get('origin')}/pages/checkout.html?status=success&ref=${reference}`
    const returnUrl = `${req.headers.get('origin')}/pages/checkout.html?status=success&ref=${reference}`

    const opayCheckoutUrl = OPAY_MODE === 'production'
      ? 'https://checkout.opaycheckout.com'
      : 'https://sandbox-checkout.opaycheckout.com'

    const paymentUrl = `${opayCheckoutUrl}?merchantId=${OPAY_MERCHANT_ID}&reference=${reference}&amount=${totalAmount}&currency=${currency}&callbackUrl=${encodeURIComponent(callbackUrl)}&returnUrl=${encodeURIComponent(returnUrl)}&customerName=${encodeURIComponent(customerName)}&customerPhone=${encodeURIComponent(customerPhone)}&customerEmail=&productName=${encodeURIComponent(items[0].name)}${items.length > 1 ? '&productCount=' + items.length : ''}`

    return new Response(JSON.stringify({
      success: true,
      cashierUrl: paymentUrl,
      orderId: order.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
