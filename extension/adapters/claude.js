// Claude DOM Adapter for TrustGuard AI
(function() {
  window.TrustGuardAdapters = window.TrustGuardAdapters || {};

  window.TrustGuardAdapters.claude = {
    name: 'Claude',
    isMatch: () => {
      return window.location.hostname.includes('claude.ai');
    },
    getResponseNodes: () => {
      const selectors = ['.font-claude-message', '[data-is-streaming]', '.grid-cols-1 .whitespace-pre-wrap'];
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
      const parent = node.closest('[data-test-render-count]') || node.parentElement;
      const userEl = parent ? parent.querySelector('.font-user-message') : null;
      return userEl ? userEl.innerText.trim() : '';
    },
    isStreaming: (node) => {
      return node.getAttribute('data-is-streaming') === 'true';
    },
    getBadgeAnchor: (node) => {
      return node;
    }
  };
})();
