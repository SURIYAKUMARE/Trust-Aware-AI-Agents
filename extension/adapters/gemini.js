// Gemini DOM Adapter for TrustGuard AI
(function() {
  window.TrustGuardAdapters = window.TrustGuardAdapters || {};

  window.TrustGuardAdapters.gemini = {
    name: 'Gemini',
    isMatch: () => {
      return window.location.hostname.includes('gemini.google.com');
    },
    getResponseNodes: () => {
      const selectors = ['message-content', '.model-response-text', '.response-container-content'];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) return Array.from(found);
      }
      return [];
    },
    extractText: (node) => {
      return node.innerText.trim();
    },
    extractPrompt: (node) => {
      const container = node.closest('.conversation-container, .turn') || document;
      const userEl = container.querySelector('.user-query, .query-text, user-query-container');
      return userEl ? userEl.innerText.trim() : '';
    },
    isStreaming: (node) => {
      return node.getAttribute('aria-busy') === 'true' || node.classList.contains('pending');
    },
    getBadgeAnchor: (node) => {
      return node;
    }
  };
})();
