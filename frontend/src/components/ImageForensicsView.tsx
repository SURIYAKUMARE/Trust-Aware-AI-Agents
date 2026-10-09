import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  ShieldAlert, 
  Eye, 
  Layers, 
  Camera, 
  Cpu, 
  Globe, 
  FileText, 
  RefreshCw, 
  Download, 
  X, 
  CheckCircle2, 
  Info,
  Sliders,
  ScanFace
} from 'lucide-react';
import { ImageAnalysisReport } from '../types';
import { api } from '../api';

export const ImageForensicsView: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>('');
  const [report, setReport] = useState<ImageAnalysisReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'original' | 'heatmap'>('original');
  const [showMetadataDetails, setShowMetadataDetails] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setReport(null);

    // Validate MIME type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrorMessage('Unsupported format. Please upload a JPG, JPEG, PNG, or WEBP image.');
      return;
    }

    // Validate file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 20MB limit.');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    // Calculate dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageDimensions(null);
    setReport(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setErrorMessage(null);

    // Progressive status updates
    setAnalysisProgress('Validating image signature and container headers...');
    const progressTimer1 = setTimeout(() => {
      setAnalysisProgress('Computing 2D-FFT Fourier high-frequency energy & PRNU noise residuals...');
    }, 700);
    const progressTimer2 = setTimeout(() => {
      setAnalysisProgress('Generating Error Level Analysis (ELA @ 95% Q) compression map...');
    }, 1500);
    const progressTimer3 = setTimeout(() => {
      setAnalysisProgress('Auditing facial landmarks, boundary seams, and C2PA Content Credentials...');
    }, 2300);

    try {
      const res = await api.analyzeImage(selectedFile);
      setReport(res);
      setViewMode('original');
    } catch (err: any) {
      console.error('Forensic analysis error:', err);
      setErrorMessage(err.message || 'An error occurred during forensic image analysis.');
    } finally {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      setIsAnalyzing(false);
      setAnalysisProgress('');
    }
  };

  const handleDownloadReport = () => {
    if (!report) return;
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(report, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `trustguard_forensics_${report.analysis_id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const getVerdictStyle = (verdict: string) => {
    if (verdict.includes('Authentic')) return 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300';
    if (verdict.includes('AI generation')) return 'border-purple-500/40 bg-purple-950/40 text-purple-300';
    if (verdict.includes('manipulation') || verdict.includes('splicing') || verdict.includes('deepfake')) {
      return 'border-rose-500/40 bg-rose-950/40 text-rose-300';
    }
    return 'border-amber-500/40 bg-amber-950/40 text-amber-300';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in text-slate-200">
      {/* Title & Introduction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/20">
              <ScanFace className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Fake Image & AI-Generated Image Analyzer
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-Signal Forensic Engine: 2D-FFT Fourier Spectra, ELA Compression Differentials, PRNU Noise Residuals & C2PA Provenance
              </p>
            </div>
          </div>
        </div>

        {report && (
          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>Export Forensic Report (JSON)</span>
          </button>
        )}
      </div>

      {/* Upload & Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Upload & Image Viewer (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {!previewUrl ? (
            /* Drag and drop upload zone */
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-purple-500 bg-purple-950/30 scale-[1.01]' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/60'
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-950/80 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                Drag & drop your image here
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Supported formats: JPG, JPEG, PNG, WEBP (Max 20MB)
              </p>
              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-md shadow-purple-600/20"
              >
                Browse Files
              </button>
            </div>
          ) : (
            /* Selected Image Preview & Controls */
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Image Inspection Canvas
                </span>
                <button
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Remove image and upload another"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* View Switcher (Original vs ELA Heatmap) */}
              {report?.heatmap_data_uri && (
                <div className="flex items-center rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs">
                  <button
                    onClick={() => setViewMode('original')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      viewMode === 'original'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Original Image</span>
                  </button>
                  <button
                    onClick={() => setViewMode('heatmap')}
                    className={`flex-1 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      viewMode === 'heatmap'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Forensic ELA Heatmap</span>
                  </button>
                </div>
              )}

              {/* Image Frame */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-square flex items-center justify-center shadow-inner">
                <img
                  src={viewMode === 'heatmap' && report?.heatmap_data_uri ? report.heatmap_data_uri : previewUrl}
                  alt="Forensic inspection preview"
                  className="w-full h-full object-contain"
                />

                {viewMode === 'heatmap' && (
                  <div className="absolute bottom-2 left-2 right-2 p-2 rounded-xl bg-slate-950/90 backdrop-blur border border-purple-500/30 text-[10px] text-purple-200">
                    <strong>Error Level Analysis (ELA @ 95% Q):</strong> Bright/hot regions show compression differentials from localized editing or splicing.
                  </div>
                )}
              </div>

              {/* File Meta Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 px-1 font-mono">
                <span>{selectedFile?.name}</span>
                <span>
                  {imageDimensions ? `${imageDimensions.width}×${imageDimensions.height} px • ` : ''}
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : ''}
                </span>
              </div>

              {/* Action Buttons */}
              {!report && (
                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/30 transition-all"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{analysisProgress || 'Running Forensic Analysis...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Run Forensic Analysis</span>
                    </>
                  )}
                </button>
              )}

              {report && (
                <button
                  onClick={handleClear}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Analyze Another Image</span>
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Column: Forensic Results Dashboard (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!report ? (
            /* Placeholder / Empty State */
            <div className="rounded-3xl border border-slate-800 bg-slate-900/30 p-12 text-center text-slate-500 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600">
                <Sliders className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-400">
                Awaiting Image for Forensic Audit
              </h3>
              <p className="text-xs max-w-md mx-auto text-slate-500 leading-relaxed">
                Upload a JPEG, PNG, or WEBP image to evaluate 2D Fourier spectral roll-off, 
                sensor noise residuals, localized compression error levels, facial boundaries, 
                and C2PA origin metadata.
              </p>
            </div>
          ) : (
            /* Real Forensic Analysis Report */
            <div className="space-y-6 animate-fade-in">
              {/* Overall Verdict Banner */}
              <div className={`p-5 rounded-3xl border ${getVerdictStyle(report.overall_verdict)} shadow-lg space-y-2`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <ShieldCheck className="w-5 h-5" />
                    <span>Overall Forensic Verdict</span>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[11px] opacity-80">
                    <span>ID: {report.analysis_id}</span>
                    <span>• {report.latency_ms}ms</span>
                  </div>
                </div>
                <h2 className="text-xl font-black tracking-tight text-white">
                  {report.overall_verdict}
                </h2>
                <div className="space-y-1 pt-1">
                  {report.key_findings.map((f, i) => (
                    <p key={i} className="text-xs text-slate-300 flex items-start gap-2">
                      <span className="text-purple-400">•</span>
                      <span>{f}</span>
                    </p>
                  ))}
                </div>
              </div>

              {/* 4 Core Detector Assessment Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. AI-Generation Detector */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      <span>AI-Generation Assessment</span>
                    </div>
                    {report.ai_generation_assessment.score_display && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-950 border border-purple-500/40 text-purple-300">
                        {report.ai_generation_assessment.score_display}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {report.ai_generation_assessment.assessment}
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    {report.ai_generation_assessment.evidence_detected.map((e, idx) => (
                      <li key={idx}>• {e}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/80">
                    <strong>Limitations:</strong> {report.ai_generation_assessment.limitations}
                  </p>
                </div>

                {/* 2. Manipulation & Splicing Detector */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-300">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Manipulation & Splicing</span>
                    </div>
                    {report.manipulation_assessment.score_display && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-blue-950 border border-blue-500/40 text-blue-300">
                        {report.manipulation_assessment.score_display}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {report.manipulation_assessment.assessment}
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    {report.manipulation_assessment.evidence_detected.map((e, idx) => (
                      <li key={idx}>• {e}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/80">
                    <strong>Limitations:</strong> {report.manipulation_assessment.limitations}
                  </p>
                </div>

                {/* 3. Deepfake & Face Manipulation */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <ScanFace className="w-4 h-4 text-amber-400" />
                      <span>Deepfake & Face Seams</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-950 border border-amber-500/40 text-amber-300">
                      {report.deepfake_assessment.score_display || `${report.faces_detected} Faces`}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {report.deepfake_assessment.assessment}
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    {report.deepfake_assessment.evidence_detected.map((e, idx) => (
                      <li key={idx}>• {e}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/80">
                    <strong>Limitations:</strong> {report.deepfake_assessment.limitations}
                  </p>
                </div>

                {/* 4. Provenance & C2PA Credentials */}
                <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>Provenance & Origin</span>
                    </div>
                    {report.provenance_assessment.score_display && (
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-300">
                        {report.provenance_assessment.score_display}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-white">
                    {report.provenance_assessment.assessment}
                  </div>
                  <ul className="text-[11px] text-slate-400 space-y-1">
                    {report.provenance_assessment.evidence_detected.map((e, idx) => (
                      <li key={idx}>• {e}</li>
                    ))}
                  </ul>
                  <p className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-800/80">
                    <strong>Limitations:</strong> {report.provenance_assessment.limitations}
                  </p>
                </div>
              </div>

              {/* Reverse Image Visual Search Result */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                  <Globe className="w-4 h-4 text-sky-400" />
                  <span>Reverse Image & Web Appearance Lookup</span>
                </div>
                <div className="text-xs text-slate-300">
                  <strong>Status:</strong> {report.reverse_search_assessment.assessment}
                </div>
                <ul className="text-[11px] text-slate-400 space-y-1">
                  {report.reverse_search_assessment.evidence_detected.map((e, idx) => (
                    <li key={idx}>• {e}</li>
                  ))}
                </ul>
                <p className="text-[10px] text-slate-500 italic">
                  {report.reverse_search_assessment.limitations}
                </p>
              </div>

              {/* Collapsible Container & Metadata Inspector */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
                <button
                  onClick={() => setShowMetadataDetails(!showMetadataDetails)}
                  className="w-full p-4 flex items-center justify-between text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>Container & Hardware Metadata Payload</span>
                  </div>
                  <span>{showMetadataDetails ? 'Hide' : 'Inspect Technical Details'}</span>
                </button>

                {showMetadataDetails && (
                  <div className="p-4 border-t border-slate-800/80 space-y-3 text-xs font-mono bg-slate-950/60">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-slate-400">
                      <div><strong className="text-slate-300">Format:</strong> {report.metadata.format}</div>
                      <div><strong className="text-slate-300">Resolution:</strong> {report.metadata.width}×{report.metadata.height}</div>
                      <div><strong className="text-slate-300">Aspect:</strong> {report.metadata.aspect_ratio}</div>
                      <div><strong className="text-slate-300">Size:</strong> {report.metadata.file_size_kb} KB</div>
                    </div>

                    {report.metadata.camera_make && (
                      <div className="pt-2 border-t border-slate-800">
                        <strong className="text-slate-300">Camera Device:</strong> {report.metadata.camera_make} {report.metadata.camera_model}
                        {report.metadata.lens_model ? ` (${report.metadata.lens_model})` : ''}
                      </div>
                    )}

                    {report.metadata.exposure_time && (
                      <div className="text-slate-400">
                        <strong className="text-slate-300">Exposure:</strong> {report.metadata.exposure_time}s • f/{report.metadata.f_number} • ISO {report.metadata.iso}
                      </div>
                    )}

                    {report.metadata.software && (
                      <div className="text-slate-400">
                        <strong className="text-slate-300">Software Header:</strong> {report.metadata.software}
                      </div>
                    )}

                    {report.metadata.c2pa_manifest_detected && (
                      <div className="text-emerald-400">
                        <strong>✓ C2PA Content Credentials Manifest:</strong> Authenticated box present
                      </div>
                    )}

                    {Object.keys(report.metadata.png_text_chunks).length > 0 && (
                      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <strong className="text-slate-300">PNG Text Chunks:</strong>
                        <pre className="mt-1 p-2 rounded bg-slate-900 overflow-x-auto text-[10px]">
                          {JSON.stringify(report.metadata.png_text_chunks, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Scientific Disclaimer */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-300">
                  <Info className="w-4 h-4 text-purple-400" />
                  <span>Forensic Methodology & Limitations Notice</span>
                </div>
                <p>{report.disclaimer}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
