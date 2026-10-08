import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TokenSaverMode, CompressResponse, TokenAnalyticsResponse } from '../types';

interface TokenSaverViewProps {
  onUseInChat?: (text: string) => void;
}

const PRESETS = [
  {
    title: 'Verbose Coding Question',
    text: `Hello there! Good morning. As an AI language model, I would be really grateful if you could please assist me with a problem in my Python code.
In order to accomplish this, due to the fact that Python 3.12 has introduced new syntax for generics, I am having trouble with a function.
Here is the code snippet I am working on:
\`\`\`python
def calculate_moving_average(data: list[float], window_size: int) -> list[float]:
    if window_size <= 0:
        raise ValueError("window_size must be positive")
    return [sum(data[i:i+window_size])/window_size for i in range(len(data)-window_size+1)]
\`\`\`
The requirement is that we must strictly maintain O(N) linear time complexity and not allocate excessive memory.
Please let me know if you have any questions or need further details. Thank you very much for your time and help! Have a great day!`
  },
  {
    title: 'Multi-Turn Support Log',
    text: `User: Hi! I am having an issue with my Postgres database container.
Assistant: Hello! I would be delighted to assist you with your Postgres container today. What seems to be the issue?
User: The error log says: "FATAL: password authentication failed for user 'app_user'".
Assistant: Certainly! That error typically occurs when the provided credentials do not match the database configuration. In order to fix this, please ensure the password in your environment file matches.
User: Okay, the constraint is that we must not restart the entire cluster during peak hours. How should I update the user password in PostgreSQL?`
  },
  {
    title: 'API Secret Leak Hazard',
    text: `Here are my test credentials for the deployment script:
OpenAI Key: sk-proj-1234567890abcdef1234567890abcdef12345678
GitHub PAT: ghp_9876543210fedcba9876543210fedcba9876
Credit Card for billing verification: 4532 8901 2345 6789
Please write a shell script to automate our nightly backups.`
  },
  {
    title: 'RAG Context with Boilerplate',
    text: `DOCUMENT EXCERPT:
Welcome to the Acme Corp Internal Architecture Guide version 4.2.
Notice: This document contains proprietary information and is for employee use only. All rights reserved 2026.
Section 1: Authentication Policy.
All external API requests must include a Bearer token in the Authorization header.
Tokens expire after 3600 seconds (1 hour). Refresh tokens are valid for 30 days.
Rate limits: 10,000 requests per minute per tenant. Exceeding limits returns HTTP 429 Too Many Requests.`
  }
];

