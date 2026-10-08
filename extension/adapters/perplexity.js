// Perplexity DOM Adapter for TrustGuard AI
(function() {
  window.TrustGuardAdapters = window.TrustGuardAdapters || {};

  window.TrustGuardAdapters.perplexity = {
    name: 'Perplexity',
    isMatch: () => {
      return window.location.hostname.includes('perplexity.ai');
    },
    getResponseNodes: () => {
      const selectors = ['.prose', '.default.font-sans.text-textMain', '[data-testid="answer-container"]'];
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
      const title = document.querySelector('h1, [dir="auto"]');
      return title ? title.innerText.trim() : 'Perplexity Query';
    },
    isStreaming: (node) => {
      return !!node.querySelector('.animate-pulse');
    },
    getBadgeAnchor: (node) => {
      return node;
    }
  };
})();
