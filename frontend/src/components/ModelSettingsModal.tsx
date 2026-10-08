import React, { useState, useEffect } from 'react';
import { 
  X, 
  Key, 
  Server, 
  Sparkles, 
  Cpu, 
  ShieldCheck, 
  Check, 
  ExternalLink,
  Eye,
  EyeOff,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { 
  getStoredModelSettings, 
  saveModelSettings, 
  ModelSettings 
} from '../services/clientAgent';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [provider, setProvider] = useState<'auto' | 'builtin' | 'groq' | 'gemini' | 'openai'>('builtin');
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [customBackendUrl, setCustomBackendUrl] = useState('');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const s = getStoredModelSettings();
      setProvider((s.provider as any) || 'builtin');
      setGroqKey(s.groqKey || '');
      setGeminiKey(s.geminiKey || '');
      setOpenaiKey(s.openaiKey || '');
      setCustomBackendUrl(s.customBackendUrl || '');
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const newSettings: ModelSettings = {
      provider,
      groqKey: groqKey.trim() || undefined,
      geminiKey: geminiKey.trim() || undefined,
      openaiKey: openaiKey.trim() || undefined,
      customBackendUrl: customBackendUrl.trim() || undefined,
    };
    saveModelSettings(newSettings);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      if (onSave) onSave();
      onClose();
    }, 600);
  };

  const handleClear = () => {
    saveModelSettings({ provider: 'builtin' });
    setProvider('builtin');
    setGroqKey('');
    setGeminiKey('');
    setOpenaiKey('');
    setCustomBackendUrl('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 border border-blue-500/30 rounded-xl text-blue-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                AI Model & Provider Settings
              </h3>
              <p className="text-xs text-slate-400">
                Choose the LLM engine powering TrustAgent's responses & reasoning
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Provider Cards */}
        <div className="space-y-4 py-5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            Select Active AI Engine
          </label>

          {/* Option 1: Built-in Enterprise TrustEngine */}
          <div
            onClick={() => setProvider('builtin')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              provider === 'builtin'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Built-in TrustEngine</span>
                    <span className="text-[10px] bg-emerald-950 border border-emerald-500/30 text-emerald-300 font-mono px-2 py-0.5 rounded-full font-semibold">
                      Zero Setup / Free
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Instant in-browser AI engine with multi-domain knowledge (coding, science, math, chat), 4-signal confidence estimation, and claim verification.
                  </p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                provider === 'builtin' ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700'
              }`}>
                {provider === 'builtin' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>
          </div>

          {/* Option: Groq (Llama 3.3 70B - Ultra Fast & Free API) */}
          <div
            onClick={() => setProvider('groq')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              provider === 'groq'
                ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-950/60 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Groq — Llama 3.3 70B</span>
                    <span className="text-[10px] bg-amber-950 border border-amber-500/30 text-amber-300 font-mono px-2 py-0.5 rounded-full font-semibold">
                      Fastest • Free Tier Available
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    ChatGPT-grade reasoning powered by Meta's Llama 3.3 70B running on Groq LPU inference (&gt;300 tokens/sec).
                  </p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                provider === 'groq' ? 'border-amber-500 bg-amber-600 text-white' : 'border-slate-700'
              }`}>
                {provider === 'groq' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {provider === 'groq' && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    Groq API Key:
                  </span>
                  <a
                    href="https://console.groq.com/keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Get free key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showGroqKey ? 'text' : 'password'}
                    value={groqKey}
                    onChange={(e) => setGroqKey(e.target.value)}
                    placeholder="gsk_..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGroqKey(!showGroqKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 2: Google Gemini 2.0 Flash */}
          <div
            onClick={() => setProvider('gemini')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              provider === 'gemini'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-950/60 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">Google Gemini 2.0 Flash</span>
                    <span className="text-[10px] bg-blue-950 border border-blue-500/30 text-blue-300 font-mono px-2 py-0.5 rounded-full font-semibold">
                      Live Frontier LLM
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect directly to Google's multi-modal Gemini model for live web answers, complex reasoning, and coding assistance.
                  </p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                provider === 'gemini' ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700'
              }`}>
                {provider === 'gemini' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {provider === 'gemini' && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-400" />
                    Gemini API Key:
                  </span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Get free key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showGeminiKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={(e) => setGeminiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 3: OpenAI GPT-4o */}
          <div
            onClick={() => setProvider('openai')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              provider === 'openai'
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-500/10'
                : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-950/60 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">OpenAI GPT-4o</span>
                    <span className="text-[10px] bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-mono px-2 py-0.5 rounded-full font-semibold">
                      OpenAI API
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Connect directly to OpenAI's flagship conversational reasoning models.
                  </p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                provider === 'openai' ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-700'
              }`}>
                {provider === 'openai' && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </div>

            {provider === 'openai' && (
              <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-400" />
                    OpenAI API Key:
                  </span>
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <span>Get OpenAI key</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showOpenaiKey ? 'text' : 'password'}
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Option 4: Custom Remote Backend Server */}
          <div className="p-4 rounded-xl border bg-slate-950/30 border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" />
                Custom Backend URL (Optional):
              </span>
              <span className="text-[11px] text-slate-500 font-mono">e.g. http://localhost:8000</span>
            </div>
            <input
              type="text"
              value={customBackendUrl}
              onChange={(e) => setCustomBackendUrl(e.target.value)}
              placeholder="Leave empty to use automatic Vercel fallback"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          {/* Security & Privacy note */}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              Your API keys are stored solely in your local browser storage (<code className="text-blue-300">localStorage</code>) and are sent directly to the model provider via HTTPS. They are never sent to third-party tracking servers.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-300 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md ${
                savedSuccess
                  ? 'bg-emerald-600 shadow-emerald-500/20'
                  : 'bg-blue-600 hover:bg-blue-500 shadow-blue-500/20'
              }`}
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Configuration</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
