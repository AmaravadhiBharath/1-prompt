import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, "../dist");
const INDEX_HTML = path.join(DIST_DIR, "index.html");
const WELCOME_HTML = path.join(DIST_DIR, "welcome.html");
const POLYFILL_FILE = path.join(DIST_DIR, "polyfill.js");
const WORKER_FILE = path.join(DIST_DIR, "_worker.js");

console.log("🏗️  Preparing 1-prompt for Web Deployment...");

// 1. Create Polyfill
const polyfillContent = `(function () {
    // Robust Chrome API Polyfill for Web
    window.chrome = window.chrome || {};
    window.is1PromptPolyfill = true; // Signal that this is a mock environment
    
    const mock = (obj, defaults) => {
        if (!window.chrome[obj]) window.chrome[obj] = defaults;
        else Object.assign(window.chrome[obj], defaults);
    };

    mock('runtime', {
        id: 'mock-runtime-id',
        sendMessage: (msg, cb) => { if (cb) cb(); },
        onMessage: { addListener: () => { }, removeListener: () => { } },
        lastError: null
    });
    mock('storage', {
        local: { get: (k, cb) => cb({}), set: (k, cb) => cb && cb(), remove: (k, cb) => cb && cb() },
        session: { get: (k, cb) => cb({}), set: (k, cb) => cb && cb(), remove: (k, cb) => cb && cb() },
        onChanged: { addListener: () => { }, removeListener: () => { } }
    });
    mock('action', { getUserSettings: async () => ({ isOnToolbar: false }) });
    mock('identity', { getAuthToken: (opts, cb) => cb(null), removeCachedAuthToken: () => { } });
    mock('sidePanel', { open: async () => { } });
    mock('windows', { getCurrent: async () => ({ id: 1 }) });
    
    console.log('✅ Chrome API Polyfill Active');
})();`;

fs.writeFileSync(POLYFILL_FILE, polyfillContent);
console.log("Created polyfill.js");

// 2. Prepare HTML
if (fs.existsSync(WELCOME_HTML)) {
  let html = fs.readFileSync(WELCOME_HTML, "utf-8");

  // Fix paths to be absolute for SPA routing (e.g. /install/ won't break relative paths)
  // Replace all relative ./ or ../../ with root absolute /
  html = html.replace(/href="\.\.\/\.\.\//g, 'href="/');
  html = html.replace(/src="\.\.\/\.\.\//g, 'src="/');
  html = html.replace('href="../../index2.js"', 'href="/index2.js"');

  // Handle any existing relative paths from previous steps or template
  html = html.replace(/src="\.\//g, 'src="/');
  html = html.replace(/href="\.\//g, 'href="/');

  // Inject Polyfill at the top of head with absolute path
  // We check specifically for the SCRIPT tag, not just the filename,
  // because vite generates modulepreload-polyfill.js which triggers a false positive
  if (!html.includes('src="/polyfill.js"')) {
    html = html.replace(
      "<head>",
      '<head>\n  <script src="/polyfill.js"></script>',
    );
  }

  // Save as index.html for the website root
  fs.writeFileSync(INDEX_HTML, html);
  console.log("Generated index.html with web patches");

  // Also create dedicated static pages so Pages serves them directly
  // (Cloudflare Pages will prefer an existing file over the SPA redirect)
  const extraPages = ["home", "install", "supported-sites"];
  extraPages.forEach((p) => {
    const pageDir = path.join(DIST_DIR, p);
    if (!fs.existsSync(pageDir)) {
      fs.mkdirSync(pageDir, { recursive: true });
    }
    fs.writeFileSync(path.join(pageDir, "index.html"), html);
    console.log(`Created static page: /${p}/index.html`);
  });

  // Create _redirects for SPA routing on Cloudflare Pages
  // Create _redirects for SPA routing on Cloudflare Pages
  // NOTE: Some platforms (e.g. Chrome extension packaging) disallow filenames
  // starting with an underscore. To skip creating this file set the
  // environment variable `SKIP_REDIRECTS=true` when running the script.
  if (process.env.SKIP_REDIRECTS !== "true") {
    const redirectsContent = "/* /index.html 200";
    fs.writeFileSync(path.join(DIST_DIR, "_redirects"), redirectsContent);
    console.log("Created _redirects for SPA routing");
  } else {
    console.log("Skipping _redirects file (SKIP_REDIRECTS=true)");
  }
}

// 3. Remove conflicting worker
if (fs.existsSync(WORKER_FILE)) {
  fs.unlinkSync(WORKER_FILE);
  console.log("Removed _worker.js (preventing Cloudflare 522 errors)");
}

console.log(
  '🎉 Web Build Ready! Upload the "dist" folder to Cloudflare Pages.',
);
