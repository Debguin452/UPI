// functions/api/admin/confirm.js
// POST /api/admin/confirm — mark a payment as confirmed
// Requires X-Admin-Secret header matching ADMIN_SECRET env var

export async function onRequestPost(context) {
  const { env, request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    'Content-Type': 'application/json',
  };

  // Auth check
  const secret = request.headers.get('X-Admin-Secret');
  if (!secret || secret !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders,
    });
  }

  try {
    const { payment_id, action = 'confirm' } = await request.json();

    if (!payment_id) {
      return new Response(JSON.stringify({ error: 'payment_id required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    if (!env.PAYMENTS_KV) {
      return new Response(JSON.stringify({ error: 'KV not configured' }), {
        status: 500, headers: corsHeaders,
      });
    }

    const raw = await env.PAYMENTS_KV.get(payment_id);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404, headers: corsHeaders,
      });
    }

    const payment = JSON.parse(raw);

    if (action === 'confirm') {
      payment.status = 'confirmed';
      payment.confirmed_at = new Date().toISOString();
    } else if (action === 'reject') {
      payment.status = 'failed';
      payment.failed_at = new Date().toISOString();
    }

    await env.PAYMENTS_KV.put(payment_id, JSON.stringify(payment), {
      expirationTtl: 60 * 60 * 24 * 30,
    });

    return new Response(JSON.stringify({
      id: payment.id,
      status: payment.status,
      utr: payment.utr,
      amount: payment.amount,
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
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
    },
  });
}
