// TrustGuard Extension Popup Controller
// Production-grade client handling real health checks, tab captures, and compression

document.addEventListener('DOMContentLoaded', async () => {
  // Elements: Header & Health
  const connStatus = document.getElementById('conn-status');
  const retryBtn = document.getElementById('retry-btn');

  // Elements: Verification Mode
  const modeSelect = document.getElementById('mode-select');
  const activeModeLabel = document.getElementById('active-mode-label');

  // Elements: Screen Capture
  const captureBtn = document.getElementById('capture-tab-btn');
  const captureError = document.getElementById('capture-error');
  const capturePreviewContainer = document.getElementById('capture-preview-container');
  const capturePreviewImg = document.getElementById('capture-preview-img');
  const previewDimensions = document.getElementById('preview-dimensions');
  const confirmAnalyzeBtn = document.getElementById('confirm-analyze-btn');
  const cancelCaptureBtn = document.getElementById('cancel-capture-btn');

  // Elements: Inline Trust Result Card
  const trustResultCard = document.getElementById('trust-result-card');
  const resultScoreCircle = document.getElementById('result-score-circle');
  const resultLabel = document.getElementById('result-label');
  const resultModeTag = document.getElementById('result-mode-tag');
  const resultSummary = document.getElementById('result-summary');
  const resultClaimsChecked = document.getElementById('result-claims-checked');
  const resultClaimsVerified = document.getElementById('result-claims-verified');
  const resultContradictions = document.getElementById('result-contradictions');
  const resultReasonsList = document.getElementById('result-reasons-list');
  const closeResultBtn = document.getElementById('close-result-btn');
  const openPanelDetailBtn = document.getElementById('open-panel-detail-btn');
  const copySummaryBtn = document.getElementById('copy-summary-btn');

  // Elements: Token Saver Studio
  const compressInput = document.getElementById('compress-input');
  const compressMode = document.getElementById('compress-mode');
  const compressBtn = document.getElementById('compress-btn');
  const compressError = document.getElementById('compress-error');
  const compressResults = document.getElementById('compress-results');
  const resOrig = document.getElementById('res-orig');
  const resComp = document.getElementById('res-comp');
  const resSaved = document.getElementById('res-saved');
  const copyCompressedBtn = document.getElementById('copy-compressed-btn');

  // Elements: Navigation & Diagnostics
  const openStudioBtn = document.getElementById('open-studio-btn');
  const diagToggle = document.getElementById('diagnostics-toggle');
  const diagBody = document.getElementById('diagnostics-body');
  const diagBackendUrl = document.getElementById('diag-backend-url');
  const diagLatency = document.getElementById('diag-latency');
  const diagVersion = document.getElementById('diag-version');
  const mockModeToggle = document.getElementById('mock-mode-toggle');
  const customApiInput = document.getElementById('custom-api-input');
  const saveApiBtn = document.getElementById('save-api-btn');

  // State
  let currentCapturedImage = null;
  let currentCompressedText = '';
  let activeAnalysisData = null;

  // Initialize centralized config
  if (typeof TG_CONFIG !== 'undefined' && TG_CONFIG.init) {
    await TG_CONFIG.init();
  }

  // Sync Diagnostics with current config
  function updateDiagView() {
    if (typeof TG_CONFIG !== 'undefined') {
      diagBackendUrl.innerText = TG_CONFIG.API_BASE_URL;
      diagVersion.innerText = `v${TG_CONFIG.EXTENSION_VERSION}`;
      customApiInput.value = TG_CONFIG.API_BASE_URL;
      mockModeToggle.checked = TG_CONFIG.MOCK_MODE === true;
    }
  }
  updateDiagView();

  // 1. REAL HEALTH CHECK
  async function performHealthCheck() {
    connStatus.className = 'status-badge status-offline';
    connStatus.innerText = '● Checking...';
    retryBtn.style.display = 'none';

    try {
      const health = await apiClient.checkHealth();
      if (health.ok) {
        connStatus.className = 'status-badge status-online';
        connStatus.innerText = `● Online`;
        connStatus.title = `${health.data.service || 'API'} active (${health.latencyMs}ms)`;
        retryBtn.style.display = 'none';
        diagLatency.innerText = `${health.latencyMs} ms (Online)`;
        diagLatency.style.color = '#34d399';
      } else {
        connStatus.className = 'status-badge status-offline';
        connStatus.innerText = '● Offline';
        connStatus.title = health.error || 'Backend not responding';
        retryBtn.style.display = 'inline-block';
        diagLatency.innerText = `Failed (${health.latencyMs} ms)`;
        diagLatency.style.color = '#f87171';
      }
    } catch (e) {
      connStatus.className = 'status-badge status-offline';
      connStatus.innerText = '● Offline';
      retryBtn.style.display = 'inline-block';
      diagLatency.innerText = 'Connection error';
      diagLatency.style.color = '#f87171';
    }
  }

  retryBtn.addEventListener('click', performHealthCheck);
  await performHealthCheck();

  // 2. VERIFICATION MODE
  chrome.storage.local.get(['defaultMode'], (res) => {
    if (res.defaultMode && modeSelect.querySelector(`option[value="${res.defaultMode}"]`)) {
      modeSelect.value = res.defaultMode;
    }
    activeModeLabel.innerText = modeSelect.options[modeSelect.selectedIndex].text.split('(')[0].trim();
  });

  modeSelect.addEventListener('change', async () => {
    const newMode = modeSelect.value;
    activeModeLabel.innerText = modeSelect.options[modeSelect.selectedIndex].text.split('(')[0].trim();
    if (typeof TG_CONFIG !== 'undefined') {
      await TG_CONFIG.save({ DEFAULT_VERIFY_MODE: newMode });
    }
    chrome.storage.local.set({ defaultMode: newMode });
  });

  // 3. SCREEN CAPTURE & USER CONFIRMATION FLOW
  captureBtn.addEventListener('click', () => {
    captureError.style.display = 'none';
    capturePreviewContainer.style.display = 'none';
    captureBtn.disabled = true;
    captureBtn.innerHTML = '<span>⏳</span> Capturing Active Tab...';

    chrome.runtime.sendMessage({ action: 'CAPTURE_VISIBLE_TAB' }, (res) => {
      captureBtn.disabled = false;
      captureBtn.innerHTML = '<span>📷</span> Capture Visible Tab';

      if (chrome.runtime.lastError) {
        showCaptureError(chrome.runtime.lastError.message);
        return;
      }

      if (res && res.success && res.dataUrl) {
        currentCapturedImage = res.dataUrl;
        capturePreviewImg.src = res.dataUrl;

        // Calculate rough size
        const approxBytes = Math.round((res.dataUrl.length * 3) / 4);
        const approxKB = Math.round(approxBytes / 1024);
        previewDimensions.innerText = `${approxKB} KB ready`;

        capturePreviewContainer.style.display = 'block';
      } else {
        const msg = (res && res.error) ? res.error : 'Permission denied or restricted tab.';
        showCaptureError(msg);
      }
    });
  });

  function showCaptureError(msg) {
    captureError.innerText = msg;
    captureError.style.display = 'block';
    capturePreviewContainer.style.display = 'none';
  }

  cancelCaptureBtn.addEventListener('click', () => {
    currentCapturedImage = null;
    capturePreviewContainer.style.display = 'none';
    captureError.style.display = 'none';
  });

  confirmAnalyzeBtn.addEventListener('click', async () => {
    if (!currentCapturedImage) return;

    confirmAnalyzeBtn.disabled = true;
    confirmAnalyzeBtn.innerText = '🛡️ Analyzing Tab...';
    captureError.style.display = 'none';

    try {
      const mode = modeSelect.value;
      const res = await apiClient.analyzeScreen({
        dataUrl: currentCapturedImage,
        mode: mode,
        extracted_text: ''
      });

      confirmAnalyzeBtn.disabled = false;
      confirmAnalyzeBtn.innerText = '🛡️ Verify Tab Analysis';

      if (res.success && res.data) {
        // Display result inline in UI
        displayTrustCard(res.data, mode);
        capturePreviewContainer.style.display = 'none';

        // Store as active analysis for side panel
        chrome.storage.local.set({ activeAnalysis: res.data });
      } else {
        showCaptureError(res.error || 'Screen analysis failed. Please verify API connection.');
      }
    } catch (err) {
      confirmAnalyzeBtn.disabled = false;
      confirmAnalyzeBtn.innerText = '🛡️ Verify Tab Analysis';
      showCaptureError(err.message || 'Error occurred during screen verification.');
    }
  });

  // 4. INLINE TRUST RESULT CARD DISPLAY
  function displayTrustCard(data, mode) {
    activeAnalysisData = data;
    const score = Math.round(data.trust_score || 0);

    // Color coordination based on score
    let color = '#ef4444';
    if (score >= 80) color = '#10b981';
    else if (score >= 60) color = '#f59e0b';

    resultScoreCircle.innerText = `${score}%`;
    resultScoreCircle.style.borderColor = color;
    resultScoreCircle.style.color = color;
    resultScoreCircle.style.backgroundColor = `${color}15`;

    resultLabel.innerText = data.trust_level || data.trust_label || 'TRUST EVALUATION';
    resultLabel.style.color = color;

    resultModeTag.innerText = `${(mode || data.mode || 'quick').toUpperCase()} MODE`;

    resultSummary.innerText = data.summary || 'Analysis complete with verified facts.';

    resultClaimsChecked.innerText = data.claims_checked || (data.claims ? data.claims.length : 1);
    resultClaimsVerified.innerText = data.claims_verified || (data.claims ? data.claims.filter(c => c.status === 'SUPPORTED').length : 1);
    resultContradictions.innerText = data.contradictions || data.contradiction_count || 0;

    // Populate reasons
    resultReasonsList.innerHTML = '';
    const reasons = data.reasons || (data.claims ? data.claims.map(c => `${c.status}: ${c.claim}`) : []);
    if (reasons.length > 0) {
      reasons.slice(0, 3).forEach(r => {
        const li = document.createElement('li');
        li.innerText = typeof r === 'string' ? r : (r.claim || JSON.stringify(r));
        resultReasonsList.appendChild(li);
      });
    }

    trustResultCard.style.display = 'block';
    trustResultCard.scrollIntoView({ behavior: 'smooth' });
  }

  closeResultBtn.addEventListener('click', () => {
    trustResultCard.style.display = 'none';
  });

  copySummaryBtn.addEventListener('click', () => {
    if (!activeAnalysisData) return;
    const text = `TrustGuard AI Analysis\nScore: ${activeAnalysisData.trust_score}%\nLevel: ${activeAnalysisData.trust_level || activeAnalysisData.trust_label}\nSummary: ${activeAnalysisData.summary}`;
    navigator.clipboard.writeText(text);
    copySummaryBtn.innerText = '✓ Copied';
    setTimeout(() => { copySummaryBtn.innerText = 'Copy'; }, 1500);
  });

  openPanelDetailBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTabId = tabs && tabs[0] && tabs[0].id;
      chrome.runtime.sendMessage({
        action: 'OPEN_SIDE_PANEL',
        tabId: activeTabId,
        data: activeAnalysisData
      });
    });
  });

  // 5. TOKEN SAVER STUDIO
  compressBtn.addEventListener('click', async () => {
    const rawText = compressInput.value.trim();
    compressError.style.display = 'none';

    if (!rawText) {
      compressError.innerText = 'Please enter a prompt or text to compress.';
      compressError.style.display = 'block';
      compressInput.focus();
      return;
    }

    compressBtn.disabled = true;
    compressBtn.innerText = 'Compressing...';

    try {
      const mode = compressMode.value;
      const res = await apiClient.compressContext({
        text: rawText,
        mode: mode,
        preserve_code: true,
        redact_sensitive: true,
      });

      compressBtn.disabled = false;
      compressBtn.innerText = 'Compress';

      if (res.success && res.data) {
        const d = res.data;
        currentCompressedText = d.compressed_text;
        compressInput.value = d.compressed_text;

        const ratioPct = Math.round((d.compression_ratio || (d.saved_tokens / Math.max(1, d.original_tokens))) * 100);
        resOrig.innerText = d.original_tokens;
        resComp.innerText = d.compressed_tokens;
        resSaved.innerText = `${d.saved_tokens} (${ratioPct}%)`;

        compressResults.style.display = 'block';
      } else {
        compressError.innerText = res.error || 'Compression failed. Check API connection.';
        compressError.style.display = 'block';
      }
    } catch (err) {
      compressBtn.disabled = false;
      compressBtn.innerText = 'Compress';
      compressError.innerText = err.message || 'Error occurred during context compression.';
      compressError.style.display = 'block';
    }
  });

  copyCompressedBtn.addEventListener('click', () => {
    const textToCopy = currentCompressedText || compressInput.value;
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      copyCompressedBtn.innerText = '✓ Copied to Clipboard!';
      setTimeout(() => { copyCompressedBtn.innerText = '📋 Copy Compressed Text'; }, 2000);
    }
  });

  // 6. OPEN FULL TRUSTGUARD STUDIO
  openStudioBtn.addEventListener('click', () => {
    const appUrl = (typeof TG_CONFIG !== 'undefined' ? TG_CONFIG.APP_URL : 'http://localhost:5173') || 'http://localhost:5173';
    chrome.tabs.create({ url: appUrl });
  });

  // 7. DIAGNOSTICS & SETTINGS
  diagToggle.addEventListener('click', () => {
    const isVisible = diagBody.style.display === 'block';
    diagBody.style.display = isVisible ? 'none' : 'block';
    document.getElementById('diag-arrow').innerText = isVisible ? '▼' : '▲';
  });

  mockModeToggle.addEventListener('change', async () => {
    const isMock = mockModeToggle.checked;
    if (typeof TG_CONFIG !== 'undefined') {
      await TG_CONFIG.save({ MOCK_MODE: isMock });
    }
    chrome.storage.local.set({ mockMode: isMock });
    await performHealthCheck();
  });

  saveApiBtn.addEventListener('click', async () => {
    const newUrl = customApiInput.value.trim().replace(/\/+$/, '');
    if (!newUrl) return;

    if (typeof TG_CONFIG !== 'undefined') {
      await TG_CONFIG.save({ API_BASE_URL: newUrl });
    }
    chrome.storage.local.set({ backendUrl: newUrl });
    updateDiagView();
    saveApiBtn.innerText = 'Saved!';
    setTimeout(() => { saveApiBtn.innerText = 'Save'; }, 1500);
    await performHealthCheck();
  });
});
