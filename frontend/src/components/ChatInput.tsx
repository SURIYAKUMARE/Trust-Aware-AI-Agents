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
  Image, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string, files?: UploadedFile[]) => void;
  onStop?: () => void;
  isLoading: boolean;
  placeholder?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onStop,
  isLoading,
  placeholder = 'Ask TrustGuard AI anything...',
}) => {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea as user types
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 180)}px`;
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
      className={`relative w-full max-w-4xl mx-auto rounded-2xl transition-all ${
        isDragging
          ? 'ring-2 ring-blue-500 bg-blue-950/20'
          : 'bg-slate-900/90 border border-slate-800 focus-within:border-blue-500/60 shadow-xl'
      }`}
    >
      {/* File Upload Preview Chips */}
      {files.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 pb-1 border-b border-slate-800/80">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-mono shadow-sm"
            >
              {file.type.startsWith('image/') ? (
                <Image className="w-3.5 h-3.5 text-blue-400" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="truncate max-w-[140px] text-[11px] font-medium">{file.name}</span>
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

      {/* Main Textarea */}
      <div className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 max-h-48 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed py-1 px-1 scrollbar-thin"
        />

        {/* Input Tools & Send Action */}
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
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
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition-all cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() && files.length === 0}
              title="Send Message (Enter)"
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition-all shadow-md shadow-blue-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Footer Info / Token awareness */}
      <div className="px-3 pb-2 flex items-center justify-between text-[10px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span>Shift + Enter for new line</span>
          {files.length > 0 && <span>• {files.length} document(s) attached</span>}
        </div>
        {charCount > 0 && (
          <div>
            <span>{charCount} chars</span>
            <span className="mx-1">•</span>
            <span>~{approxTokens} tokens</span>
          </div>
        )}
      </div>
    </div>
  );
};
