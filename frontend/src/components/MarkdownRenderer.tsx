import React, { useState } from 'react';
import { Copy, Check, Download, Terminal, Hash } from 'lucide-react';

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

        // Render standard text with paragraphs, headings, bullet lists, tables, math
        return <FormattedText key={index} text={part} />;
      })}
    </div>
  );
};

const KEYWORDS = new Set([
  'import', 'from', 'export', 'default', 'as', 'def', 'class', 'function', 'return',
  'const', 'let', 'var', 'if', 'else', 'elif', 'for', 'while', 'in', 'of', 'try',
  'except', 'catch', 'finally', 'raise', 'throw', 'new', 'async', 'await', 'yield',
  'break', 'continue', 'pass', 'lambda', 'with', 'global', 'nonlocal', 'assert',
  'type', 'interface', 'implements', 'extends', 'public', 'private', 'protected',
  'static', 'readonly', 'enum', 'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE',
  'DELETE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'GROUP', 'BY', 'ORDER', 'HAVING',
  'LIMIT', 'CREATE', 'TABLE', 'DROP', 'ALTER', 'AND', 'OR', 'NOT', 'NULL', 'TRUE', 'FALSE'
]);

const LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'None', 'True', 'False', 'nil', 'NaN', 'Infinity'
]);

function highlightCodeLine(line: string): React.ReactNode {
  // Comment line check
  const trimmed = line.trimStart();
  if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  // Tokenize line into words, strings, numbers, punctuation
  const tokenRegex = /("[^"]*"|'[^']*'|`[^`]*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[^\sA-Za-z0-9_"'`]+|\s+)/g;
  const matches = line.match(tokenRegex) || [line];

  return matches.map((token, idx) => {
    // Strings
    if ((token.startsWith('"') && token.endsWith('"')) ||
        (token.startsWith("'") && token.endsWith("'")) ||
        (token.startsWith('`') && token.endsWith('`'))) {
      return <span key={idx} className="text-emerald-300">{token}</span>;
    }
    // Numbers
    if (/^\d+(?:\.\d+)?$/.test(token)) {
      return <span key={idx} className="text-amber-300 font-mono">{token}</span>;
    }
    // Literals (true, false, null, None)
    if (LITERALS.has(token)) {
      return <span key={idx} className="text-rose-400 font-semibold">{token}</span>;
    }
    // Keywords
    if (KEYWORDS.has(token) || KEYWORDS.has(token.toUpperCase())) {
      return <span key={idx} className="text-sky-400 font-semibold">{token}</span>;
    }
    return <span key={idx}>{token}</span>;
  });
}

