import React, { useState, useRef, useEffect } from 'react';
import { UploadedFile } from '../types';
import { 
  Send, 
  Square, 
  Paperclip, 
  Mic, 
  MicOff, 
  X, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Zap,
  ScanFace
} from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, files?: UploadedFile[]) => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
  isCavemanMode?: boolean;
  onToggleCavemanMode?: (enabled: boolean) => void;
  onNavigateToImageForensics?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isLoading,
  placeholder = 'Ask TrustGuard AI anything (coding, math, science, research, advice)...',
  isCavemanMode = false,
  onToggleCavemanMode,
  onNavigateToImageForensics,
}) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [text]);

  // Speech-to-Text Setup via Web Speech API
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText(prev => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.onerror = () => {
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.error('Speech recognition error:', e);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && files.length === 0) || isLoading) return;
    const sentText = text.trim();
    const sentFiles = [...files];
    setText('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSend(sentText, sentFiles.length > 0 ? sentFiles : undefined);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles) return;
    processFiles(Array.from(selectedFiles));
  };

  const processFiles = (fileList: File[]) => {
    for (const f of fileList) {
      const id = `file-${Math.random().toString(36).substring(2, 9)}`;
      const reader = new FileReader();

      const newUploadedFile: UploadedFile = {
        id,
        name: f.name,
        size: f.size,
        type: f.type || 'text/plain',
        status: 'uploading',
      };

      setFiles(prev => [...prev, newUploadedFile]);

      reader.onload = () => {
        const content = reader.result as string;
        setFiles(prev => prev.map(item => item.id === id ? {
          ...item,
          content,
          status: 'processed',
          summary: `Extracted ${f.name} (${Math.round(f.size / 1024)} KB) into RAG context.`,
        } : item));
      };

      reader.onerror = () => {
        setFiles(prev => prev.map(item => item.id === id ? {
          ...item,
          status: 'error',
        } : item));
      };

      if (f.type.startsWith('image/')) {
        reader.readAsDataURL(f);
      } else {
        reader.readAsText(f);
      }
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const charCount = text.length;
  const approxTokens = Math.ceil(charCount / 4);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative w-full max-w-4xl mx-auto rounded-3xl transition-all shadow-2xl backdrop-blur-xl ${
        isCavemanMode
          ? 'bg-slate-900/95 border border-amber-500/40 shadow-amber-500/5 focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/10'
          : isDragging
          ? 'ring-2 ring-blue-500 bg-blue-950/30 border-blue-500'
          : 'bg-slate-900/90 border border-slate-800/90 focus-within:border-blue-500/70 focus-within:ring-2 focus-within:ring-blue-500/20'
      }`}
    >
      {/* Caveman Token Saver Active Banner */}
      {isCavemanMode && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-gradient-to-r from-amber-950/60 via-slate-900/60 to-amber-950/60 border-b border-amber-500/30 text-[11px] font-mono text-amber-300 rounded-t-3xl">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="font-bold">Caveman Token Saver Active:</span>
            <span className="text-slate-300 hidden sm:inline">Ultra-dense prompt format reduces tokens by ~80%</span>
          </div>
          <button
            type="button"
            onClick={() => onToggleCavemanMode && onToggleCavemanMode(false)}
            className="text-[10px] text-amber-400 hover:text-white underline cursor-pointer"
          >
            Disable
          </button>
        </div>
      )}

      {/* File Upload Preview Chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 pb-1 border-b border-slate-800/80">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono shadow-sm"
            >
              {file.type.startsWith('image/') ? (
                <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="truncate max-w-[150px] text-[11px] font-medium">{file.name}</span>
              <span className="text-[10px] text-slate-500">({Math.round(file.size / 1024)}KB)</span>
              {file.status === 'processed' ? (
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-3 h-3 text-amber-400 animate-spin shrink-0" />
              )}
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="text-slate-400 hover:text-rose-400 ml-0.5 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Textarea Area */}
      <div className="flex items-end gap-2 p-3.5 sm:p-4">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 max-h-52 bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed py-1 px-1 scrollbar-thin"
        />

        {/* Input Tools & Send Action Bar */}
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          {/* Caveman Mode Toggle Button */}
          <button
            type="button"
            onClick={() => onToggleCavemanMode && onToggleCavemanMode(!isCavemanMode)}
            title={isCavemanMode ? 'Caveman Token Saver is ON (~80% token reduction)' : 'Enable Caveman Token Saver to reduce tokens'}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              isCavemanMode
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${isCavemanMode ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Caveman</span>
            {isCavemanMode ? (
              <span className="text-[10px] text-amber-400 font-sans font-bold">-80%</span>
            ) : null}
          </button>

          {/* Clear text button */}
          {text.trim().length > 0 && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setText('');
                if (textareaRef.current) textareaRef.current.style.height = 'auto';
              }}
              title="Clear input"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Dedicated Image Forensics Button */}
          {onNavigateToImageForensics && (
            <button
              type="button"
              onClick={onNavigateToImageForensics}
              title="Open Fake Image Forensics Studio"
              className="p-2 rounded-xl text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 transition-colors cursor-pointer hidden sm:block"
            >
              <ScanFace className="w-4 h-4" />
            </button>
          )}

          {/* File Upload Trigger */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept=".pdf,.txt,.md,.csv,.json,.py,.ts,.js,.png,.jpg,.jpeg,.webp"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach documents or images (PDF, TXT, CSV, MD, Images)"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Voice Speech-to-Text Button */}
          <button
            type="button"
            onClick={toggleRecording}
            title={isRecording ? 'Stop Recording' : 'Voice Input (Speech-to-Text)'}
            className={`p-2 rounded-xl transition-all cursor-pointer ${
              isRecording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send / Stop Generation Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStop}
              title="Stop Generation"
              className="p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all cursor-pointer shadow-md shadow-rose-600/30 animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() && files.length === 0}
              title="Send Message (Enter)"
              className="p-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white transition-all shadow-lg shadow-blue-600/25 cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Footer Info / Token awareness */}
      <div className="px-4 pb-2.5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline">Use Shift + Enter for new lines</span>
          {files.length > 0 && <span>• {files.length} document(s) in context</span>}
        </div>
        {charCount > 0 && (
          <div className="flex items-center gap-1.5">
            <span>{charCount} chars</span>
            <span className="text-slate-600">•</span>
            {isCavemanMode ? (
              <span className="text-amber-400 font-bold">
                ~{approxTokens} → ~{Math.max(1, Math.round(approxTokens * 0.22))} tokens (-78%)
              </span>
            ) : (
              <span>~{approxTokens} tokens</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
