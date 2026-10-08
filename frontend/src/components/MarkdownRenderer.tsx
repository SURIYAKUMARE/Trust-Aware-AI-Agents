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

        // Render standard text with paragraphs, headings, bullet lists, tables, math
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
        if (!trimmed) return <div key={bIdx} className="h-1" />;

        // Math formula blocks: $$...$$
        if (trimmed.startsWith('$$') && trimmed.endsWith('$$') && trimmed.length > 4) {
          return (
            <div key={bIdx} className="my-2.5 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-center text-xs text-purple-300 overflow-x-auto shadow-inner">
              {trimmed.substring(2, trimmed.length - 2)}
            </div>
          );
        }

        // Headings
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={bIdx} className="text-sm font-bold text-white mt-3.5 mb-1.5 flex items-center gap-2">
              {parseInline(trimmed.substring(4))}
            </h3>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={bIdx} className="text-base font-bold text-white mt-4 mb-2">
              {parseInline(trimmed.substring(3))}
            </h2>
          );
        }

        // Bullet lists: •, -, *
        if (trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={bIdx} className="flex items-start gap-2 pl-2">
              <span className="text-blue-400 text-xs mt-1 shrink-0">•</span>
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
            <div key={bIdx} className="flex items-start gap-2 pl-2">
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
            <blockquote key={bIdx} className="border-l-2 border-blue-500 pl-3 py-1 my-1.5 text-slate-400 italic text-xs bg-blue-950/10 rounded-r-lg">
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
  // Check if second line is a separator like | :--- | ---: |
  const isSeparator = /^\|(\s*:?-+:?\s*\|)+$/.test(lines[1]);
  const bodyLines = isSeparator ? lines.slice(2) : lines.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 shadow-md">
      <table className="w-full text-xs text-left text-slate-200 divide-y divide-slate-800">
        <thead className="bg-slate-900/90 text-[11px] font-bold uppercase tracking-wider text-slate-300">
          <tr>
            {headerCells.map((h, i) => (
              <th key={i} className="px-3.5 py-2.5 font-semibold text-slate-200 whitespace-nowrap">
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
                  <td key={cIdx} className="px-3.5 py-2.5 text-slate-300">
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
  // Parse inline `code`, **bold**, *italic*, math $...$, links [text](url)
  const tokens = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\$[^$]+\$|\[[^\]]+\]\([^)]+\))/g);

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
          className="px-1.5 py-0.5 rounded bg-purple-950/40 text-purple-300 font-mono text-xs border border-purple-500/20"
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
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors inline-flex items-center gap-0.5"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return token;
  });
}