const CodeBlock: React.FC<{ code: string; lang: string }> = ({ code, lang }) => {
  const [copied, setCopied] = useState(false);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const cleanCode = code.replace(/\r\n/g, '\n').replace(/^\n+|\n+$/g, '');
  const lines = cleanCode.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
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
    const blob = new Blob([cleanCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trustguard_snippet.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="my-3.5 rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-950 font-mono text-xs shadow-xl transition-all">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800 text-slate-400 select-none">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400 ml-2 flex items-center gap-1.5 font-mono">
            <Terminal className="w-3.5 h-3.5 text-sky-400" />
            <span>{lang || 'code'}</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
            ({lines.length} {lines.length === 1 ? 'line' : 'lines'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            title="Toggle line numbers"
            className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded transition-colors cursor-pointer ${
              showLineNumbers ? 'text-slate-300 bg-slate-800' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Hash className="w-3 h-3" />
            <span className="hidden sm:inline">Lines</span>
          </button>

          <button
            onClick={handleDownload}
            title="Download code snippet"
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white px-2 py-0.5 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>

          <button
            onClick={handleCopy}
            title="Copy code to clipboard"
            className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 transition-all cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code Body */}
      <pre className="p-4 overflow-x-auto text-slate-200 text-xs leading-relaxed selection:bg-blue-600/40">
        <code>
          {lines.map((line, lIdx) => (
            <div key={lIdx} className="table-row">
              {showLineNumbers && (
                <span className="table-cell select-none pr-4 text-right text-slate-600 font-mono text-[11px] w-8">
                  {lIdx + 1}
                </span>
              )}
              <span className="table-cell whitespace-pre">
                {highlightCodeLine(line)}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
};

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  const rawLines = text.split('\n');

  // Group lines into blocks (tables or standard lines)
  interface Block {
    type: 'table' | 'line';
    content: string[];
  }

  const blocks: Block[] = [];
  let currentTable: string[] = [];

  for (const line of rawLines) {
    const trimmed = line.trim();
    const isTableLine = trimmed.startsWith('|') && trimmed.endsWith('|');

    if (isTableLine) {
      currentTable.push(trimmed);
    } else {
      if (currentTable.length > 0) {
        blocks.push({ type: 'table', content: currentTable });
        currentTable = [];
      }
      blocks.push({ type: 'line', content: [line] });
    }
  }

  if (currentTable.length > 0) {
    blocks.push({ type: 'table', content: currentTable });
  }

  return (
    <div className="space-y-1.5">
      {blocks.map((block, bIdx) => {
        if (block.type === 'table') {
          return <TableBlock key={bIdx} lines={block.content} />;
        }

        const line = block.content[0];
        const trimmed = line.trim();
        if (!trimmed) return <div key={bIdx} className="h-1.5" />;

        // Horizontal Rule
        if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
          return <hr key={bIdx} className="my-3 border-slate-800" />;
        }

        // Math formula blocks: $$...$$
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
          return (
            <div key={bIdx} className="my-3 p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-center text-xs text-purple-300 overflow-x-auto shadow-inner">
              {trimmed.substring(2, trimmed.length - 2)}
            </div>
          );
        }

        // Headings
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={bIdx} className="text-lg font-bold text-white mt-4 mb-2 tracking-tight flex items-center gap-2">
              {parseInline(trimmed.substring(2))}
            </h1>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={bIdx} className="text-base font-bold text-white mt-3.5 mb-2 tracking-tight">
              {parseInline(trimmed.substring(3))}
            </h2>
          );
        }
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={bIdx} className="text-sm font-bold text-slate-100 mt-3 mb-1.5 flex items-center gap-2">
              {parseInline(trimmed.substring(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('#### ')) {
          return (
            <h4 key={bIdx} className="text-xs font-bold text-slate-300 mt-2.5 mb-1 uppercase tracking-wider">
              {parseInline(trimmed.substring(5))}
            </h4>
          );
        }

        // Checklist items: - [ ] or - [x]
        const checkMatch = trimmed.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
        if (checkMatch) {
          const isChecked = checkMatch[1].toLowerCase() === 'x';
          return (
            <div key={bIdx} className="flex items-center gap-2.5 pl-2 py-0.5">
              <input
                type="checkbox"
                checked={isChecked}
                readOnly
                className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-900 text-blue-600 focus:ring-0 cursor-default"
              />
              <span className={`text-sm ${isChecked ? 'line-through text-slate-500' : 'text-slate-300'}`}>
                {parseInline(checkMatch[2])}
              </span>
            </div>
          );
        }

        // Bullet lists: •, -, *
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={bIdx} className="flex items-start gap-2.5 pl-2 py-0.5">
              <span className="text-blue-400 text-xs mt-1 shrink-0 font-bold">•</span>
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
            <div key={bIdx} className="flex items-start gap-2.5 pl-2 py-0.5">
              <span className="text-blue-400 font-mono text-xs mt-0.5 shrink-0 font-bold">{numMatch[1]}.</span>
              <span className="text-slate-300 text-sm leading-relaxed">
                {parseInline(numMatch[2])}
              </span>
            </div>
          );
        }

        // Blockquotes
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={bIdx} className="border-l-2 border-blue-500 pl-3.5 py-1.5 my-2 text-slate-300 italic text-xs bg-blue-950/20 rounded-r-xl border border-r-0 border-t-0 border-b-0 border-blue-500/30">
              {parseInline(trimmed.substring(2))}
            </blockquote>
          );
        }

        return (
          <p key={bIdx} className="text-slate-200 text-sm leading-relaxed">
            {parseInline(line)}
          </p>
        );
      })}
    </div>
  );
};

const TableBlock: React.FC<{ lines: string[] }> = ({ lines }) => {
  if (lines.length < 2) return null;

  const parseRow = (rowStr: string): string[] => {
    return rowStr
      .split('|')
      .slice(1, -1)
      .map(cell => cell.trim());
  };

  const headerCells = parseRow(lines[0]);
  const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(lines[1]);
  const bodyLines = isSeparator ? lines.slice(2) : lines.slice(1);

  return (
    <div className="my-3.5 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950 shadow-md">
      <table className="w-full text-xs text-left text-slate-200 divide-y divide-slate-800">
        <thead className="bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          <tr>
            {headerCells.map((h, i) => (
              <th key={i} className="px-4 py-3 font-semibold text-slate-200 whitespace-nowrap">
                {parseInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 font-sans">
          {bodyLines.map((rowStr, rIdx) => {
            const cells = parseRow(rowStr);
            return (
              <tr
                key={rIdx}
                className={rIdx % 2 === 0 ? 'bg-transparent hover:bg-slate-900/50 transition-colors' : 'bg-slate-900/25 hover:bg-slate-900/50 transition-colors'}
              >
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5 text-slate-300">
                    {parseInline(cell)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

function parseInline(text: string): React.ReactNode[] {
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\$[^$]+\$|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, i) => {
    if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-sky-300 font-mono text-xs font-medium"
        >
          {token.substring(1, token.length - 1)}
        </code>
      );
    }
    if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      return (
        <span
          key={i}
          className="px-1.5 py-0.5 rounded-md bg-purple-950/40 text-purple-300 font-mono text-xs border border-purple-500/20"
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
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5 font-medium"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return token;
  });
}
