// functions/api/admin/payments.js
// GET /api/admin/payments — list all payments
// Requires X-Admin-Secret header

export async function onRequestGet(context) {
  const { env, request } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const secret = request.headers.get('X-Admin-Secret');
  if (!secret || secret !== env.ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: corsHeaders,
    });
  }

  if (!env.PAYMENTS_KV) {
    return new Response(JSON.stringify({ error: 'KV not configured', payments: [] }), {
      status: 200, headers: corsHeaders,
    });
  }

  try {
    const list = await env.PAYMENTS_KV.list({ prefix: 'pay_' });
    const payments = [];

    for (const key of list.keys) {
      const raw = await env.PAYMENTS_KV.get(key.name);
      if (raw) payments.push(JSON.parse(raw));
    }

    // Sort newest first
    payments.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return new Response(JSON.stringify({ payments, total: payments.length }), {
      status: 200, headers: corsHeaders,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error', detail: err.message }), {
      status: 500, headers: corsHeaders,
    });
  }
}
