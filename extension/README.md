# TrustGuard AI — Browser Extension (Manifest V3)

> **Independent Real-Time AI Verification & Token Saver Companion**
> Compatible with Google Chrome, Microsoft Edge, Brave, and all Chromium browsers.

---

## 🌟 Capabilities

1. **Independent Verification Layer**:
   - Evaluates answers from **ChatGPT**, **Gemini**, **Claude**, and **Perplexity** without modifying or impersonating the external AI.
   - Automatically injects unobtrusive floating trust badges (`🛡️ TrustGuard 94% Trusted`).
   - One-click Executive Trust Panel displaying calibrated confidence (0–100%), evidence consistency, and claim-level breakdown.

2. **Token Saver / Context Compression Engine**:
   - Classifies context into **CRITICAL** (code, formulas, constraints), **IMPORTANT** (arguments, reasoning), and **LOW VALUE** (filler, greetings, pleasantries).
   - Reduces prompt and context size by **40% to 85%**.
   - Ultra-compact "Caveman" / Key-Value mode for high-density LLM instruction prompts.
   - Automatic local credential redaction (masks OpenAI, Anthropic, Gemini API keys, GitHub tokens, passwords, and cards).

3. **Privacy-First Screen Capture**:
   - Explicit user-triggered capture of visible tab, window, or screen.
   - **Zero background recording** or continuous surveillance.
   - Sanitizes credentials locally before any analysis.

---

## 🚀 Installation Guide

### Step 1: Open Extensions Page
- In Chrome: Navigate to `chrome://extensions/`
- In Edge: Navigate to `edge://extensions/`
- In Brave: Navigate to `brave://extensions/`

### Step 2: Enable Developer Mode
- Toggle the **Developer mode** switch in the top-right corner.

### Step 3: Load Unpacked Extension
1. Click the **Load unpacked** button.
2. Select the `extension/` directory located at:
   ```
   D:\PROJECT\WIN\extension
   ```
3. The **TrustGuard AI** icon will appear in your browser toolbar!

---

## ⚙️ Backend Connection

Ensure the TrustGuard backend is running locally or hosted:
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
The extension automatically connects to `http://localhost:8000`. You can configure a custom remote URL inside the popup settings.

---

## 🛡️ Privacy Guarantee

- **No continuous surveillance**: Screen capture only activates when you explicitly click "Capture Visible Tab".
- **Local credential redaction**: API keys (`sk-...`, `ghp_...`, `AIza...`), credit card numbers, and passwords are masked before transmission.
- **Zero telemetry selling**: Evaluated data is strictly processed for confidence estimation and discarded per cache TTL policy.