export const TokenSaverView: React.FC<TokenSaverViewProps> = ({ onUseInChat }) => {
  const [inputText, setInputText] = useState(PRESETS[0].text);
  const [mode, setMode] = useState<TokenSaverMode>('balanced');
  const [preserveCode, setPreserveCode] = useState(true);
  const [redactSensitive, setRedactSensitive] = useState(true);
  const [budget, setBudget] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompressResponse | null>(null);
  const [analytics, setAnalytics] = useState<TokenAnalyticsResponse | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    loadAnalytics();
    handleCompress();
  }, []);

  const loadAnalytics = async () => {
    try {
      const data = await api.getTokenAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCompress = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    try {
      const resp = await api.compressContext({
        text: inputText,
        mode: mode,
        preserve_code: preserveCode,
        redact_sensitive: redactSensitive,
        target_token_budget: budget && budget > 0 ? budget : undefined,
      });
      setResult(resp);
      loadAnalytics();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.compressed_text);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 border border-sky-800/40 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 bg-sky-500/20 text-sky-400 border border-sky-400/30 rounded-xl text-2xl">⚡</span>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Token Saver & Context Compression Studio</h1>
                <p className="text-sm text-slate-400 mt-1">
                  Intelligent information classification: preserves critical code, constraints & facts while stripping up to 85% of redundant context tokens.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Compression Engine Active
            </span>
          </div>
        </div>

        {/* Real-time Telemetry Stats */}
        {analytics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-400">Total Tokens Saved</div>
              <div className="text-xl font-bold text-sky-400 mt-1">{analytics.total_saved_tokens.toLocaleString()}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-400">Average Savings Ratio</div>
              <div className="text-xl font-bold text-emerald-400 mt-1">{(analytics.avg_compression_ratio * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-400">Total Est. Cost Saved</div>
              <div className="text-xl font-bold text-amber-400 mt-1">${analytics.total_cost_saved_usd.toFixed(4)}</div>
            </div>
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
              <div className="text-xs font-medium text-slate-400">Verification Cache Hits</div>
              <div className="text-xl font-bold text-purple-400 mt-1">
                {analytics.cache_hits} <span className="text-xs text-slate-400 font-normal">({(analytics.cache_hit_rate * 100).toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Preset Selectors */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
        {PRESETS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setInputText(p.text);
              setTimeout(handleCompress, 50);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-colors"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Configuration Controls Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        {/* Mode Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Mode:</span>
          {(['balanced', 'aggressive', 'compact', 'lossless'] as TokenSaverMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setTimeout(handleCompress, 50);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                mode === m
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {m === 'balanced' && '⚖️ Balanced (~50%)'}
              {m === 'aggressive' && '🔥 Aggressive (~70%)'}
              {m === 'compact' && '⚡ Compact Caveman (~80%)'}
              {m === 'lossless' && '🛡️ Lossless (~25%)'}
            </button>
          ))}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-5 text-xs text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={preserveCode}
              onChange={(e) => {
                setPreserveCode(e.target.checked);
                setTimeout(handleCompress, 50);
              }}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <span>Preserve Code Blocks</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={redactSensitive}
              onChange={(e) => {
                setRedactSensitive(e.target.checked);
                setTimeout(handleCompress, 50);
              }}
              className="rounded bg-slate-800 border-slate-700 text-sky-500 focus:ring-sky-500"
            />
            <span>Redact API Keys / PII</span>
          </label>

          <button
            onClick={handleCompress}
            disabled={isLoading}
            className="px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-semibold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            {isLoading ? 'Compressing...' : '⚡ Re-compress'}
          </button>
        </div>
      </div>

      {/* Editor & Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Original Prompt Input */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-slate-500"></span>
              Original Prompt / Context
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
              {result ? result.original_tokens : Math.max(1, Math.floor(inputText.length / 3.8))} tokens
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={14}
            placeholder="Type or paste context, conversational logs, or complex system prompts..."
            className="w-full flex-1 p-4 bg-transparent text-slate-200 text-sm font-mono leading-relaxed resize-none focus:outline-none"
          />
        </div>

        {/* Right: Compressed Output */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col">
          <div className="bg-slate-950/80 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Compressed High-Density Context
            </span>
            {result && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {result.compressed_tokens} tokens (-{Math.round(result.compression_ratio * 100)}%)
                </span>
                <button
                  onClick={handleCopy}
                  className="px-2.5 py-1 text-xs font-medium rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                >
                  {copyFeedback ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            )}
          </div>
          <div className="p-4 flex-1 bg-slate-950/30 overflow-y-auto max-h-[380px]">
            {isLoading ? (
              <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
                Optimizing tokens and filtering fluff...
              </div>
            ) : result ? (
              <pre className="text-sm font-mono text-slate-200 whitespace-pre-wrap leading-relaxed">
                {result.compressed_text}
              </pre>
            ) : (
              <div className="text-slate-500 text-sm italic">Click Compress to generate high-density output.</div>
            )}
          </div>

          {/* Action Footer */}
          {result && onUseInChat && (
            <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => onUseInChat(result.compressed_text)}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
              >
                Insert into TrustGuard Chat ↗
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metrics & Retained Facts Banner */}
      {result && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Compression Impact Breakdown</h3>
            <span className="text-xs text-slate-400 font-mono">Processed in {result.processing_time_ms}ms</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Tokens Eliminated</div>
              <div className="text-lg font-bold text-emerald-400 mt-0.5">{result.saved_tokens} tokens</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Savings Percentage</div>
              <div className="text-lg font-bold text-sky-400 mt-0.5">{(result.compression_ratio * 100).toFixed(1)}%</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Est. Request Cost Saved</div>
              <div className="text-lg font-bold text-amber-400 mt-0.5">${result.estimated_cost_saved_usd.toFixed(6)}</div>
            </div>
            <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
              <div className="text-xs text-slate-400">Redacted Secret Tokens</div>
              <div className="text-lg font-bold text-rose-400 mt-0.5">{result.redacted_items_count} items</div>
            </div>
          </div>

          {result.critical_facts_retained && result.critical_facts_retained.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                Retained High-Priority Constraints & Facts:
              </div>
              <div className="flex flex-wrap gap-2">
                {result.critical_facts_retained.map((f, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700/80 font-mono"
                  >
                    ✓ {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
