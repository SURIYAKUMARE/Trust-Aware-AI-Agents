// ChatGPT DOM Adapter for TrustGuard AI
(function() {
  window.TrustGuardAdapters = window.TrustGuardAdapters || {};

  window.TrustGuardAdapters.chatgpt = {
    name: 'ChatGPT',
    isMatch: () => {
      const host = window.location.hostname;
      return host.includes('chatgpt.com') || host.includes('openai.com');
    },
    getResponseNodes: () => {
      return Array.from(document.querySelectorAll('[data-message-author-role="assistant"]'));
    },
    extractText: (node) => {
      const contentEl = node.querySelector('.markdown') || node;
      return contentEl.innerText.trim();
    },
    extractPrompt: (node) => {
      // Find preceding user turn
      let prev = node.previousElementSibling;
      while (prev) {
        if (prev.getAttribute('data-message-author-role') === 'user') {
          return prev.innerText.trim();
        }
        prev = prev.previousElementSibling;
      }
      return '';
    },
    isStreaming: (node) => {
      return node.classList.contains('result-streaming') || !!node.querySelector('.result-streaming');
    },
    getBadgeAnchor: (node) => {
      return node.querySelector('.markdown') || node;
    }
  };
})();
