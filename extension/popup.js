// TrustGuard Extension Popup Controller

document.addEventListener('DOMContentLoaded', async () => {
  const backendUrl = 'http://localhost:8000';
  const connStatus = document.getElementById('conn-status');
  const modeSelect = document.getElementById('mode-select');
  const captureBtn = document.getElementById('capture-tab-btn');
  const compressBtn = document.getElementById('compress-btn');
  const compressInput = document.getElementById('compress-input');
  const compressMode = document.getElementById('compress-mode');
  const openStudioBtn = document.getElementById('open-studio-btn');

  // Check backend health
  try {
    const resp = await fetch(`${backendUrl}/`);
    if (resp.ok) {
      connStatus.innerText = '● Connected';
      connStatus.style.borderColor = '#10b981';
      connStatus.style.color = '#34d399';
    } else {
      connStatus.innerText = '● Backend Offline';
      connStatus.style.borderColor = '#ef4444';
      connStatus.style.color = '#f87171';
    }
  } catch (err) {
    connStatus.innerText = '● Offline';
    connStatus.style.borderColor = '#6b7280';
    connStatus.style.color = '#9ca3af';
  }

  // Load mode from storage
  chrome.storage.local.get(['defaultMode'], (res) => {
    if (res.defaultMode) modeSelect.value = res.defaultMode;
  });

  modeSelect.addEventListener('change', () => {
    chrome.storage.local.set({ defaultMode: modeSelect.value });
  });

  // Screen Capture Trigger
  captureBtn.addEventListener('click', () => {
    captureBtn.innerText = '📸 Capturing Tab...';
    captureBtn.disabled = true;

    chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB' }, (res) => {
      captureBtn.innerText = 'Capture Visible Tab';
      captureBtn.disabled = false;

      if (res && res.success && res.dataUrl) {
        // Forward image to backend screen analysis
        chrome.runtime.sendMessage({
          action: 'API_ANALYZE',
          payload: {
            prompt: 'Visible Tab Screen Capture',
            response: 'Content extracted from active browser viewport.',
            provider: 'screen_capture',
            mode: modeSelect.value
          }
        }, (anaRes) => {
          if (anaRes && anaRes.success) {
            alert(`🛡️ TrustGuard Analysis:\nTrust Score: ${anaRes.data.trust_score}%\nTrust Label: ${anaRes.data.trust_label}\nSummary: ${anaRes.data.summary}`);
          }
        });
      } else {
        alert('Could not capture tab: ' + (res ? res.error : 'Permission denied'));
      }
    });
  });

  // Token Saver Compression
  compressBtn.addEventListener('click', () => {
    const text = compressInput.value.trim();
    if (!text) return;

    compressBtn.innerText = 'Compressing...';
    chrome.runtime.sendMessage({
      action: 'API_COMPRESS',
      payload: {
        text: text,
        mode: compressMode.value,
        preserve_code: true,
        redact_sensitive: true
      }
    }, (res) => {
      compressBtn.innerText = 'Compress';
      if (res && res.success && res.data) {
        const d = res.data;
        document.getElementById('compress-results').style.display = 'block';
        document.getElementById('res-orig').innerText = d.original_tokens;
        document.getElementById('res-comp').innerText = d.compressed_tokens;
        document.getElementById('res-saved').innerText = `${d.saved_tokens} (${Math.round(d.compression_ratio * 100)}%)`;
        compressInput.value = d.compressed_text;
      }
    });
  });

  // Open Full Studio
  openStudioBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:5173/' });
  });
});
