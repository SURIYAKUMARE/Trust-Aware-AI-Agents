// TrustGuard AI — Robust API Client
// Standardized client for Backend API communication across Chrome Extension

(function (global) {
  'use strict';

  class TrustGuardApiClient {
    constructor(config) {
      this.config = config || (typeof global.TG_CONFIG !== 'undefined' ? global.TG_CONFIG : {
        API_BASE_URL: 'http://localhost:8000',
        TIMEOUT_MS: 10000,
        MOCK_MODE: false,
      });
    }

    _log(method, endpoint, detail) {
      console.log(`[TrustGuard][API] [${method}] ${endpoint}`, detail || '');
    }

    _error(method, endpoint, err) {
      console.error(`[TrustGuard][API][ERROR] [${method}] ${endpoint}:`, err);
    }

    getBaseUrl() {
      return (this.config.API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');
    }

    async _fetchWithTimeout(url, options = {}, timeoutMs) {
      const timeout = timeoutMs || this.config.TIMEOUT_MS || 10000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });
        clearTimeout(timer);
        return response;
      } catch (err) {
        clearTimeout(timer);
        if (err.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw err;
      }
    }

    /**
     * Check backend service health status and roundtrip latency
     */
    async checkHealth() {
      const baseUrl = this.getBaseUrl();
      const startTime = performance.now();
      this._log('GET', `${baseUrl}/health`);

      if (this.config.MOCK_MODE) {
        return {
          ok: true,
          latencyMs: 12,
          data: { status: 'ok', service: 'TrustGuard Mock API', version: '1.0.0' }
        };
      }

      // Try /health first, fallback to /api/health or /
      const endpoints = ['/health', '/api/health', '/'];
      for (const ep of endpoints) {
        try {
          const resp = await this._fetchWithTimeout(`${baseUrl}${ep}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }, 3500);

          const latencyMs = Math.round(performance.now() - startTime);

          if (resp.ok) {
            let data = {};
            try {
              data = await resp.json();
            } catch (_) {
              data = { status: 'ok' };
            }
            this._log('OK', ep, `Latency: ${latencyMs}ms`);
            return {
              ok: true,
              latencyMs,
              data: {
                status: data.status || 'ok',
                service: data.service || data.name || 'TrustGuard API',
                version: data.version || '1.0.0'
              }
            };
          }
        } catch (e) {
          // Continue to next fallback endpoint
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      this._error('FAIL', '/health', `Could not reach ${baseUrl}`);
      return {
        ok: false,
        latencyMs,
        error: `Backend unreachable at ${baseUrl}`
      };
    }

    /**
     * Independently evaluate an AI answer
     */
    async analyzeAnswer(payload) {
      if (this.config.MOCK_MODE) {
        return this._getMockAnalysis(payload);
      }

      const url = `${this.getBaseUrl()}/api/analyze`;
      this._log('POST', url, { provider: payload.provider, mode: payload.mode });

      try {
        const resp = await this._fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            prompt: payload.prompt || payload.question || '',
            response: payload.response || payload.answer || '',
            provider: payload.provider || 'external_ai',
            mode: payload.mode || 'quick',
            context: payload.context || '',
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`API returned HTTP ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        return { success: true, data };
      } catch (err) {
        this._error('POST', url, err);
        return { success: false, error: err.message };
      }
    }

    async verifyAnswer(payload) {
      return this.analyzeAnswer(payload);
    }

    /**
     * Analyze screen capture
     */
    async analyzeScreen(payload) {
      if (this.config.MOCK_MODE) {
        return this._getMockAnalysis({ prompt: 'Screen capture', response: 'Viewport content', mode: payload.mode });
      }

      const url = `${this.getBaseUrl()}/api/analyze/screen`;
      this._log('POST', url, { mode: payload.mode });

      try {
        const resp = await this._fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            image_base64: payload.image_base64 || payload.dataUrl || '',
            mode: payload.mode || 'quick',
            extracted_text: payload.extracted_text || '',
          })
        }, 15000); // Allow up to 15s for vision/screen analysis

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`API returned HTTP ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        return { success: true, data };
      } catch (err) {
        this._error('POST', url, err);
        return { success: false, error: err.message };
      }
    }

    /**
     * Compress context / prompt via Token Saver engine
     */
    async compressContext(payload) {
      if (this.config.MOCK_MODE) {
        const text = payload.text || '';
        const words = text.split(/\s+/).filter(Boolean);
        const origTokens = Math.round(words.length * 1.3);
        const compTokens = Math.max(1, Math.round(origTokens * 0.45));
        return {
          success: true,
          data: {
            original_text: text,
            compressed_text: text.replace(/\b(please|kindly|could you|would you|thank you|in order to|as a matter of fact)\b/gi, '').replace(/\s+/g, ' ').trim(),
            original_tokens: origTokens,
            compressed_tokens: compTokens,
            saved_tokens: origTokens - compTokens,
            compression_ratio: 0.55,
            mode_used: payload.mode || 'balanced',
            redacted_count: 0
          }
        };
      }

      const url = `${this.getBaseUrl()}/api/compress`;
      this._log('POST', url, { mode: payload.mode, len: (payload.text || '').length });

      try {
        const resp = await this._fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            text: payload.text || '',
            mode: payload.mode || 'balanced',
            preserve_code: payload.preserve_code !== false,
            redact_sensitive: payload.redact_sensitive !== false,
            target_token_budget: payload.target_token_budget || null,
          })
        });

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`API returned HTTP ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        return { success: true, data };
      } catch (err) {
        this._error('POST', url, err);
        return { success: false, error: err.message };
      }
    }

    /**
     * Fetch stored verification by ID
     */
    async getTrustReport(analysisId) {
      const url = `${this.getBaseUrl()}/api/verification/${encodeURIComponent(analysisId)}`;
      this._log('GET', url);

      try {
        const resp = await this._fetchWithTimeout(url, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });

        if (!resp.ok) {
          throw new Error(`Analysis ID not found (${resp.status})`);
        }

        const data = await resp.json();
        return { success: true, data };
      } catch (err) {
        this._error('GET', url, err);
        return { success: false, error: err.message };
      }
    }

    /**
     * Ask a question, get an AI-generated answer, and verify it in one call.
     */
    async askAndVerify(payload) {
      if (this.config.MOCK_MODE) {
        return this._getMockAskAndVerify(payload);
      }

      const url = `${this.getBaseUrl()}/api/ask-and-verify`;
      this._log('POST', url, { question: (payload.question || '').slice(0, 60) });

      try {
        const resp = await this._fetchWithTimeout(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            question: payload.question || '',
            mode: payload.mode || 'fact',
            provider: payload.provider || 'trustguard',
          }),
        }, 20000); // allow up to 20 s — LLM generation + verification

        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(`API returned HTTP ${resp.status}: ${errText}`);
        }

        const data = await resp.json();
        return { success: true, data };
      } catch (err) {
        this._error('POST', url, err);
        return { success: false, error: err.message };
      }
    }

    _getMockAskAndVerify(payload) {
      const q = (payload.question || '').toLowerCase();
      let ai_answer, verdict, verdict_color, trust_score, summary, suggested_correction;

      if (q.includes('capital of france') || q.includes('paris')) {
        ai_answer = 'The capital of France is Paris.';
        verdict = 'REAL INFORMATION'; verdict_color = 'green'; trust_score = 97;
        summary = '🟢 REAL INFORMATION — 1 claim confirmed by evidence (97% trust).';
        suggested_correction = null;
      } else if (q.includes('2031') || q.includes('olympiad')) {
        ai_answer = 'The 2031 Chess Olympiad has not yet taken place and has no recorded winner.';
        verdict = 'UNCERTAIN'; verdict_color = 'amber'; trust_score = 55;
        summary = '⚠️ UNCERTAIN — Answer could not be fully verified (55% trust). Treat with caution.';
        suggested_correction = null;
      } else if (q.includes('bleach') || q.includes('cure')) {
        ai_answer = 'Drinking bleach is extremely dangerous and can be fatal. It does not cure any illness.';
        verdict = 'REAL INFORMATION'; verdict_color = 'green'; trust_score = 99;
        summary = '🟢 REAL INFORMATION — Safety fact confirmed by medical corpus (99% trust).';
        suggested_correction = null;
      } else {
        ai_answer = `Based on available knowledge: ${payload.question}`;
        verdict = 'LIKELY REAL'; verdict_color = 'amber'; trust_score = 72;
        summary = '🟡 LIKELY REAL — Answer is mostly correct (72% trust) but some claims lack direct citations.';
        suggested_correction = null;
      }

      return {
        success: true,
        data: {
          question: payload.question,
          ai_answer,
          trust_score,
          trust_label: trust_score >= 80 ? 'HIGH TRUST' : trust_score >= 60 ? 'MEDIUM TRUST' : 'LOW TRUST',
          verdict,
          verdict_color,
          summary,
          claims_checked: 2,
          claims_verified: verdict === 'REAL INFORMATION' ? 2 : 1,
          contradictions: verdict === 'FAKE INFORMATION' ? 1 : 0,
          suggested_correction,
          sources: ['TrustGuard Internal KB'],
          latency_ms: 320,
        }
      };
    }

    _getMockAnalysis(payload) {
      return {
        success: true,
        data: {
          analysis_id: 'mock-' + Date.now(),
          trust_score: 94,
          trust_level: 'HIGH TRUST',
          trust_label: 'HIGH TRUST',
          summary: 'High factual agreement across primary sources with zero contradictory assertions.',
          factual_consistency: 0.95,
          evidence_consistency: 0.92,
          contradiction_count: 0,
          claims_checked: 3,
          claims_verified: 3,
          uncertain_claims: 0,
          reasons: [
            'Factual claims corroborated by consensus knowledge base.',
            'No contradictory statements detected.',
            'Precision alignment above 90% threshold.'
          ],
          recommendation: 'Reliable to use directly without further verification.',
          sources: ['TrustGuard Internal KB', 'Consensus Registry'],
          claims: [
            {
              claim: 'Extracted primary assertion is factually valid.',
              status: 'SUPPORTED',
              source: 'TrustGuard Ground Truth',
              snippet: 'Verified statement matches authoritative reference.'
            }
          ]
        }
      };
    }
  }

  // Create singleton instance
  const apiClient = new TrustGuardApiClient();
  global.TrustGuardApiClient = TrustGuardApiClient;
  global.apiClient = apiClient;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TrustGuardApiClient, apiClient };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
