import React, { useState } from 'react';
import { Copy, Check, Download, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  // Split content by code blocks: ```lang ... ```
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 text-slate-200 leading-relaxed text-sm">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n');
          let lang = 'code';
          let code = '';
          if (firstLineEnd !== -1) {
            lang = part.substring(3, firstLineEnd).trim() || 'code';
            code = part.substring(firstLineEnd + 1, part.length - 3);
          } else {
            code = part.substring(3, part.length - 3);
          }
          return <CodeBlock key={index} code={code} lang={lang} />;
        }

        // Render standard text with paragraphs, headings, bullet lists, math
        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const extensionMap: Record<string, string> = {
      python: 'py', py: 'py',
      typescript: 'ts', ts: 'ts',
      javascript: 'js', js: 'js',
      html: 'html', css: 'css',
      json: 'json', sql: 'sql',
      sh: 'sh', bash: 'sh',
      markdown: 'md', md: 'md',
    };
    const ext = extensionMap[lang.toLowerCase()] || 'txt';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustguard_snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 font-mono text-xs shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 border-b border-slate-800 text-slate-400">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
          <Terminal className="w-3 h-3 text-blue-400" />
          <span>{lang}</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            title="Download code file"
            className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            onClick={handleCopy}
            title="Copy code to clipboard"
            className="flex items-center gap-1 text-[11px] hover:text-white transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="p-3.5 overflow-x-auto text-slate-200 text-xs leading-relaxed selection:bg-blue-600">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-1.5">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Math formula blocks: $$...$$
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
          return (
            <div key={idx} className="my-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-center text-xs text-purple-300 overflow-x-auto">
              {trimmed.substring(2, trimmed.length - 2)}
            </div>
          );
        }

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1">
              {parseInline(trimmed.substring(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-base font-bold text-white mt-3 mb-1">
              {parseInline(trimmed.substring(3))}
            </h2>
          );
        }

        // Bullet lists
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-400 text-xs mt-1">•</span>
              <span className="text-slate-300 text-sm leading-relaxed">
                {parseInline(trimmed.substring(2))}
              </span>
            </div>
          );
        }

        // Numbered lists: 1. 2.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-400 font-mono text-xs mt-0.5">{numMatch[1]}.</span>
              <span className="text-slate-300 text-sm leading-relaxed">
                {parseInline(numMatch[2])}
              </span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-2 border-blue-500 pl-3 py-1 my-1 text-slate-400 italic text-xs">
              {parseInline(trimmed.substring(2))}
            </blockquote>
          );
        }

        return (
          <p key={idx} className="text-slate-200 text-sm leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};

function parseInline(text: string): React.ReactNode[] {
  // Parse inline `code`, **bold**, *italic*, math $...$
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\$[^$]+\$)/g);

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-blue-300 font-mono text-xs"
        >
          {token.substring(1, token.length - 1)}
        </code>
      );
    }
    if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      return (
        <span
          key={i}
          className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 font-mono text-xs"
        >
          {token.substring(1, token.length - 1)}
        </span>
      );
    }
    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      return (
        <strong key={i} className="font-bold text-white">
          {token.substring(2, token.length - 2)}
        </strong>
      );
    }
    if (token.startsWith('*') && token.endsWith('*') && token.length > 2) {
      return (
        <em key={i} className="italic text-slate-300">
          {token.substring(1, token.length - 1)}
        </em>
      );
    }
    return token;
  });
}
