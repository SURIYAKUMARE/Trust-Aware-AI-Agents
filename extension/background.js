// TrustGuard AI Service Worker (Manifest V3)

const DEFAULT_BACKEND_URL = 'http://localhost:8000';

chrome.runtime.onInstalled.addListener(() => {
  // Set default settings in storage
  chrome.storage.local.get(['backendUrl', 'autoBadge', 'redactSensitive', 'defaultMode'], (res) => {
    chrome.storage.local.set({
      backendUrl: res.backendUrl || DEFAULT_BACKEND_URL,
      autoBadge: res.autoBadge !== false,
      redactSensitive: res.redactSensitive !== false,
      defaultMode: res.defaultMode || 'quick',
    });
  });

  // Create Context Menus for right-click verification & compression
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

// Context Menu click handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab || !tab.id) return;

  if (info.menuItemId === 'tg-verify-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRIGGER_MANUAL_VERIFY',
      text: info.selectionText
    });
  } else if (info.menuItemId === 'tg-compress-selection' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'TRIGGER_MANUAL_COMPRESS',
      text: info.selectionText
    });
  }
});

// Side panel setup for Chrome 114+
if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
}

// Runtime message dispatcher
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'OPEN_SIDE_PANEL') {
    if (chrome.sidePanel && sender.tab && sender.tab.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id });
      // Send active analysis to sidepanel
      chrome.storage.local.set({ activeAnalysis: message.data });
      sendResponse({ success: true });
    } else {
      sendResponse({ success: false, reason: 'sidePanel API not available' });
    }
    return true;
  }

  if (message.action === 'CAPTURE_VISIBLE_TAB') {
    // Explicit user permission capture
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        sendResponse({ success: false, error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Capture failed' });
      } else {
        sendResponse({ success: true, dataUrl: dataUrl });
      }
    });
    return true; // Keep channel open for async response
  }

  if (message.action === 'API_ANALYZE') {
    chrome.storage.local.get(['backendUrl'], async (res) => {
      const url = `${res.backendUrl || DEFAULT_BACKEND_URL}/api/analyze`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload)
        });
        const data = await resp.json();
        sendResponse({ success: resp.ok, data: data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  if (message.action === 'API_COMPRESS') {
    chrome.storage.local.get(['backendUrl'], async (res) => {
      const url = `${res.backendUrl || DEFAULT_BACKEND_URL}/api/compress`;
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload)
        });
        const data = await resp.json();
        sendResponse({ success: resp.ok, data: data });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }
});
