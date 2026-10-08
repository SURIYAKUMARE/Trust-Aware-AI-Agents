// TrustGuard Side Panel Controller

document.addEventListener('DOMContentLoaded', () => {
  const gaugeCircle = document.getElementById('gauge-circle');
  const gaugeLabel = document.getElementById('gauge-label');
  const gaugeSummary = document.getElementById('gauge-summary');
  const metFactual = document.getElementById('met-factual');
  const metEvidence = document.getElementById('met-evidence');
  const metContra = document.getElementById('met-contra');
  const metTokens = document.getElementById('met-tokens');
  const claimsContainer = document.getElementById('claims-container');
  const correctionBox = document.getElementById('correction-box');
  const correctionText = document.getElementById('correction-text');
  const copyBtn = document.getElementById('copy-btn');

  let activeData = null;

  function render(data) {
    if (!data) return;
    activeData = data;
    const score = Math.round(data.trust_score);
    const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';

    gaugeCircle.innerText = `${score}%`;
    gaugeCircle.style.borderColor = color;
    gaugeCircle.style.color = color;
    gaugeLabel.innerText = data.trust_label;
    gaugeLabel.style.color = color;
    gaugeSummary.innerText = data.summary;

    metFactual.innerText = `${Math.round(data.factual_consistency * 100)}%`;
    metEvidence.innerText = `${Math.round(data.evidence_consistency * 100)}%`;
    metContra.innerText = data.contradiction_count;
    metTokens.innerText = `${data.tokens_saved || 0}`;

    if (data.claims && data.claims.length > 0) {
      claimsContainer.innerHTML = data.claims.map(c => {
        const cls = c.status === 'SUPPORTED' ? 'claim-supported' : c.status === 'CONTRADICTED' ? 'claim-contradicted' : 'claim-noevidence';
        return `
          <div class="claim-item ${cls}">
            <div style="font-weight: 600; color: #f8fafc; font-size: 12px; margin-bottom: 2px;">${escapeHtml(c.claim)}</div>
            <div style="font-size: 11px; color: #94a3b8; display: flex; gap: 6px;">
              <span><strong>${c.status}</strong></span>
              <span>•</span>
              <span>${escapeHtml(c.source || 'Knowledge base')}</span>
            </div>
            ${c.snippet ? `<div style="font-size: 11px; color: #cbd5e1; margin-top: 4px; font-style: italic;">"${escapeHtml(c.snippet)}"</div>` : ''}
          </div>
        `;
      }).join('');
    } else {
      claimsContainer.innerHTML = '<div style="color: #64748b; font-size: 12px; text-align: center;">No individual claims.</div>';
    }

    if (data.suggested_correction) {
      correctionBox.style.display = 'block';
      correctionText.innerText = data.suggested_correction;
    } else {
      correctionBox.style.display = 'none';
    }

    if (data.verified_answer) {
      copyBtn.style.display = 'block';
    } else {
      copyBtn.style.display = 'none';
    }
  }

  function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Load active analysis from storage
  chrome.storage.local.get(['activeAnalysis'], (res) => {
    if (res.activeAnalysis) render(res.activeAnalysis);
  });

  // Listen for storage updates
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.activeAnalysis && changes.activeAnalysis.newValue) {
      render(changes.activeAnalysis.newValue);
    }
  });

  copyBtn.addEventListener('click', () => {
    if (activeData && activeData.verified_answer) {
      navigator.clipboard.writeText(activeData.verified_answer);
      copyBtn.innerText = '✓ Copied Verified Answer';
      setTimeout(() => copyBtn.innerText = 'Copy Verified Answer', 2000);
    }
  });
});
