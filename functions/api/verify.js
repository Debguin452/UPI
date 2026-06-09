// functions/api/verify.js
// POST /api/verify — user submits UTR after paying

export async function onRequestPost(context) {
  const { env } = context;

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  try {
    const { payment_id, utr } = await context.request.json();

    if (!payment_id || !utr) {
      return new Response(JSON.stringify({ error: 'payment_id and utr are required' }), {
        status: 400, headers: corsHeaders,
      });
    }

    // UTR is 12 digits for IMPS/UPI
    const cleanUTR = String(utr).trim().replace(/\s/g, '');
    if (!/^\d{12}$/.test(cleanUTR)) {
      return new Response(JSON.stringify({ error: 'UTR must be a 12-digit number' }), {
        status: 400, headers: corsHeaders,
      });
    }

    if (env.PAYMENTS_KV) {
      const raw = await env.PAYMENTS_KV.get(payment_id);
      if (!raw) {
        return new Response(JSON.stringify({ error: 'Payment not found' }), {
          status: 404, headers: corsHeaders,
        });
      }

      const payment = JSON.parse(raw);

      if (payment.status === 'confirmed') {
        return new Response(JSON.stringify({ status: 'confirmed', message: 'Already confirmed' }), {
          status: 200, headers: corsHeaders,
        });
      }

      payment.utr = cleanUTR;
      payment.status = 'submitted';
      payment.submitted_at = new Date().toISOString();

      await env.PAYMENTS_KV.put(payment_id, JSON.stringify(payment), {
        expirationTtl: 60 * 60 * 24 * 7,
      });
    }

    return new Response(JSON.stringify({
      status: 'submitted',
      message: 'UTR received. Payment will be confirmed shortly.',
      utr: cleanUTR,
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
