// TrustGuard Token Saver - Client-side Context Compression Module
(function() {
  window.TrustGuardTokenSaver = {
    estimateTokens: function(text) {
      if (!text) return 0;
      const tokens = text.match(/\w+|[^\w\s]/g) || [];
      const charEstimate = Math.max(1, Math.floor(text.length / 3.8));
      return Math.max(1, Math.floor((tokens.length + charEstimate) / 2));
    },

    redactSecrets: function(text) {
      if (!text) return { sanitized: '', count: 0 };
      let sanitized = text;
      let count = 0;

      const patterns = [
        [/\bsk-[a-zA-Z0-9_\-]{20,}\b/g, '[REDACTED_API_KEY]'],
        [/\bsk-ant-[a-zA-Z0-9_\-]{20,}\b/g, '[REDACTED_ANTHROPIC_KEY]'],
        [/\bAIza[0-9A-Za-z\-_]{35}\b/g, '[REDACTED_GOOGLE_KEY]'],
        [/\bghp_[a-zA-Z0-9]{36}\b/g, '[REDACTED_GITHUB_PAT]'],
        [/\bgithub_pat_[a-zA-Z0-9_]{50,}\b/g, '[REDACTED_GITHUB_PAT]'],
        [/\b(AKIA|ABIA|ACCA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]'],
        [/\bBearer\s+[a-zA-Z0-9_\-\.]{24,}\b/gi, 'Bearer [REDACTED_TOKEN]'],
        [/\b(?:\d{4}[ -]?){3}\d{4}\b/g, '[REDACTED_CREDIT_CARD]'],
      ];

      for (const [re, rep] of patterns) {
        const matches = sanitized.match(re);
        if (matches) {
          count += matches.length;
          sanitized = sanitized.replace(re, rep);
        }
      }

      return { sanitized, count };
    },

    compress: function(text, mode = 'balanced', targetBudget = null) {
      if (!text) return { originalText: '', compressedText: '', originalTokens: 0, compressedTokens: 0, savedTokens: 0, ratio: 0 };

      const origTokens = this.estimateTokens(text);
      const { sanitized, count: redactedCount } = this.redactSecrets(text);
      let processed = sanitized;

      // Extract code blocks to preserve intact
      const codeBlocks = [];
      processed = processed.replace(/```[\s\S]*?```/g, (match) => {
        const idx = codeBlocks.length;
        codeBlocks.push(match);
        return `__CODE_BLOCK_${idx}__`;
      });

      // Filler patterns
      const fillerPatterns = [
        /\b(hello|hi|hey|greetings|good\s+(morning|afternoon|evening|day))\b[!.,\s]*/gi,
        /\b(sure|certainly|absolutely|of\s+course|gladly|happy\s+to\s+help|no\s+problem)\b[!.,\s]*/gi,
        /\b(as\s+an\s+ai\s+(language\s+model|assistant)?|i\s+am\s+an\s+ai)[!.,\s]*/gi,
        /\b(i\s+would\s+be\s+happy\s+to\s+assist\s+you\s+with\s+(that|this))[!.,\s]*/gi,
        /\b(let\s+me\s+know\s+if\s+you\s+(have\s+any\s+questions|need\s+(further|more)\s+help))[!.,\s]*/gi,
        /\b(hope\s+this\s+helps|feel\s+free\s+to\s+ask|is\s+there\s+anything\s+else)[!.,\s]*/gi,
        /\b(thank\s+you\s+for\s+(asking|reaching\s+out))[!.,\s]*/gi,
      ];

      for (const fp of fillerPatterns) {
        processed = processed.replace(fp, '');
      }

      if (mode === 'balanced' || mode === 'aggressive' || mode === 'compact') {
        const connectorReplacements = [
          [/\bin order to\b/gi, 'to'],
          [/\bdue to the fact that\b/gi, 'because'],
          [/\bat this point in time\b/gi, 'now'],
          [/\bwith reference to\b/gi, 'regarding'],
          [/\bfor the purpose of\b/gi, 'for'],
          [/\bin the event that\b/gi, 'if'],
          [/\bis able to\b/gi, 'can'],
          [/\bit is recommended that you\b/gi, 'recommend:'],
          [/\bplease make sure that\b/gi, 'ensure'],
        ];
        for (const [src, dst] of connectorReplacements) {
          processed = processed.replace(src, dst);
        }
      }

      if (mode === 'aggressive') {
        processed = processed.replace(/\b(basically|essentially|really|very|simply|actually|totally|completely)\b/gi, '');
      }

      if (mode === 'compact') {
        // High density key-value formatting
        const rawUnits = processed.split(/\n+/).flatMap(line => line.split(/(?<=[.?!])\s+/)).map(s => s.trim()).filter(Boolean);
        const compactItems = [];
        for (const unit of rawUnits) {
          if (unit.startsWith('__CODE_BLOCK_')) {
            compactItems.push(unit);
            continue;
          }
          let uClean = unit.replace(/^(can\s+you\s+(please\s+)?(tell\s+me|explain|show|write)?|please\s+|how\s+to\s+)\s*/i, '');
          uClean = uClean.replace(/\b(on\s+my\s+server|in\s+my\s+project|the\s+requirement\s+is\s+that|we\s+must)\b/gi, '').trim();
          if (unit.endsWith('?') || /^(how|what|why|write|fix)/i.test(unit)) {
            compactItems.push(`task: ${uClean}`);
          } else if (/error|exception|fail/i.test(unit)) {
            compactItems.push(`err: ${uClean}`);
          } else if (/must|need|ensure|require/i.test(unit)) {
            compactItems.push(`req: ${uClean}`);
          } else if (uClean) {
            compactItems.push(uClean);
          }
        }
        processed = compactItems.join(' | ');
      }

      // Restore code blocks
      codeBlocks.forEach((block, idx) => {
        processed = processed.replace(`__CODE_BLOCK_${idx}__`, block);
      });

      // Clean up whitespace
      processed = processed.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();

      const compTokens = this.estimateTokens(processed);
      const saved = Math.max(0, origTokens - compTokens);
      const ratio = Math.round((saved / Math.max(1, origTokens)) * 100);

      return {
        originalText: text,
        compressedText: processed,
        originalTokens: origTokens,
        compressedTokens: compTokens,
        savedTokens: saved,
        ratio: ratio,
        redactedCount: redactedCount,
        costSavedUsd: (saved * 0.000005).toFixed(5)
      };
    }
  };
})();
