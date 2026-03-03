import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

serve(async (req) => {
  try {
    const payload = await req.json()
    
    console.log('OPay callback received:', JSON.stringify(payload))

    // Extract reference from the callback
    const reference = payload.reference || payload.data?.reference
    const status = payload.status || payload.data?.status

    if (!reference) {
      return new Response(JSON.stringify({ error: 'No reference found' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Map OPay status to our status
    let orderStatus = 'pending'
    if (status === 'SUCCESS' || status === 'success') {
      orderStatus = 'paid'
    } else if (status === 'FAILED' || status === 'FAIL') {
      orderStatus = 'failed'
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: orderStatus })
      .eq('opay_reference', reference)

    if (updateError) {
      console.error('Update error:', updateError)
      return new Response(JSON.stringify({ 
        error: 'Failed to update order',
        details: updateError 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // If payment successful, clear user's cart
    if (orderStatus === 'paid') {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id')
        .eq('opay_reference', reference)
        .single()

      if (order?.user_id) {
        await supabase
          .from('cart_items')
          .delete()
          .eq('user_id', order.user_id)
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      reference: reference,
      status: orderStatus
    }), {
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Verify payment error:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
