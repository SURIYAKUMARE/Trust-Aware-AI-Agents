import { jsPDF } from 'jspdf';
import { DecisionTrace } from '../types';

export function exportTracePdf(trace: DecisionTrace) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 15) {
      doc.addPage();
      y = 18;
    }
  };

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('TrustAgent Decision Trace Audit', margin + 6, y + 9);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Trace ID: ${trace.trace_id}  |  Generated: ${new Date().toISOString()}`, margin + 6, y + 16);

  y += 28;

  // Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 28, 2, 2, 'FD');

  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.text('ROUTE', margin + 5, y + 7);
  doc.text('CONFIDENCE', margin + 45, y + 7);
  doc.text('UNCERTAINTY TYPE', margin + 90, y + 7);
  doc.text('LATENCY / COST', margin + 140, y + 7);

  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(trace.final_route, margin + 5, y + 16);
  doc.text(`${Math.round(trace.final_confidence * 100)}% (${trace.confidence_report?.level || 'N/A'})`, margin + 45, y + 16);
  doc.text(trace.confidence_report?.uncertainty_type || 'none', margin + 90, y + 16);
  doc.text(`${Math.round(trace.latency_ms)} ms  |  $${trace.cost_usd.toFixed(4)}`, margin + 140, y + 16);

  if (trace.requires_human_approval) {
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38);
    doc.text('[CRITICAL: HUMAN SUPERVISOR APPROVAL MANDATED]', margin + 5, y + 23);
  }

  y += 34;

  // Query Section
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('User Query', margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const queryLines = doc.splitTextToSize(trace.query, contentWidth);
  doc.text(queryLines, margin, y);
  y += queryLines.length * 4.5 + 4;

  // Answer Section
  checkPageBreak(30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Agent Resolution / Proposed Action', margin, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  const answerLines = doc.splitTextToSize(trace.answer || '(No direct output produced)', contentWidth);
  doc.text(answerLines, margin, y);
  y += answerLines.length * 4.5 + 6;

  // Scorer Signals Breakdown
  checkPageBreak(40);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('Confidence Scorer Deconstruction', margin, y);
  y += 6;

  if (trace.confidence_report?.signals) {
    for (const signal of trace.confidence_report.signals) {
      checkPageBreak(12);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`- ${signal.scorer.replace('_', ' ').toUpperCase()}:`, margin + 3, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`Score: ${(signal.score * 100).toFixed(1)}% (Weight: ${Math.round(signal.weight * 100)}%)`, margin + 65, y);
      y += 4.5;
      if (signal.reasons?.length > 0) {
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const reasonText = doc.splitTextToSize(`Details: ${signal.reasons.join('; ')}`, contentWidth - 10);
        doc.text(reasonText, margin + 6, y);
        y += reasonText.length * 3.8 + 2;
      }
    }
  }

  y += 4;

  // Plain English Explanation
  if (trace.confidence_report?.plain_explanation) {
    checkPageBreak(25);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Confidence Rationale & Diagnostics', margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(51, 65, 85);
    const explLines = doc.splitTextToSize(trace.confidence_report.plain_explanation, contentWidth);
    doc.text(explLines, margin, y);
    y += explLines.length * 4.5 + 6;
  }

  // Trajectory Steps
  if (trace.steps?.length > 0) {
    checkPageBreak(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Execution Trajectory Steps', margin, y);
    y += 6;

    trace.steps.forEach((step, idx) => {
      checkPageBreak(18);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`Step ${idx + 1}: ${step.action} [Confidence: ${Math.round(step.confidence_score * 100)}%]`, margin + 3, y);
      y += 4;

      if (step.tool_name) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(79, 70, 229);
        doc.text(`Tool: ${step.tool_name}`, margin + 6, y);
        y += 4;
      }

      if (step.thought) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const thoughtLines = doc.splitTextToSize(`Thought: ${step.thought}`, contentWidth - 10);
        doc.text(thoughtLines, margin + 6, y);
        y += thoughtLines.length * 3.8 + 2;
      }
    });
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `TrustAgent Enterprise Audit Report • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  doc.save(`trustagent-trace-${trace.trace_id.slice(0, 8)}.pdf`);
}
