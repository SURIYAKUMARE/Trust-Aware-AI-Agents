// TrustGuard AI — Centralized Configuration
// Shared across background service worker, popup UI, and sidepanel

(function (global) {
  'use strict';

  const DEFAULT_CONFIG = {
    API_BASE_URL: 'http://localhost:8000',
    APP_URL: 'http://localhost:5173',
    EXTENSION_VERSION: '1.0.0',
    MOCK_MODE: false,
    TIMEOUT_MS: 10000,
    DEFAULT_VERIFY_MODE: 'quick',
  };

  const TG_CONFIG = {
    ...DEFAULT_CONFIG,

    // Initialize configuration by loading user overrides from chrome.storage.local
    async init() {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const stored = await chrome.storage.local.get([
            'backendUrl',
            'appUrl',
            'mockMode',
            'defaultMode',
          ]);
          if (stored.backendUrl) this.API_BASE_URL = stored.backendUrl.replace(/\/+$/, '');
          if (stored.appUrl) this.APP_URL = stored.appUrl.replace(/\/+$/, '');
          if (typeof stored.mockMode === 'boolean') this.MOCK_MODE = stored.mockMode;
          if (stored.defaultMode) this.DEFAULT_VERIFY_MODE = stored.defaultMode;
        } catch (e) {
          console.warn('[TrustGuard][Config] Error reading storage config:', e);
        }
      }
      return this;
    },

    // Save updated configuration to storage
    async save(updates) {
      Object.assign(this, updates);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          backendUrl: this.API_BASE_URL,
          appUrl: this.APP_URL,
          mockMode: this.MOCK_MODE,
          defaultMode: this.DEFAULT_VERIFY_MODE,
        });
      }
      return this;
    },

    // Reset back to defaults
    async reset() {
      Object.assign(this, DEFAULT_CONFIG);
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove(['backendUrl', 'appUrl', 'mockMode', 'defaultMode']);
      }
      return this;
    }
  };

  // Expose globally
  global.TG_CONFIG = TG_CONFIG;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TG_CONFIG;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
