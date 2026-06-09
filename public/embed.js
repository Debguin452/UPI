/**
 * UPI Payment Kit — Embed Script
 * Usage:
 *   <script src="https://upikit.pages.dev/embed.js"></script>
 *   <div id="upi-pay" data-amount="99" data-note="Pro plan"></div>
 *   <script>UPIPay.mount('#upi-pay');</script>
 *
 * Or: UPIPay.open({ amount: 99, note: 'Pro', onConfirmed: () => {} })
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
