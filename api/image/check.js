/**
 * Vercel Serverless Function: AI-Generated Image Detection Handler
 * Endpoint: POST /api/image/check (and /api/image/detect)
 *
 * Securely communicates with Sightengine AI detection API (models=genai)
 * without exposing credentials to the client.
 */

export const config = {
  api: {
    bodyParser: false, // Disallow body parser so we can process multipart buffer
  },
};

const SIGHTENGINE_API_URL = 'https://api.sightengine.com/1.0/check.json';
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ detail: 'Method not allowed. Use POST.' });
  }

  const startTime = Date.now();

  try {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({ detail: 'Content-Type must be multipart/form-data.' });
    }

    // Read raw body chunks
    const chunks = [];
    let totalBytes = 0;
    for await (const chunk of req) {
      totalBytes += chunk.length;
      if (totalBytes > MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({ detail: 'File size exceeds the 20MB limit.' });
      }
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);

    if (rawBody.length === 0) {
      return res.status(400).json({ detail: 'Empty file payload uploaded.' });
    }

    // Parse multipart form
    const responseStream = new Response(rawBody, {
      headers: { 'content-type': contentType }
    });
    const parsedForm = await responseStream.formData();
    const uploadedFile = parsedForm.get('file') || parsedForm.get('media');

    if (!uploadedFile || typeof uploadedFile === 'string') {
      return res.status(400).json({ detail: 'No valid image file found in form data field "file".' });
    }

    const filename = uploadedFile.name || 'uploaded_image.jpg';
    const lowerName = filename.toLowerCase();
    const hasValidExt = ALLOWED_EXTS.some(ext => lowerName.endsWith(ext));
    if (!hasValidExt && uploadedFile.type && !uploadedFile.type.startsWith('image/')) {
      return res.status(400).json({ detail: 'Unsupported format. Supported formats: JPEG, PNG, WEBP.' });
    }

    const fileSizeKb = Math.round((uploadedFile.size / 1024) * 10) / 10;
    const format = lowerName.endsWith('.png') ? 'PNG' : lowerName.endsWith('.webp') ? 'WEBP' : 'JPEG';

    // Server-side credentials check
    const apiUser = (process.env.SIGHTENGINE_API_USER || '').trim();
    const apiSecret = (process.env.SIGHTENGINE_API_SECRET || '').trim();

    if (!apiUser || !apiSecret) {
      const elapsed = Date.now() - startTime;
      return res.status(200).json({
        analysis_status: 'Unable to analyze',
        detection_result: 'Inconclusive',
        ai_probability: 0.0,
        ai_probability_raw: 0.0,
        explanation: 'AI Image Detection service credentials are not configured on the server. Please configure SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.',
        generator_analysis: {},
        filename,
        file_size_kb: fileSizeKb,
        format,
        thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
        disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
        latency_ms: elapsed,
      });
    }

    // Build Sightengine API Multipart Request
    const sightFormData = new FormData();
    sightFormData.append('models', 'genai');
    sightFormData.append('api_user', apiUser);
    sightFormData.append('api_secret', apiSecret);
    sightFormData.append('media', uploadedFile, filename);

    // Call Sightengine API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const apiRes = await fetch(SIGHTENGINE_API_URL, {
      method: 'POST',
      body: sightFormData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;

    if (!apiRes.ok) {
      if (apiRes.status === 401 || apiRes.status === 403) {
        return res.status(200).json({
          analysis_status: 'Unable to analyze',
          detection_result: 'Inconclusive',
          ai_probability: 0.0,
          ai_probability_raw: 0.0,
          explanation: 'Authentication failed with the image detection service. Please verify server API credentials.',
          generator_analysis: {},
          filename,
          file_size_kb: fileSizeKb,
          format,
          thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
          disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
          latency_ms: elapsed,
        });
      }
      return res.status(200).json({
        analysis_status: 'Unable to analyze',
        detection_result: 'Inconclusive',
        ai_probability: 0.0,
        ai_probability_raw: 0.0,
        explanation: `Detection service returned HTTP status code ${apiRes.status}.`,
        generator_analysis: {},
        filename,
        file_size_kb: fileSizeKb,
        format,
        thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
        disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
        latency_ms: elapsed,
      });
    }

    const data = await apiRes.json();

    if (data.status === 'failure') {
      const errMsg = data.error?.message || 'Unknown detection service error';
      return res.status(200).json({
        analysis_status: 'Unable to analyze',
        detection_result: 'Inconclusive',
        ai_probability: 0.0,
        ai_probability_raw: 0.0,
        explanation: `Detection service reported: ${errMsg}`,
        generator_analysis: {},
        filename,
        file_size_kb: fileSizeKb,
        format,
        thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
        disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
        latency_ms: elapsed,
      });
    }

    const typeBlock = data.type || {};
    if (typeof typeBlock.ai_generated !== 'number') {
      return res.status(200).json({
        analysis_status: 'Unable to analyze',
        detection_result: 'Inconclusive',
        ai_probability: 0.0,
        ai_probability_raw: 0.0,
        explanation: 'Detection response missing required "ai_generated" metric.',
        generator_analysis: {},
        filename,
        file_size_kb: fileSizeKb,
        format,
        thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
        disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
        latency_ms: elapsed,
      });
    }

    const rawScore = Math.max(0.0, Math.min(1.0, typeBlock.ai_generated));
    const aiPct = Math.round(rawScore * 1000) / 10;

    // Extract any per-generator breakdown
    const generators = {};
    for (const [k, v] of Object.entries(typeBlock)) {
      if (k !== 'ai_generated' && typeof v === 'number') {
        generators[k] = Math.round(v * 1000) / 10;
      }
    }

    let detectionResult = 'Inconclusive';
    let explanation = '';

    if (rawScore >= 0.85) {
      detectionResult = 'Likely AI-generated';
      explanation = `High probability of AI generation (${aiPct}%). The image exhibits structural artifacts and texture distribution patterns characteristic of generative AI diffusion models.`;
    } else if (rawScore <= 0.50) {
      detectionResult = 'Likely authentic';
      explanation = `Low probability of AI generation (${aiPct}%). The image does not exhibit dominant synthetic synthesis markers. However, a low score is a probabilistic indicator, not an absolute guarantee of authenticity.`;
    } else {
      detectionResult = 'Inconclusive';
      explanation = `Intermediate probability (${aiPct}%). The visual features fall between natural photography and synthetic generation, indicating ambiguous signals that warrant contextual review.`;
    }

    return res.status(200).json({
      analysis_status: 'Successfully analyzed',
      detection_result: detectionResult,
      ai_probability: aiPct,
      ai_probability_raw: Math.round(rawScore * 10000) / 10000,
      explanation,
      generator_analysis: generators,
      filename,
      file_size_kb: fileSizeKb,
      format,
      thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
      disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
      latency_ms: elapsed,
    });
  } catch (err) {
    const elapsed = Date.now() - startTime;
    const isTimeout = err.name === 'AbortError';
    return res.status(200).json({
      analysis_status: 'Unable to analyze',
      detection_result: 'Inconclusive',
      ai_probability: 0.0,
      ai_probability_raw: 0.0,
      explanation: isTimeout
        ? 'The image detection request timed out. Please try again.'
        : `Detection service connection error: ${err.message || 'Unknown error'}`,
      generator_analysis: {},
      filename: 'image.jpg',
      file_size_kb: 0,
      format: 'UNKNOWN',
      thresholds: { ai_threshold: 0.85, authentic_threshold: 0.50 },
      disclaimer: 'Analysis indicates probabilistic likelihood based on generative model patterns. A high probability does not constitute absolute proof of artificial generation, nor does a low score guarantee authenticity.',
      latency_ms: elapsed,
    });
  }
}
