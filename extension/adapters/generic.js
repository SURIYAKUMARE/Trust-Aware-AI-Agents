// Generic Web & Selection Adapter for TrustGuard AI
(function() {
  window.TrustGuardAdapters = window.TrustGuardAdapters || {};

  window.TrustGuardAdapters.generic = {
    name: 'Generic Web Page',
    isMatch: () => true, // Fallback for all other pages
    getResponseNodes: () => {
      // Look for common chatbot containers (Copilot, Mistral, HuggingFace Chat, Poe)
      const selectors = [
        '[role="log"] [data-author="assistant"]',
        '.chat-message-assistant',
        '.assistant-message',
        '.bot-message',
        '.message-assistant',
        'article'
      ];
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
      return 'Generic Query';
    },
    isStreaming: (node) => false,
    getBadgeAnchor: (node) => node
  };
})();
