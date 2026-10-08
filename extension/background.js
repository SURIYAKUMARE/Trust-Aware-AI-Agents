// TrustGuard AI Service Worker (Manifest V3)
// Handles background messaging, tab captures, and API forwarding

try {
  importScripts('config.js', 'api_client.js');
} catch (e) {
  console.warn('[TrustGuard][Background] Failed to importScripts:', e);
}

// Initialize config on startup
if (typeof TG_CONFIG !== 'undefined' && TG_CONFIG.init) {
  TG_CONFIG.init().catch(console.error);
}

chrome.runtime.onInstalled.addListener(async () => {
  // Set default settings in storage
  const res = await chrome.storage.local.get(['backendUrl', 'autoBadge', 'redactSensitive', 'defaultMode', 'mockMode']);
  await chrome.storage.local.set({
    backendUrl: res.backendUrl || (typeof TG_CONFIG !== 'undefined' ? TG_CONFIG.API_BASE_URL : 'http://localhost:8000'),
    autoBadge: res.autoBadge !== false,
    redactSensitive: res.redactSensitive !== false,
    defaultMode: res.defaultMode || 'quick',
    mockMode: res.mockMode === true,
  });

  // Create Context Menus for right-click verification & compression
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'tg-verify-selection',
      title: '🛡️ Verify with TrustGuard',
      contexts: ['selection']
    });

    chrome.contextMenus.create({
      id: 'tg-compress-selection',
      title: '⚡ Compress with Token Saver',
      contexts: ['selection']
    });
  });

  console.log('[TrustGuard][Background] Extension installed and initialized.');
});

// Context Menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'tg-verify-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRIGGER_MANUAL_VERIFY',
      text: info.selectionText
    }).catch(err => console.log('[TrustGuard] Tab message not handled:', err.message));
  } else if (info.menuItemId === 'tg-compress-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRIGGER_MANUAL_COMPRESS',
      text: info.selectionText
    }).catch(err => console.log('[TrustGuard] Tab message not handled:', err.message));
  }
});

// Side panel setup for Chrome 114+
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  // 1. Open Side Panel
  if (message.action === 'OPEN_SIDE_PANEL') {
    const targetTabId = (sender.tab && sender.tab.id) || message.tabId;
    if (chrome.sidePanel && targetTabId) {
      chrome.sidePanel.open({ tabId: targetTabId });
      if (message.data) {
        chrome.storage.local.set({ activeAnalysis: message.data });
      }
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, reason: 'sidePanel API not available or no active tab' });
    }
    return true;
  }

  // 2. Capture Visible Tab with safety validations
  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs && tabs[0];
      if (activeTab && activeTab.url && (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:'))) {
        sendResponse({
          success: false,
          error: 'Restricted page: Chrome does not allow extensions to capture internal system pages (chrome://). Please open a web page or AI chat.'
        });
        return;
      }

      chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
          const errMsg = chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown screen capture failure';
          console.warn('[TrustGuard][Capture] Failed:', errMsg);
          sendResponse({
            success: false,
            error: errMsg.includes('Cannot access')
              ? 'Cannot capture this tab due to browser security restrictions. Please navigate to an accessible webpage.'
              : errMsg
          });
        } else {
          sendResponse({ success: true, dataUrl: dataUrl });
        }
      });
    });
    return true; // Keep channel open for async response
  }

  // 3. API Analyze
  if (message.action === 'API_ANALYZE') {
    (async () => {
      try {
        if (typeof apiClient !== 'undefined') {
          const res = await apiClient.analyzeAnswer(message.payload);
          sendResponse(res);
        } else {
          // Direct fetch fallback
          const storage = await chrome.storage.local.get(['backendUrl']);
          const baseUrl = storage.backendUrl || 'http://localhost:8000';
          const resp = await fetch(`${baseUrl}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.payload)
          });
          const data = await resp.json();
          sendResponse({ success: resp.ok, data });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 4. API Screen Analysis
  if (message.action === 'API_ANALYZE_SCREEN') {
    (async () => {
      try {
        if (typeof apiClient !== 'undefined') {
          const res = await apiClient.analyzeScreen(message.payload);
          sendResponse(res);
        } else {
          sendResponse({ success: false, error: 'apiClient not initialized' });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 5. API Compress
  if (message.action === 'API_COMPRESS') {
    (async () => {
      try {
        if (typeof apiClient !== 'undefined') {
          const res = await apiClient.compressContext(message.payload);
          sendResponse(res);
        } else {
          const storage = await chrome.storage.local.get(['backendUrl']);
          const baseUrl = storage.backendUrl || 'http://localhost:8000';
          const resp = await fetch(`${baseUrl}/api/compress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message.payload)
          });
          const data = await resp.json();
          sendResponse({ success: resp.ok, data });
        }
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  // 6. API Health Check
  if (message.action === 'API_HEALTH') {
    (async () => {
      try {
        if (typeof apiClient !== 'undefined') {
          const res = await apiClient.checkHealth();
          sendResponse(res);
        } else {
          sendResponse({ ok: false, error: 'apiClient unavailable' });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }
});
