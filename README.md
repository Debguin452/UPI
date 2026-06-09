# UPI Payment Kit

> A self-hosted, zero-fee UPI payment system built for Cloudflare Pages.
> No Stripe. No Razorpay. No PAN card. No bank account verification. Just your UPI ID.

Built for Indian student developers and indie makers who want to accept payments without going through the painful KYC process of payment gateways.

---

## Table of contents

- [How it works](#how-it-works)
- [Why UTR instead of webhooks](#why-utr-instead-of-webhooks)
- [Project structure](#project-structure)
- [Deploy to Cloudflare Pages](#deploy-to-cloudflare-pages)
- [Environment variables (secrets)](#environment-variables-secrets)
- [Set up KV storage](#set-up-kv-storage)
- [Your URLs after deploy](#your-urls-after-deploy)
- [Embed in any website](#embed-in-any-website)
- [API reference](#api-reference)
- [Integration examples](#integration-examples)
- [Payment status lifecycle](#payment-status-lifecycle)
- [Admin panel guide](#admin-panel-guide)
- [Glossary](#glossary)

---

## How it works

```
┌─────────┐         ┌──────────────────┐         ┌───────────────┐
│  User   │         │  UPI Payment Kit │         │  You (Admin)  │
└────┬────┘         └────────┬─────────┘         └──────┬────────┘
     │                       │                          │
     │  Opens checkout page  │                          │
     │──────────────────────>│                          │
     │                       │                          │
     │  Scans QR / taps      │                          │
     │  "Open in UPI app"    │                          │
     │──────────────────────>│                          │
     │                       │                          │
     │  Pays in GPay/        │                          │
     │  PhonePe/Paytm        │                          │
     │──────────────────────>│                          │
     │                       │                          │
     │  Enters UTR number    │                          │
     │  from UPI app receipt │                          │
     │──────────────────────>│  Stores UTR as           │
     │                       │  "submitted"             │
     │                       │──────────────────────────│
     │                       │                          │
     │                       │          You open admin  │
     │                       │          panel, see UTR, │
     │                       │          check your bank │
     │                       │          app, click      │
     │                       │          "Confirm"       │
     │                       │<─────────────────────────│
     │                       │                          │
     │  Your app polls       │  Status becomes          │
     │  /api/status every    │  "confirmed"             │
     │  5 seconds            │                          │
     │<──────────────────────│                          │
     │                       │                          │
     │  Unlocks feature /    │                          │
     │  shows success page   │                          │
```

---

## Why UTR instead of webhooks

**The problem:** UPI does not provide a free, official API to automatically detect when someone paid you. Services like Razorpay and Stripe charge fees and require KYC (PAN card, business registration) to offer this.

**The solution:** Every UPI payment generates a **UTR number** (a 12-digit transaction reference ID). It appears in the sender's UPI app immediately after payment. This kit asks the user to copy and paste it, which allows you to manually cross-check it in your bank app and confirm the payment.

**Is this secure?** Yes, because:
- A UTR number is unique to every transaction — it cannot be guessed or faked easily
- You verify it manually in your bank's official app before confirming
- A user who submits a fake UTR will never get confirmed

**Who else does this?** Most small Indian SaaS apps, course sellers, and indie developers use this exact method. It requires a small amount of manual work from you but costs absolutely nothing.

---

## Project structure

```
upi-payment-kit/
│
├── public/                      ← All frontend files (served to users)
│   ├── index.html               ← The checkout page users see
│   ├── admin.html               ← Your private admin panel
│   └── embed.js                 ← Script others include to embed your payment widget
│
├── functions/                   ← Backend logic (runs as Cloudflare Workers)
│   └── api/
│       ├── payment.js           ← Creates a new payment record
│       ├── verify.js            ← Saves the UTR a user submits
│       ├── status.js            ← Returns current status of a payment
│       └── admin/
│           ├── confirm.js       ← You confirm or reject a payment
│           └── payments.js      ← Returns list of all payments (admin only)
│
├── wrangler.toml                ← Cloudflare configuration file
└── README.md                    ← This file
```

> **What is `functions/`?**
> Cloudflare Pages automatically turns any `.js` file inside a `functions/` folder into a serverless API endpoint. No Express, no Node.js server needed. A file at `functions/api/payment.js` becomes available at `https://yoursite.pages.dev/api/payment` automatically.

---

## Deploy to Cloudflare Pages

### Step 1 — Upload to GitHub

If you downloaded this as a zip, extract it and push it to a new GitHub repository:

```bash
# Extract the zip, then open that folder in terminal
cd upi-payment-kit

git init
git add .
git commit -m "initial commit"

# Create a new repo on github.com first, then:
git remote add origin https://github.com/YOUR_USERNAME/upi-payment-kit.git
git push -u origin main
```

### Step 2 — Connect to Cloudflare Pages

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Click **Workers & Pages** in the left sidebar
3. Click **Create application** → **Pages** → **Connect to Git**
4. Select your GitHub repository
5. In **Build settings**, set:
   - **Framework preset:** None
   - **Build command:** *(leave empty)*
   - **Build output directory:** `public`
6. Click **Save and Deploy**

> ⚠️ The **Build output directory** must be set to `public`. This tells Cloudflare to serve files from the `public/` folder, not the project root. If you skip this, your site will show a "page not found" error.

---

## Environment variables (secrets)

Environment variables are settings stored privately on Cloudflare's servers. Your UPI ID and admin password live here — they are **never sent to the browser** or visible in your code.

### How to add them

1. Go to your Cloudflare Pages project
2. Click **Settings** → **Environment variables**
3. Click **Add variable** for each one below
4. Set **Environment** to **Production** (and optionally Preview too)

| Variable name | Example value | What it does |
|---|---|---|
| `UPI_ID` | `9876543210@ybl` | Your UPI ID. This is used to generate the QR code and payment link on the server — never exposed in page source. |
| `PAYEE_NAME` | `Rahul Kumar` | Your name as it appears in the UPI app when someone pays you. |
| `ADMIN_SECRET` | `mySecretPass@123` | The password you use to log into the admin panel. Make it long and hard to guess. |
| `CURRENCY` | `INR` | Currency code. Leave as `INR` unless you know what you're doing. |

> **Why are secrets safe here?**
> When your `functions/api/payment.js` runs on Cloudflare's servers, it reads `env.UPI_ID` server-side and only sends back the QR code image — not the raw UPI ID. However, the UPI ID does appear in the QR code and the copy-UPI-ID button for payment purposes, which is normal and expected — just like how your UPI ID is visible when you share a payment QR code with anyone.

---

## Set up KV storage

**KV (Key-Value store)** is Cloudflare's simple database. This kit uses it to store payment records — each payment gets saved with its ID, amount, UTR, and status.

### Step 1 — Create a KV namespace

1. In Cloudflare dashboard, go to **Workers & Pages** → **KV**
2. Click **Create a namespace**
3. Name it `PAYMENTS` (or anything you like)
4. Click **Add**

### Step 2 — Bind it to your Pages project

1. Go back to your Pages project → **Settings** → **Functions**
2. Scroll to **KV namespace bindings**
3. Click **Add binding**
4. Set **Variable name** to `PAYMENTS_KV` ← this must match exactly
5. Select the KV namespace you just created
6. Save

### Step 3 — Redeploy

Go to **Deployments** → click **Retry deployment** (or push a new commit) so the new binding takes effect.

> **What if I skip KV?** The app still works but payments won't be saved between requests. The checkout page will function but the admin panel will be empty and status polling won't work. KV is free on Cloudflare's free plan (up to 100,000 reads/day).

---

## Your URLs after deploy

Once deployed, your project is live at `https://YOUR-PROJECT-NAME.pages.dev`.

| URL | What it is |
|---|---|
| `https://YOUR-PROJECT-NAME.pages.dev/` | Checkout page (with `?amount=` and `?note=` parameters) |
| `https://YOUR-PROJECT-NAME.pages.dev/admin.html` | Your admin panel |
| `https://YOUR-PROJECT-NAME.pages.dev/embed.js` | Embed script for other websites |

**Example checkout URL:**
```
https://rahul-pay.pages.dev/?amount=199&note=Pro+Plan
```

**Example with redirect after confirmation:**
```
https://rahul-pay.pages.dev/?amount=199&note=Pro+Plan&redirect=https://yourapp.com/success
```

The `redirect` parameter tells the checkout page where to send the user after their payment is confirmed.

---

## Embed in any website

Once your kit is deployed, any developer can embed your payment widget in their own website with 3 lines of HTML. Replace `YOUR-PROJECT-NAME` with your actual Cloudflare Pages subdomain.

### Option A — Inline widget (mounts inside a div)

```html
<!-- 1. Load the embed script from YOUR deployed kit URL -->
<script src="https://YOUR-PROJECT-NAME.pages.dev/embed.js"></script>

<!-- 2. Add a div wherever you want the payment widget to appear -->
<!--    data-amount = amount in rupees -->
<!--    data-note   = what the payment is for (shown on checkout) -->
<div id="upi-pay" data-amount="99" data-note="Pro plan"></div>

<!-- 3. Mount the widget into that div -->
<script>
  UPIPay.mount('#upi-pay');
</script>
```

### Option B — Popup modal (opens on button click)

```html
<script src="https://YOUR-PROJECT-NAME.pages.dev/embed.js"></script>

<button onclick="openPayment()">Buy now — ₹99</button>

<script>
function openPayment() {
  UPIPay.open({
    amount: 99,
    note: 'Pro plan',
    onConfirmed: function() {
      // This runs when payment is confirmed
      alert('Payment confirmed! Unlocking your feature...');
      window.location.href = '/dashboard';
    }
  });
}
</script>
```

### Option C — Direct checkout URL (simplest, no JS needed)

Just link directly to your checkout page with query parameters:

```html
<a href="https://YOUR-PROJECT-NAME.pages.dev/?amount=99&note=Pro+Plan&redirect=https://yoursite.com/success">
  Pay ₹99
</a>
```

---

## API reference

All endpoints return JSON. All `POST` requests require `Content-Type: application/json`.

---

### `POST /api/payment` — Create a payment

Call this first to register a new payment and get a QR code URL.

**Request body:**

```json
{
  "amount": 99,
  "note": "Pro plan",
  "buyer_name": "Alice"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `amount` | number | ✅ Yes | Amount in rupees (e.g. `99` means ₹99) |
| `note` | string | No | Short description shown on checkout (e.g. `"Pro plan"`) |
| `buyer_name` | string | No | Name of the person paying |

**Successful response `200`:**

```json
{
  "id": "pay_abc123",
  "amount": 99,
  "note": "Pro plan",
  "upi_url": "upi://pay?pa=9876543210@ybl&pn=Rahul&am=99&cu=INR&tn=Pro+plan",
  "upi_id": "9876543210@ybl",
  "payee_name": "Rahul Kumar",
  "status": "pending"
}
```

| Field | Description |
|---|---|
| `id` | Unique payment ID — save this, you'll need it for all other API calls |
| `upi_url` | Deep link that opens a UPI app directly (used for the "Open in app" button) |
| `upi_id` | Your UPI ID (used to display the copy-UPI-ID field) |
| `status` | Always `pending` when first created |

**Error response `400`:**
```json
{ "error": "Invalid amount" }
```

---

### `POST /api/verify` — Submit UTR after payment

Call this when the user enters their UTR number after paying.

**Request body:**

```json
{
  "payment_id": "pay_abc123",
  "utr": "123456789012"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `payment_id` | string | ✅ Yes | The `id` returned from `/api/payment` |
| `utr` | string | ✅ Yes | The 12-digit UTR number from the user's UPI app |

**What is a UTR?** UTR stands for Unique Transaction Reference. Every UPI payment generates one — it appears in the sender's UPI app under transaction details. It looks like `123456789012` (exactly 12 digits).

**Successful response `200`:**

```json
{
  "status": "submitted",
  "message": "UTR received. Payment will be confirmed shortly.",
  "utr": "123456789012"
}
```

**Error responses:**

```json
{ "error": "UTR must be a 12-digit number" }   // invalid format
{ "error": "Payment not found" }                // wrong payment_id
```

---

### `GET /api/status` — Check payment status

Poll this endpoint to find out if a payment has been confirmed.

**Request:**
```
GET /api/status?id=pay_abc123
```

**Successful response `200`:**

```json
{
  "id": "pay_abc123",
  "status": "confirmed",
  "amount": 99,
  "note": "Pro plan",
  "created_at": "2024-06-01T10:30:00.000Z",
  "confirmed_at": "2024-06-01T10:35:00.000Z"
}
```

**Possible status values:**

| Status | Meaning |
|---|---|
| `pending` | Payment created, user hasn't paid or entered UTR yet |
| `submitted` | User entered UTR — waiting for your manual confirmation |
| `confirmed` | You confirmed it in admin panel — payment is complete |
| `failed` | You rejected it in admin panel |

---

### `POST /api/admin/confirm` — Confirm or reject a payment

This is a protected endpoint — only you can call it using your `ADMIN_SECRET`.

**Request:**
```
POST /api/admin/confirm
X-Admin-Secret: your-admin-secret-here
Content-Type: application/json
```

**Request body:**

```json
{
  "payment_id": "pay_abc123",
  "action": "confirm"
}
```

| Field | Values | Description |
|---|---|---|
| `payment_id` | string | The payment to act on |
| `action` | `"confirm"` or `"reject"` | Confirm marks it paid. Reject marks it failed. |

**Successful response `200`:**
```json
{
  "id": "pay_abc123",
  "status": "confirmed",
  "utr": "123456789012",
  "amount": 99
}
```

**Error responses:**
```json
{ "error": "Unauthorized" }       // wrong or missing X-Admin-Secret header
{ "error": "Payment not found" }  // wrong payment_id
```

---

### `GET /api/admin/payments` — List all payments

Returns all payment records. Protected — requires your admin secret.

**Request:**
```
GET /api/admin/payments
X-Admin-Secret: your-admin-secret-here
```

**Response:**
```json
{
  "payments": [
    {
      "id": "pay_abc123",
      "amount": 99,
      "note": "Pro plan",
      "buyer_name": "Alice",
      "utr": "123456789012",
      "status": "confirmed",
      "created_at": "2024-06-01T10:30:00.000Z",
      "confirmed_at": "2024-06-01T10:35:00.000Z"
    }
  ],
  "total": 1
}
```

---

## Integration examples

### Unlock a feature after payment (JavaScript)

```javascript
async function startPayment(amount, featureName) {
  // Step 1: Create a payment record
  const res = await fetch('https://YOUR-PROJECT-NAME.pages.dev/api/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, note: featureName })
  });
  const payment = await res.json();

  // Step 2: Save the payment ID (you'll need it to check status)
  localStorage.setItem('pending_payment_id', payment.id);

  // Step 3: Redirect user to checkout
  window.location.href =
    `https://YOUR-PROJECT-NAME.pages.dev/?amount=${amount}&note=${featureName}&redirect=${window.location.origin}/activate`;
}

// Step 4: On your /activate page, poll for confirmation
async function waitForConfirmation(paymentId) {
  const interval = setInterval(async () => {
    const res = await fetch(`https://YOUR-PROJECT-NAME.pages.dev/api/status?id=${paymentId}`);
    const data = await res.json();

    if (data.status === 'confirmed') {
      clearInterval(interval);
      unlockFeature(); // your own function
    }

    if (data.status === 'failed') {
      clearInterval(interval);
      showError('Payment was not confirmed. Please contact support.');
    }
  }, 5000); // check every 5 seconds
}
```

### Verify payment in a Node.js backend

```javascript
// Run this on your own server to confirm a payment programmatically
async function confirmPayment(paymentId) {
  const response = await fetch('https://YOUR-PROJECT-NAME.pages.dev/api/admin/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': process.env.ADMIN_SECRET // store this in your own env
    },
    body: JSON.stringify({ payment_id: paymentId, action: 'confirm' })
  });

  const result = await response.json();
  return result.status === 'confirmed';
}
```

### Check payment status in Python

```python
import requests

def check_payment(payment_id):
    res = requests.get(
        f'https://YOUR-PROJECT-NAME.pages.dev/api/status',
        params={'id': payment_id}
    )
    data = res.json()
    return data['status']  # 'pending', 'submitted', 'confirmed', or 'failed'
```

---

## Payment status lifecycle

```
Created          UTR submitted       Admin action
   │                   │                  │
   ▼                   ▼                  ▼
pending  ──────>  submitted  ──────>  confirmed
                            └──────>  failed
```

- `pending` → payment page opened, no action yet
- `submitted` → user paid and entered UTR, waiting for your review
- `confirmed` → you verified and confirmed in admin panel
- `failed` → you rejected it (wrong UTR, payment not received)

---

## Admin panel guide

Access your admin panel at `https://YOUR-PROJECT-NAME.pages.dev/admin.html`

1. **Login** with your `ADMIN_SECRET`
2. You'll see a dashboard with total payments, confirmed count, and total revenue
3. Payments with status `submitted` will show **Confirm** and **Reject** buttons
4. To verify a payment:
   - Copy the UTR number shown
   - Open your bank app or GPay/PhonePe → transaction history
   - Search for that UTR — if it matches the amount, click **Confirm**
   - If it doesn't exist or amount is wrong, click **Reject**
5. The admin panel auto-refreshes every 30 seconds

---

## Glossary

| Term | Explanation |
|---|---|
| **UPI** | Unified Payments Interface — India's real-time payment system used by GPay, PhonePe, Paytm, etc. |
| **UTR** | Unique Transaction Reference — a 12-digit number generated for every UPI payment. Visible in the sender's UPI app under transaction details. |
| **UPI ID** | Your payment address (like `name@ybl` or `9876543210@ybl`). Anyone can send money to it. |
| **UPI deep link** | A URL starting with `upi://` that opens a UPI app directly and pre-fills payment details. |
| **QR code** | A scannable image encoding your UPI deep link. Any UPI app can scan it to pay. |
| **KV store** | Cloudflare's key-value database. Used to save and look up payment records. |
| **Environment variable** | A secret setting stored on the server — never visible in browser source code. |
| **Serverless function** | Code that runs on demand in the cloud with no server to manage. Cloudflare Pages Functions work this way. |
| **Webhook** | An automatic HTTP callback triggered when an event happens (e.g. payment received). UPI doesn't offer this for free — that's why this kit uses UTR instead. |
| **CORS** | Cross-Origin Resource Sharing — a browser security rule. The API in this kit includes CORS headers so it can be called from any website. |
| **Polling** | Repeatedly checking an endpoint at intervals (e.g. every 5 seconds) to detect a change in status. |
| **Admin secret** | The password you set as `ADMIN_SECRET`. It's sent as an `X-Admin-Secret` header to protect admin API routes. |

---

## License

MIT — free to use, modify, sell, or deploy. No attribution required.
