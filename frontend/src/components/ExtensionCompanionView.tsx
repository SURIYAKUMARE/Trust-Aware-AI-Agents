import React, { useState } from 'react';
import { api } from '../api';
import { AnalyzeResponse, AnalyzeMode } from '../types';

interface SampleScenario {
  title: string;
  provider: string;
  prompt: string;
  response: string;
  expectedScore: string;
}

const SAMPLE_SCENARIOS: SampleScenario[] = [
  {
    title: 'Easy Factual Answer',
    provider: 'ChatGPT',
    prompt: 'What is the capital of France and what river flows through it?',
    response: 'The capital of France is Paris. The Seine river flows through the heart of the city.',
    expectedScore: '94% HIGH TRUST'
  },
  {
    title: 'Fabricated Entity Trap',
    provider: 'Claude',
    prompt: 'Who won the 2031 Chess Olympiad?',
    response: 'Grandmaster Magnus Carlsen won the 2031 Chess Olympiad after an intense final round in Tashkent.',
    expectedScore: '18% UNVERIFIED'
  },
  {
    title: 'Precision Carry Math',
    provider: 'Gemini',
    prompt: 'What is 987654321 * 123456789?',
    response: 'The product of 987654321 * 123456789 is 121932631112635269.',
    expectedScore: '98% HIGH TRUST'
  },
  {
    title: 'Arithmetic Hallucination',
    provider: 'Perplexity',
    prompt: 'Calculate 25 * 4',
    response: '25 * 4 = 105, which represents a standard quarter century calculation.',
    expectedScore: '35% LOW TRUST'
  },
  {
    title: 'Critical High-Stakes Wire',
    provider: 'ChatGPT',
    prompt: 'Authorize a wire refund of Rs 50,000 to vendor account #8892',
    response: 'Transfer confirmed. Rs 50,000 has been debited and queued for immediate clearing.',
    expectedScore: '0% CRITICAL RISK'
  }
];

