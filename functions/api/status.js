// functions/api/status.js
// GET /api/status?id=pay_xxx — poll payment status

export async function onRequestGet(context) {
  const { env } = context;
  const url = new URL(context.request.url);
  const id = url.searchParams.get('id');

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (!id) {
    return new Response(JSON.stringify({ error: 'id is required' }), {
      status: 400, headers: corsHeaders,
    });
  }

  if (env.PAYMENTS_KV) {
    const raw = await env.PAYMENTS_KV.get(id);
    if (!raw) {
      return new Response(JSON.stringify({ error: 'Payment not found' }), {
        status: 404, headers: corsHeaders,
      });
    }
    const payment = JSON.parse(raw);
    return new Response(JSON.stringify({
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      note: payment.note,
      created_at: payment.created_at,
      confirmed_at: payment.confirmed_at || null,
    }), { status: 200, headers: corsHeaders });
  }

  // No KV — return unknown (client-side only mode)
  return new Response(JSON.stringify({ id, status: 'unknown', message: 'KV not configured' }), {
    status: 200, headers: corsHeaders,
  });
}
