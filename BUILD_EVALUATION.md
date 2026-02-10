# Build Evaluation: Microservices & Optimization Opportunities

## Current State

| Metric | Value |
|--------|-------|
| Build tool | Vite 5.3.1 (two configs, sequential) |
| Total dist size | ~520 KB unminified |
| Largest bundle | `vendor.js` (React) — 214 KB |
| Content script | `content.js` — 85 KB (12 adapters, all bundled) |
| Service worker | `service-worker.js` — 79 KB |
| Minification | **Disabled** |
| Tests | **None** |
| CI/CD | **None** |
| Backend | Single Cloudflare Worker (706 lines, 8 endpoints) |

---

## 1. Enable Minification (Quick Win)

**Impact: ~40-50% bundle size reduction**

Both `vite.config.ts` and `vite.content.config.ts` have `minify: false`. Enabling Vite's
default esbuild minification would drop total dist size from ~520 KB to ~260-300 KB with
zero code changes. This is the single highest-impact change available.

---

## 2. Parallelize the Build Pipeline

**Current:** The build runs sequentially:
```
rm -rf dist → tsc → vite build (main) → vite build (content script)
```

**Improvement:** Run the two Vite builds in parallel since they write to separate output
files and `emptyOutDir: false` on both:
```
rm -rf dist && tsc && (vite build & vite build --config vite.content.config.ts & wait)
```

This cuts build time by running both Vite invocations concurrently.

---

## 3. Add a Bundle Analysis Service

**What:** `rollup-plugin-visualizer` generates a treemap of what's in each bundle.

**Why it helps:**
- `vendor.js` (214 KB) contains all of `node_modules` — this makes it hard to see if
  there are unused dependencies being pulled in
- Identifies tree-shaking opportunities (e.g., are all of React DOM's features needed?)
- Tracks bundle size regressions over time when paired with CI

---

## 4. Replace React with Preact (Browser Extension Optimization)

**Impact: ~180 KB reduction in vendor.js**

For a browser extension side panel, Preact (3 KB) is a drop-in replacement for
React (214 KB vendor bundle). The extension uses standard React features (hooks, JSX,
functional components) that Preact fully supports via `preact/compat`.

Configuration in `vite.config.ts`:
```js
resolve: {
  alias: {
    'react': 'preact/compat',
    'react-dom': 'preact/compat',
  }
}
```

---

## 5. Lazy-Load Platform Adapters in Content Script

**Current:** All 12 platform adapters are statically imported and instantiated in
`src/content/adapters/index.ts`, even though only one adapter is ever active per page.

**Improvement:** Use dynamic imports to load only the matching adapter:
```ts
// Detect platform first, then load only the needed adapter
const hostname = window.location.hostname;
if (hostname.includes('chatgpt.com')) {
  const { ChatGPTAdapter } = await import('./chatgpt');
  return new ChatGPTAdapter();
}
```

**Impact:** Reduces initial content script parse/execute time. Currently the content
script is IIFE format which makes dynamic imports harder, but switching to a per-platform
entry point strategy could work.

---

## 6. Add CI/CD with GitHub Actions

**Microservice: Automated Build + Lint + Test Pipeline**

A GitHub Actions workflow would provide:
- **Type checking** on every PR (`tsc --noEmit`)
- **Build verification** (catch broken builds before merge)
- **Bundle size tracking** (fail if vendor.js grows beyond threshold)
- **Automated Cloudflare Worker deployment** (via `wrangler deploy`)

Recommended workflow stages:
```
PR opened → typecheck → build → bundle-size-check → (optional) deploy-preview
Push to main → typecheck → build → deploy-worker → deploy-extension-assets
```

---

## 7. Add Test Infrastructure (Vitest)

**Microservice: Automated Testing**

The project currently has zero tests. Vitest integrates natively with Vite and requires
minimal setup. Priority test targets:

| Component | Why |
|-----------|-----|
| `getAdapter()` (adapter detection) | Core business logic; must correctly match 12 platforms |
| Intent compilation rules | The main value proposition of the extension |
| Backend rate limiting | Security-critical |
| Backend auth verification | Security-critical |
| History CRUD operations | Data integrity |

---

## 8. Decompose the Monolithic Backend Worker

**Current:** A single `worker.ts` (706 lines) handles 8+ endpoints covering:
- AI summarization (with 4-tier model fallback)
- User profile management
- History CRUD
- Remote configuration serving
- Telemetry ingestion
- Rate limiting
- Auth verification

**Recommended Split into Cloudflare Worker Services:**

| Service | Endpoints | Rationale |
|---------|-----------|-----------|
| **ai-summarizer** | `POST /` | Most resource-intensive; benefits from independent scaling and its own rate limits |
| **user-service** | `/user/*`, `/history/*` | Stateful operations on KV; could migrate to D1 (SQL) for complex queries |
| **config-service** | `/config/*` | Read-only, highly cacheable; could be a static KV lookup or even a CDN edge function |
| **telemetry-ingest** | `POST /telemetry` | Fire-and-forget writes; could use Cloudflare Queues for async processing |

**Benefits:**
- Independent deployment (change AI models without touching user service)
- Independent scaling and rate limits per service
- Smaller cold-start times per worker
- Easier to test each service in isolation

---

## 9. Add an Asset Optimization Pipeline

**Current:** Icon generation uses `sharp` in `scripts/generate-icons.js` but there's no
optimization for the final dist output.

**Improvement:** Add a post-build step that:
- Compresses PNG icons with `pngquant` or `sharp`
- Generates WebP alternatives for the web deployment
- Strips unnecessary metadata from assets

---

## 10. Add Cloudflare Pages Build Caching

For the `build:web` deployment target, Cloudflare Pages supports build caching. Adding
a `wrangler.toml` pages configuration with proper cache headers would reduce rebuild times
and improve CDN cache hit rates for static assets.

---

## Priority Matrix

| # | Change | Effort | Impact | Recommendation |
|---|--------|--------|--------|---------------|
| 1 | Enable minification | 2 lines | HIGH | **Do now** |
| 2 | Parallelize build | 1 line | MEDIUM | **Do now** |
| 3 | Bundle analysis | 10 min setup | MEDIUM | Do soon |
| 4 | Preact migration | 1 hour | HIGH | Do soon |
| 5 | Lazy adapters | 2-3 hours | MEDIUM | Plan for next sprint |
| 6 | CI/CD pipeline | 1-2 hours | HIGH | Do soon |
| 7 | Test infrastructure | 2-4 hours | HIGH | Do soon |
| 8 | Backend decomposition | 1-2 days | MEDIUM | Plan for v2 |
| 9 | Asset optimization | 30 min | LOW | Nice to have |
| 10 | Build caching | 15 min | LOW | Nice to have |