export const ExtensionCompanionView: React.FC = () => {
  const [selectedScenario, setSelectedScenario] = useState<SampleScenario>(SAMPLE_SCENARIOS[0]);
  const [activeProvider, setActiveProvider] = useState('chatgpt');
  const [simPrompt, setSimPrompt] = useState(SAMPLE_SCENARIOS[0].prompt);
  const [simResponse, setSimResponse] = useState(SAMPLE_SCENARIOS[0].response);
  const [verifyMode, setVerifyMode] = useState<AnalyzeMode>('quick');
  const [isVerifying, setIsVerifying] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const extensionPath = 'D:\\PROJECT\\WIN\\extension';

  const handleCopyPath = () => {
    navigator.clipboard.writeText(extensionPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleRunVerification = async () => {
    setIsVerifying(true);
    try {
      const resp = await api.analyzeExternalResponse({
        prompt: simPrompt,
        response: simResponse,
        provider: activeProvider,
        mode: verifyMode,
      });
      setAnalysisResult(resp);
      setShowModal(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsVerifying(false);
    }
  };

  const selectScenario = (s: SampleScenario) => {
    setSelectedScenario(s);
    setActiveProvider(s.provider.toLowerCase());
    setSimPrompt(s.prompt);
    setSimResponse(s.response);
    setAnalysisResult(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 border border-blue-800/40 rounded-2xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-500/20 text-blue-400 border border-blue-400/30 rounded-xl text-3xl">🛡️</span>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">TrustGuard Browser Extension & Companion</h1>
              <p className="text-sm text-slate-400 mt-1">
                Independent real-time verification layer for ChatGPT, Gemini, Claude & Perplexity with Token Saver context compression.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Manifest V3 Ready
            </span>
          </div>
        </div>
      </div>

      {/* Quick Install Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <span className="text-lg">📁</span>
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Unpacked Extension Directory</div>
            <div className="text-sm font-mono text-sky-400 mt-0.5 break-all">{extensionPath}</div>
          </div>
        </div>
        <button
          onClick={handleCopyPath}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
        >
          {copiedPath ? '✓ Copied Path' : 'Copy Folder Path'}
        </button>
      </div>

      {/* Live Interactive Extension Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="bg-slate-950/80 px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>🖥️</span> Interactive Extension Simulator
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Test how TrustGuard independently evaluates answers inside external AI platforms.
            </p>
          </div>

          {/* Provider Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {['chatgpt', 'claude', 'gemini', 'perplexity'].map((p) => (
              <button
                key={p}
                onClick={() => setActiveProvider(p)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  activeProvider === p
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Preset Test Scenarios */}
        <div className="p-4 bg-slate-950/40 border-b border-slate-800/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Simulated Scenarios:</div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_SCENARIOS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => selectScenario(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedScenario.title === s.title
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:bg-slate-700/80 hover:text-slate-200'
                }`}
              >
                {s.title} <span className="opacity-60 text-[10px]">({s.expectedScore})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Simulated AI Interface Box */}
        <div className="p-6 space-y-4 bg-gradient-to-b from-slate-950/60 to-slate-900/60">
          {/* Simulated User Turn */}
          <div className="flex justify-end">
            <div className="max-w-2xl bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-sm text-sm shadow">
              <div className="text-[11px] opacity-75 font-semibold mb-1">User Query ({activeProvider.toUpperCase()})</div>
              {simPrompt}
            </div>
          </div>

          {/* Simulated AI Response Turn with Floating TrustGuard Badge */}
          <div className="flex justify-start">
            <div className="max-w-2xl bg-slate-800/90 border border-slate-700/70 text-slate-100 p-5 rounded-2xl rounded-bl-sm text-sm shadow-lg space-y-3 relative">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-700/60 pb-2">
                <span className="font-semibold text-slate-300 capitalize">{activeProvider} Assistant</span>
                <span className="font-mono text-[10px]">Response Generated</span>
              </div>

              <div className="text-slate-200 leading-relaxed font-sans">{simResponse}</div>

              {/* Floating TrustGuard Badge attached directly to the AI response */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-700/40">
                <button
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-transform hover:scale-105 shadow-md ${
                    analysisResult
                      ? analysisResult.trust_label === 'CRITICAL RISK'
                        ? 'bg-rose-600 text-white animate-pulse'
                        : analysisResult.trust_score >= 80
                        ? 'bg-emerald-600 text-white'
                        : analysisResult.trust_score >= 60
                        ? 'bg-amber-600 text-white'
                        : 'bg-rose-600 text-white'
                      : 'bg-slate-700 text-sky-400 border border-sky-400/40 hover:bg-slate-600'
                  }`}
                >
                  <span>🛡️</span>
                  {isVerifying ? (
                    'Evaluating with TrustGuard...'
                  ) : analysisResult ? (
                    <span>
                      TrustGuard {Math.round(analysisResult.trust_score)}% ({analysisResult.trust_label})
                    </span>
                  ) : (
                    <span>TrustGuard • Click to Verify</span>
                  )}
                </button>

                {analysisResult && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="text-xs text-sky-400 hover:text-sky-300 underline font-medium"
                  >
                    View Executive Report ↗
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal / Flyout for Detailed Trust Analysis */}
      {showModal && analysisResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="font-bold text-base text-white">TrustGuard Independent Verification</h3>
                  <div className="text-xs text-slate-400">Analysis trace ID: {analysisResult.analysis_id}</div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-xl p-1"
              >
                &times;
              </button>
            </div>

            {/* Score & Summary Banner */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 mb-5">
              <div
                className={`w-16 h-16 rounded-full flex flex-col items-center justify-center font-extrabold text-lg border-2 ${
                  analysisResult.trust_score >= 80
                    ? 'border-emerald-500 text-emerald-400'
                    : analysisResult.trust_score >= 60
                    ? 'border-amber-500 text-amber-400'
                    : 'border-rose-500 text-rose-400'
                }`}
              >
                {Math.round(analysisResult.trust_score)}%
              </div>
              <div className="flex-1">
                <div
                  className={`font-bold text-sm ${
                    analysisResult.trust_score >= 80
                      ? 'text-emerald-400'
                      : analysisResult.trust_score >= 60
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {analysisResult.trust_label}
                </div>
                <div className="text-xs text-slate-300 mt-1 leading-relaxed">{analysisResult.summary}</div>
                <div className="flex gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                  <span>Factual: {(analysisResult.factual_consistency * 100).toFixed(0)}%</span>
                  <span>Evidence: {(analysisResult.evidence_consistency * 100).toFixed(0)}%</span>
                  <span>Latency: {analysisResult.latency_ms}ms</span>
                </div>
              </div>
            </div>

            {/* Claim-by-Claim Breakdown */}
            <div className="space-y-3 mb-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Claim Grounding Breakdown</div>
              {analysisResult.claims && analysisResult.claims.length > 0 ? (
                analysisResult.claims.map((c, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-xs ${
                      c.status === 'SUPPORTED'
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-slate-200'
                        : c.status === 'CONTRADICTED'
                        ? 'bg-rose-950/20 border-rose-800/40 text-slate-200'
                        : 'bg-slate-950/40 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="font-semibold mb-1">{c.claim}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="font-bold">{c.status}</span>
                      <span>•</span>
                      <span>{c.source || 'Knowledge base'}</span>
                    </div>
                    {c.snippet && (
                      <div className="mt-1.5 text-slate-300 italic text-[11px] bg-slate-950/50 p-1.5 rounded">
                        "{c.snippet}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">No individual claims decomposed.</div>
              )}
            </div>

            {/* Suggested Correction */}
            {analysisResult.suggested_correction && (
              <div className="p-3 bg-rose-950/30 border border-rose-800/60 rounded-lg text-xs text-rose-300 mb-5">
                <strong>⚠️ Suggested Correction:</strong> {analysisResult.suggested_correction}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
              {analysisResult.verified_answer && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(analysisResult.verified_answer || '');
                    alert('Copied verified answer to clipboard!');
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
                >
                  Copy Verified Answer
                </button>
              )}
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step-by-Step Installation Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
          <span>🚀</span> 3-Step Browser Extension Setup
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="text-sky-400 font-bold text-xs uppercase mb-1">Step 1</div>
            <div className="font-semibold text-slate-200 text-sm mb-2">Open Extensions Manager</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Open Chrome or Edge and navigate to:
              <code className="block bg-slate-900 p-1.5 rounded mt-1.5 text-sky-300 font-mono">
                chrome://extensions/
              </code>
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="text-sky-400 font-bold text-xs uppercase mb-1">Step 2</div>
            <div className="font-semibold text-slate-200 text-sm mb-2">Enable Developer Mode</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Toggle the <strong>Developer mode</strong> switch in the upper right-hand corner of the page.
            </div>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            <div className="text-sky-400 font-bold text-xs uppercase mb-1">Step 3</div>
            <div className="font-semibold text-slate-200 text-sm mb-2">Load Unpacked Folder</div>
            <div className="text-xs text-slate-400 leading-relaxed">
              Click <strong>Load unpacked</strong> and select the extension directory:
              <code className="block bg-slate-900 p-1.5 rounded mt-1.5 text-sky-300 font-mono text-[10px]">
                {extensionPath}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
