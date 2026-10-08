// TrustGuard AI Content Script
(function() {
  if (window.__TRUSTGUARD_INJECTED__) return;
  window.__TRUSTGUARD_INJECTED__ = true;

  console.log('[TrustGuard] Extension content script active.');

  // Detect active provider adapter
  let activeAdapter = null;
  const adapters = window.TrustGuardAdapters || {};
  for (const key of ['chatgpt', 'gemini', 'claude', 'perplexity']) {
    if (adapters[key] && adapters[key].isMatch()) {
      activeAdapter = adapters[key];
      break;
    }
  }
  if (!activeAdapter && adapters.generic) {
    activeAdapter = adapters.generic;
  }

  const processedNodes = new WeakSet();

  // Scan and attach TrustGuard badges to AI responses
  function scanAndAttachBadges() {
    if (!activeAdapter) return;
    const responseNodes = activeAdapter.getResponseNodes();

    for (const node of responseNodes) {
      if (processedNodes.has(node) || node.querySelector('.trustguard-floating-badge')) {
        continue;
      }
      if (activeAdapter.isStreaming && activeAdapter.isStreaming(node)) {
        continue; // Wait until streaming finishes
      }

      processedNodes.add(node);
      injectBadge(node);
    }
  }

  function injectBadge(node) {
    const anchor = activeAdapter.getBadgeAnchor(node) || node;
    const badge = document.createElement('div');
    badge.className = 'trustguard-floating-badge trustguard-badge-pending';
    badge.innerHTML = `🛡️ TrustGuard <span class="tg-score-label">Verify</span>`;
    badge.title = 'Click to independently verify this answer with TrustGuard AI';

    badge.addEventListener('click', async (e) => {
      e.stopPropagation();
      badge.innerHTML = `🛡️ TrustGuard <span class="tg-score-label">Evaluating...</span>`;
      
      const responseText = activeAdapter.extractText(node);
      const promptText = activeAdapter.extractPrompt(node) || 'User Prompt';

      // Redact sensitive credentials locally before request
      const redactor = window.TrustGuardTokenSaver;
      const sanitizedPrompt = redactor ? redactor.redactSecrets(promptText).sanitized : promptText;
      const sanitizedResponse = redactor ? redactor.redactSecrets(responseText).sanitized : responseText;

      chrome.runtime.sendMessage({
        action: 'API_ANALYZE',
        payload: {
          prompt: sanitizedPrompt,
          response: sanitizedResponse,
          provider: activeAdapter.name.toLowerCase(),
          mode: 'quick',
          // Pass page URL and title so the backend can detect misinformation
          // intent encoded in the URL (e.g. google.com/search?q=tell+any+lie)
          url: window.location.href,
          metadata: { page_title: document.title, hostname: window.location.hostname }
        }
      }, (res) => {
        if (res && res.success && res.data) {
          updateBadgeUI(badge, res.data);
          openTrustModal(res.data);
        } else {
          badge.innerHTML = `🛡️ TrustGuard <span>Retry</span>`;
          console.error('[TrustGuard] Verification failed:', res ? res.error : 'Network error');
        }
      });
    });

    anchor.appendChild(badge);
  }

  function updateBadgeUI(badge, data) {
    const score = Math.round(data.trust_score);
    badge.className = 'trustguard-floating-badge';
    
    if (data.trust_label === 'CRITICAL RISK') {
      badge.classList.add('trustguard-badge-critical');
      badge.innerHTML = `🚨 Risk Alert (${score}%)`;
    } else if (data.trust_label === 'MISINFORMATION INTENT') {
      badge.classList.add('trustguard-badge-critical');
      badge.innerHTML = `⚠️ Misinfo Intent`;
    } else if (score >= 80) {
      badge.classList.add('trustguard-badge-high');
      badge.innerHTML = `🛡️ ${score}% Trusted`;
    } else if (score >= 60) {
      badge.classList.add('trustguard-badge-medium');
      badge.innerHTML = `⚠️ ${score}% Medium`;
    } else {
      badge.classList.add('trustguard-badge-low');
      badge.innerHTML = `❌ ${score}% Low Trust`;
    }
  }

  // Floating modal for detailed trust analysis
  function openTrustModal(data) {
    const existing = document.getElementById('trustguard-modal-root');
    if (existing) existing.remove();

    const root = document.createElement('div');
    root.id = 'trustguard-modal-root';
    root.className = 'trustguard-modal-backdrop';

    const score = Math.round(data.trust_score);
    const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
    const isMisinfo = data.trust_label === 'MISINFORMATION INTENT';

    const claimsHtml = (data.claims || []).slice(0, 5).map(c => `
      <div style="background: #1e293b; border-radius: 8px; padding: 10px; margin-bottom: 8px; font-size: 13px; border-left: 3px solid ${c.status === 'SUPPORTED' ? '#10b981' : c.status === 'CONTRADICTED' ? '#ef4444' : '#64748b'};">
        <div style="font-weight: 600; color: #f8fafc; margin-bottom: 4px;">${escapeHtml(c.claim)}</div>
        <div style="display: flex; gap: 8px; font-size: 11px; color: #94a3b8;">
          <span>Status: <strong>${c.status}</strong></span>
          <span>•</span>
          <span>Source: ${escapeHtml(c.source || 'Knowledge base')}</span>
        </div>
        ${c.snippet ? `<div style="margin-top: 4px; font-size: 11px; color: #cbd5e1; font-style: italic;">"${escapeHtml(c.snippet)}"</div>` : ''}
      </div>
    `).join('');

    root.innerHTML = `
      <div class="trustguard-modal-card">
        <div class="trustguard-header-row">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🛡️</span>
            <div>
              <div style="font-weight: 700; font-size: 15px;">TrustGuard Analysis</div>
              <div style="font-size: 11px; color: #94a3b8;">Independent Verification Layer (${escapeHtml(data.provider || 'AI')})</div>
            </div>
          </div>
          <button id="tg-modal-close" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer;">&times;</button>
        </div>

        <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px; padding: 12px; background: rgba(30, 41, 59, 0.6); border-radius: 12px;">
          <div class="trustguard-score-circle" style="border-color: ${isMisinfo ? '#f97316' : scoreColor}; color: ${isMisinfo ? '#f97316' : scoreColor};">
            ${isMisinfo ? '⚠️' : score + '%'}
          </div>
          <div style="flex: 1;">
            <div style="font-size: 16px; font-weight: 700; color: ${isMisinfo ? '#f97316' : scoreColor};">${escapeHtml(data.trust_label)}</div>
            <div style="font-size: 12px; color: #cbd5e1; margin-top: 4px;">${escapeHtml(data.summary)}</div>
            <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 11px; color: #94a3b8;">
              <span>Factual: <strong>${Math.round(data.factual_consistency * 100)}%</strong></span>
              <span>Evidence: <strong>${Math.round(data.evidence_consistency * 100)}%</strong></span>
              <span>Tokens Saved: <strong>${data.tokens_saved || 0}</strong></span>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 16px;">
          <div style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">Claim Verification Details</div>
          <div style="max-height: 240px; overflow-y: auto;">
            ${claimsHtml || '<div style="font-size: 12px; color: #64748b;">No individual claims extracted.</div>'}
          </div>
        </div>

        ${data.suggested_correction ? `
          <div style="margin-bottom: 16px; padding: 10px; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 8px; font-size: 12px; color: #fca5a5;">
            <strong>⚠️ Correction:</strong> ${escapeHtml(data.suggested_correction)}
          </div>
        ` : ''}

        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          ${data.verified_answer ? `<button id="tg-copy-verified" style="background: #0284c7; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Copy Verified Answer</button>` : ''}
          <button id="tg-modal-dismiss" style="background: #334155; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer;">Done</button>
        </div>
      </div>
    `;

    document.body.appendChild(root);

    document.getElementById('tg-modal-close').onclick = () => root.remove();
    document.getElementById('tg-modal-dismiss').onclick = () => root.remove();
    root.onclick = (e) => { if (e.target === root) root.remove(); };

    const copyBtn = document.getElementById('tg-copy-verified');
    if (copyBtn) {
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(data.verified_answer || data.response_text);
        copyBtn.innerText = '✓ Copied!';
        setTimeout(() => copyBtn.innerText = 'Copy Verified Answer', 2000);
      };
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Text selection floating button
  let selectionPill = null;
  document.addEventListener('mouseup', () => {
    const sel = window.getSelection().toString().trim();
    if (sel.length > 15 && sel.length < 2500) {
      if (!selectionPill) {
        selectionPill = document.createElement('div');
        selectionPill.className = 'trustguard-selection-pill';
        selectionPill.innerHTML = '🛡️ Verify with TrustGuard';
        document.body.appendChild(selectionPill);
      }
      const range = window.getSelection().getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selectionPill.style.top = `${window.scrollY + rect.bottom + 6}px`;
      selectionPill.style.left = `${window.scrollX + rect.left}px`;
      selectionPill.style.display = 'flex';

      selectionPill.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        triggerVerificationForText(sel);
        selectionPill.style.display = 'none';
      };
    } else {
      if (selectionPill) selectionPill.style.display = 'none';
    }
  });

  function triggerVerificationForText(text) {
    chrome.runtime.sendMessage({
      action: 'API_ANALYZE',
      payload: {
        prompt: 'User Selected Snippet',
        response: text,
        provider: 'selection',
        mode: 'quick',
        url: window.location.href,
        metadata: { page_title: document.title, hostname: window.location.hostname }
      }
    }, (res) => {
      if (res && res.success && res.data) {
        openTrustModal(res.data);
      }
    });
  }

  function triggerCompressionForText(text) {
    chrome.runtime.sendMessage({
      action: 'API_COMPRESS',
      payload: {
        text: text,
        mode: 'balanced',
        preserve_code: true,
        redact_sensitive: true
      }
    }, (res) => {
      if (res && res.success && res.data) {
        navigator.clipboard.writeText(res.data.compressed_text).catch(() => {});
        showToast(`⚡ Compressed: ${res.data.saved_tokens} tokens saved (${Math.round((res.data.compression_ratio || 0.5) * 100)}%) — copied!`);
      }
    });
  }

  function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.right = '24px';
    toast.style.background = '#0f172a';
    toast.style.color = '#38bdf8';
    toast.style.border = '1px solid #0284c7';
    toast.style.borderRadius = '8px';
    toast.style.padding = '10px 16px';
    toast.style.boxShadow = '0 6px 16px rgba(0,0,0,0.6)';
    toast.style.zIndex = '9999999';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '600';
    toast.innerText = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3500);
  }

  // Listen to background trigger
  chrome.runtime.onMessage.addListener((req, sender, sendResp) => {
    if (req.action === 'TRIGGER_MANUAL_VERIFY' && req.text) {
      triggerVerificationForText(req.text);
      sendResp({ status: 'started' });
    } else if (req.action === 'TRIGGER_MANUAL_COMPRESS' && req.text) {
      triggerCompressionForText(req.text);
      sendResp({ status: 'started' });
    }
  });

  // Observe DOM changes to catch AI responses
  const observer = new MutationObserver(() => {
    scanAndAttachBadges();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan
  scanAndAttachBadges();
})();
