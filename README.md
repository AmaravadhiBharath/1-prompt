### Extract user prompts from AI chat platforms in One Click.

**1-prompt** is a powerful browser extension that captures and compiles your entire conversation history from top AI platforms into a single, actionable intent.

---

## 🚀 Features
- **One-Click Extraction**: Seamlessly capture logs from ChatGPT, Claude, Gemini, DeepSeek, and more.
- **Intent Engine™**: Advanced logic that merges scattered prompts into a cohesive, paste-ready instruction.
- **Attribution-Free**: Copy clean results directly to your clipboard.
- **History Management**: Keep track of your best prompts and intents.

## 🌐 Supported Platforms
- ChatGPT & OpenAI
- Claude (Anthropic)
- Gemini (Google AI)
- DeepSeek
- Lovable.dev, Bolt.new, Cursor.sh, and others.

---

## 🛠 Installation
1. Download this repository as a ZIP and extract it (or clone it).
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (toggle in the top-right corner).
4. Click **Load unpacked**.
5. Select the `1-prompt` folder.

## ⌨️ Shortcuts
- **Capture & Compile**: `Command+Shift+E` (Mac) or `Ctrl+Shift+E` (Windows)

---

## ⚖️ Legal & Proprietary Notice

**Copyright © 2026 Bharath Amaravadhi. All rights reserved.**
**Owner:** Bharath Amaravadhi
**Organization:** Cursor Layout LLP
**Website:** [1-prompt.in](https://1-prompt.in)

### Proprietary Software Notice:
This software and its associated logic (the "Intent Engine") are the sole property of Bharath Amaravadhi and Cursor Layout LLP. Access to this repository is provided for personal use/demonstration only. 

**Strictly Prohibited:**
- Redistribution of the source code or compiled assets.
- Modification, reverse-engineering, or creating derivative works.
- Commercial use without explicit written consent from the owners.

By using this software, you agree to these terms.

---

## 👨‍💻 Development & Security

### CORS & Dev Mode
To allow any local extension to connect to your backend during development, set `ALLOW_DEV_EXT=true` in your Cloudflare environment variables. In production, this should be `false` or unset.

### Verification Commands
**1. Test Backend CORS:**
```bash
curl -H "Origin: chrome-extension://gapafgdcpbmleogkpcogjccjekgkpidb" -I https://1prompt-backend.amaravadhibharath.workers.dev/
```

**2. Test Gemini API (Direct):**
```bash
curl -X POST "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions" \
  -H "x-goog-api-key: $GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Write a one line summary of 1-prompt extension."}]}]}'
```

**3. Test Summarization Endpoint:**
```bash
curl -X POST 'https://1prompt-backend.amaravadhibharath.workers.dev/' \
  -H "Content-Type: application/json" \
  -H "Origin: chrome-extension://gapafgdcpbmleogkpcogjccjekgkpidb" \
  -d '{"prompts":[{"content":"Hello AI"}], "platform":"test"}'
```
