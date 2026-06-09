# UPI Payment Kit

A self-hosted, zero-fee UPI payment system for Cloudflare Pages.  
No Stripe. No Razorpay. No PAN card. Just your UPI ID.

---

## How payment confirmation works

UPI has no free webhook API. This kit uses **UTR verification**:

1. User pays via QR or UPI deep link
2. User submits their **UTR number** (12-digit ID shown in every UPI app after payment)
3. Your app stores it as `pending`
4. You verify in your bank app and mark as `confirmed` via the admin panel

This is how most indie Indian payment systems work.

---

## Setup (5 minutes)

### 1. Clone and deploy to Cloudflare Pages

```bash
git clone https://github.com/yourname/upi-payment-kit
cd upi-payment-kit
```

Push to GitHub, then connect to Cloudflare Pages.  
Set build output directory to `public`.

### 2. Add environment secrets

In Cloudflare Pages → Settings → Environment Variables, add:

| Variable | Example | Description |
|---|---|---|
| `UPI_ID` | `9876543210@ybl` | Your UPI ID |
| `PAYEE_NAME` | `Rahul Dev` | Your name shown in UPI app |
| `ADMIN_SECRET` | `any-long-random-string` | Password to access admin panel |
| `CURRENCY` | `INR` | Currency (default INR) |

> These are never exposed to the frontend.

### 3. Done

Your payment page: `https://yoursite.pages.dev`  
Your admin panel: `https://yoursite.pages.dev/admin`

---

## Embedding in another app

Add this to any HTML page:

```html
<script src="https://yoursite.pages.dev/embed.js"></script>
<div id="upi-pay" data-amount="99" data-note="Pro plan"></div>
<script>
  UPIPay.mount('#upi-pay');
</script>
```

Or open a hosted checkout page:

```
https://yoursite.pages.dev/checkout?amount=99&note=Pro+plan&redirect=https://yourapp.com/success
```

---

## API

### Create a payment intent

```
POST /api/payment
Content-Type: application/json

{ "amount": 99, "note": "Pro plan", "buyer_name": "Alice" }
```

Returns:
```json
{
  "id": "pay_abc123",
  "upi_url": "upi://pay?pa=...&am=99",
  "amount": 99,
  "status": "pending"
}
```

### Submit UTR after payment

```
POST /api/verify
Content-Type: application/json

{ "payment_id": "pay_abc123", "utr": "123456789012" }
```

Returns:
```json
{ "status": "submitted", "message": "Payment under review" }
```

### Check payment status

```
GET /api/status?id=pay_abc123
```

Returns:
```json
{ "id": "pay_abc123", "status": "pending|submitted|confirmed|failed" }
```

### Admin: confirm payment (requires secret)

```
POST /api/admin/confirm
X-Admin-Secret: your-admin-secret
Content-Type: application/json

{ "payment_id": "pay_abc123" }
```

---

## Payment flow diagram

```
User → /checkout → pays via UPI → enters UTR → status: submitted
Admin → /admin → sees UTR → checks bank app → clicks Confirm → status: confirmed
App → polls GET /api/status → gets confirmed → unlocks feature
```

---

## License

MIT — free to use, modify, and deploy.
