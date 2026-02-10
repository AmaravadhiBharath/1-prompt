# Deploying Backend to Cloudflare Workers

## Prerequisites
1. Cloudflare account
2. Wrangler CLI installed (`npm install -g wrangler`)
3. Authenticated with Cloudflare (`wrangler login`)

## Deployment Steps

### 1. Navigate to backend directory
```bash
cd backend
```

### 2. Install dependencies (if not already done)
```bash
npm install
```

### 3. Set Gemini API Key as a secret
```bash
wrangler secret put GEMINI_API_KEY
# Paste your Gemini API key when prompted
```

### 4. Deploy the worker
```bash
wrangler deploy
```

### 5. Get your worker URL
After deployment, Wrangler will show:
```
Published 1prompt-backend (X.XX sec)
  https://1prompt-backend.YOUR_SUBDOMAIN.workers.dev
```

### 6. Update test script
Copy the URL and update `test-backend.js`:
```javascript
const BACKEND_URL = 'https://1prompt-backend.YOUR_SUBDOMAIN.workers.dev';
```

## Testing

### Test via curl
```bash
curl -X POST https://1prompt-backend.YOUR_SUBDOMAIN.workers.dev/summarize \
  -H "Content-Type: application/json" \
  -d '{"content":"make a button\nblue button","additionalInfo":"test"}'
```

### Test via Node script
```bash
BACKEND_URL="https://1prompt-backend.YOUR_SUBDOMAIN.workers.dev" node test-backend.js
```

## Verify Gemini Integration

1. Check Cloudflare dashboard → Workers & Pages → 1prompt-backend → Settings → Variables
2. Ensure `GEMINI_API_KEY` is listed under "Secrets"
3. Run the test script to verify routing:
   - Small prompts (≤100 chars) → Llama 3.2
   - Large prompts (>15,000 chars) → Gemini 1.5 Flash

## Troubleshooting

### "Could not resolve host"
- Worker not deployed yet
- Wrong subdomain in URL

### "GEMINI_API_KEY not found"
- Run `wrangler secret put GEMINI_API_KEY`
- Redeploy after adding secret

### "AI model failed"
- Check Cloudflare Workers AI is enabled
- Verify billing is set up (for unlimited usage)

## Current Configuration

- **Primary Model**: Llama 3.2-3b-instruct (128K context)
- **Fallback Model**: Llama 3.1-8b-instruct
- **Premium Model**: Gemini 1.5 Flash (100+ prompts)
- **Intent Engine**: v1.0 specification
