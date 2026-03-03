import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPAY_MERCHANT_ID = Deno.env.get('OPAY_MERCHANT_ID') || '256626030359533'
const OPAY_PUBLIC_KEY = Deno.env.get('OPAY_PUBLIC_KEY') || 'OPAYPUB17725454795800.07492404697304189'
const OPAY_API_URL = Deno.env.get('OPAY_MODE') === 'production' 
  ? 'https://liveapi.opaycheckout.com/api/v1/international/cashier/create'
  : 'https://testapi.opaycheckout.com/api/v1/international/cashier/create'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const { items, customerName, customerPhone, customerAddress } = await req.json()

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No items in cart' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Calculate total amount
    const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
    const reference = `WAT${Date.now()}${Math.random().toString(36).substring(7).toUpperCase()}`

const GITHUB_PAGES_URL = 'https://adedayo924.github.io/wonderful'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!

    // Prepare OPay request
    const opayRequest = {
      country: 'NG',
      reference: reference,
      amount: {
        total: Math.round(totalAmount * 100), // Convert to kobo
        currency: 'NGN'
      },
      returnUrl: `${GITHUB_PAGES_URL}/pages/checkout.html?status=success&ref=${reference}`,
      callbackUrl: `${SUPABASE_URL}/functions/v1/verify-payment`,
      cancelUrl: `${GITHUB_PAGES_URL}/pages/checkout.html?status=cancelled`,
      displayName: 'Wonderful Auto & Tech',
      customerVisitSource: 'BROWSER',
      evokeOpay: true,
      expireAt: 30,
      userInfo: {
        userName: customerName || 'Customer',
        userMobile: customerPhone || '',
        userEmail: ''
      },
      product: {
        name: 'Wonderful Auto & Tech Purchase',
        description: `${items.length} items purchased`
      }
    }

    // Call OPay API
    const response = await fetch(OPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPAY_PUBLIC_KEY}`,
        'MerchantId': OPAY_MERCHANT_ID
      },
      body: JSON.stringify(opayRequest)
    })

    const opayResult = await response.json()

    if (opayResult.code !== '00000') {
      return new Response(JSON.stringify({ 
        error: opayResult.message || 'OPay payment creation failed',
        opayError: opayResult
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Create order in database
    const { data: { user } } = await supabase.auth.getUser(req.headers.get('Authorization')?.replace('Bearer ', ''))
    
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user?.id || null,
        total_amount: totalAmount,
        status: 'pending',
        opay_reference: reference,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_address: customerAddress
      })
      .select()
      .single()

    if (orderError) {
      console.error('Order creation error:', orderError)
    }

    // Create order items
    if (order) {
      const orderItems = items.map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price
      }))

      await supabase.from('order_items').insert(orderItems)
    }

    return new Response(JSON.stringify({
      success: true,
      cashierUrl: opayResult.data.cashierUrl,
      reference: reference,
      orderId: order?.id
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Payment error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
