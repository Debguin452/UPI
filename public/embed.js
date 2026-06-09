/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║              UPI Payment Kit — Embed Script                 ║
 * ║                                                              ║
 * ║  Drop-in UPI payments for any website. No Stripe. No PAN.   ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * ─── SETUP (one time) ───────────────────────────────────────────
 *
 *  This script is hosted on YOUR deployed Cloudflare Pages site.
 *  Replace YOUR-PROJECT-NAME below with your actual pages.dev subdomain.
 *  Example: if your site is "rahul-pay.pages.dev", use that.
 *
 * ─── HOW TO USE IN ANY WEBSITE ──────────────────────────────────
 *
 *  OPTION 1 — Inline widget (renders inside a div on your page)
 *  ─────────────────────────────────────────────────────────────
 *
 *  <!-- Step 1: Load this script. Replace YOUR-PROJECT-NAME with your subdomain. -->
 *  <script src="https://YOUR-PROJECT-NAME.pages.dev/embed.js"></script>
 *
 *  <!-- Step 2: Add a container div where you want the widget to appear.
 *       data-amount = price in rupees (numbers only, no ₹ symbol)
 *       data-note   = short description of what the user is paying for -->
 *  <div id="upi-pay" data-amount="99" data-note="Pro plan"></div>
 *
 *  <!-- Step 3: Mount the widget into that div -->
 *  <script>
 *    UPIPay.mount('#upi-pay');
 *  </script>
 *
 *
 *  OPTION 2 — Popup modal (opens as an overlay when user clicks a button)
 *  ──────────────────────────────────────────────────────────────────────
 *
 *  <script src="https://YOUR-PROJECT-NAME.pages.dev/embed.js"></script>
 *
 *  <button onclick="pay()">Buy — ₹99</button>
 *
 *  <script>
 *    function pay() {
 *      UPIPay.open({
 *        amount: 99,           // price in rupees
 *        note: 'Pro plan',     // shown on checkout page
 *        onConfirmed: function() {
 *          // This runs automatically when admin confirms the payment
 *          // Put your unlock/redirect logic here
 *          window.location.href = '/dashboard';
 *        }
 *      });
 *    }
 *  </script>
 *
 *
 *  OPTION 3 — Direct link (no JavaScript at all)
 *  ──────────────────────────────────────────────
 *
 *  Just link directly to the checkout URL:
 *
 *  <a href="https://YOUR-PROJECT-NAME.pages.dev/?amount=99&note=Pro+Plan&redirect=https://yoursite.com/success">
 *    Pay ₹99
 *  </a>
 *
 *  Query parameters:
 *    amount   = price in rupees
 *    note     = what the payment is for
 *    redirect = where to send the user after payment is confirmed (optional)
 *
 *
 * ─── HOW THE BASE URL IS DETECTED ───────────────────────────────
 *
 *  You do NOT need to hardcode a URL anywhere in this file.
 *  The script automatically reads its own <script src="..."> tag
 *  to figure out where it's hosted. So as long as the <script> tag
 *  points to the right URL, everything else works automatically.
 *
 * ─── API (for advanced use) ──────────────────────────────────────
 *
 *  UPIPay.mount(selector)
 *    Renders the payment widget inside the element matching `selector`.
 *    Reads amount and note from data-amount and data-note attributes.
 *
 *  UPIPay.open({ amount, note, redirect, onConfirmed })
 *    Opens the checkout as a full-screen popup modal.
 *    onConfirmed callback fires when payment status becomes "confirmed".
 *
 */

(function(global) {
  const BASE_URL = (function() {
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      if (s.src.includes('embed.js')) {
        return s.src.replace('/embed.js', '');
      }
    }
    return '';
  })();

  function mount(selector) {
    const el = document.querySelector(selector);
    if (!el) return;
    const amount = el.dataset.amount || '99';
    const note = el.dataset.note || 'Payment';
    const onConfirmed = el.dataset.onConfirmed || null;

    el.innerHTML = `
      <iframe
        src="${BASE_URL}/?amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}&embed=1"
        style="width:100%;min-height:520px;border:none;border-radius:12px;box-shadow:0 4px 24px rgba(0,0,0,0.08);"
        allow="clipboard-write"
        title="UPI Payment">
      </iframe>
    `;
  }

  function open(opts = {}) {
    const { amount = 99, note = 'Payment', redirect = null, onConfirmed = null } = opts;
    const url = `${BASE_URL}/?amount=${encodeURIComponent(amount)}&note=${encodeURIComponent(note)}${redirect ? '&redirect=' + encodeURIComponent(redirect) : ''}`;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;';

    const modal = document.createElement('div');
    modal.style.cssText = 'width:100%;max-width:900px;border-radius:12px;overflow:hidden;position:relative;';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;background:rgba(0,0,0,0.3);color:white;border:none;width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:13px;';
    closeBtn.onclick = () => document.body.removeChild(overlay);

    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%;min-height:520px;border:none;display:block;';
    iframe.allow = 'clipboard-write';
    iframe.title = 'UPI Payment';

    modal.appendChild(closeBtn);
    modal.appendChild(iframe);
    overlay.appendChild(modal);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) document.body.removeChild(overlay); });
    document.body.appendChild(overlay);
  }

  global.UPIPay = { mount, open };
})(window);
