// functions/api/payment.js
// POST /api/payment — create a new payment intent
// Secrets used: UPI_ID, PAYEE_NAME, CURRENCY (never sent to frontend)

export async function onRequestPost(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const body = await context.request.json();
    const { amount, note = 'Payment', buyer_name = 'Customer' } = body;

    if (!amount || isNaN(amount) || Number(amount) < 1) {
      return new Response(JSON.stringify({ error: 'Invalid amount' }), {
        status: 400, headers: corsHeaders,
      });
    }

    const id = 'pay_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    const upiUrl = `upi://pay?pa=${encodeURIComponent(env.UPI_ID)}&pn=${encodeURIComponent(env.PAYEE_NAME)}&am=${amount}&cu=${env.CURRENCY || 'INR'}&tn=${encodeURIComponent(note)}`;

    const payment = {
      id,
      amount: Number(amount),
      note,
      buyer_name,
      upi_url: upiUrl,
      upi_id: env.UPI_ID,
      payee_name: env.PAYEE_NAME,
      status: 'pending',
      created_at: new Date().toISOString(),
      utr: null,
    };

    // Store in KV if available, otherwise return for client-side storage
    if (env.PAYMENTS_KV) {
      await env.PAYMENTS_KV.put(id, JSON.stringify(payment), {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return new Response(JSON.stringify({
      id: payment.id,
      amount: payment.amount,
      upi_url: payment.upi_url,
      upi_id: payment.upi_id,
      payee_name: payment.payee_name,
      status: payment.status,
      note: payment.note,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', detail: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
