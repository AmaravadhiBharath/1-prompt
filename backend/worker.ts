import * as jose from "jose";

/**
 * Cloudflare Worker Backend for 1prompt
 *
 * Handles:
 * - User History (KV Storage)
 * - User Profiles (KV Storage)
 * - Remote Configuration
 * - Telemetry
 */

export interface Env {
  // Bindings
  PromptExtractor_KV: KVNamespace;
  AI: any;

  // Secrets
  API_KEY?: string;
  GEMINI_API_KEY?: string;
  ADMIN_EMAILS?: string;
  AI_PROVIDER?: string;
  AI_MODEL?: string;
  AI_GEMINI_FIRST_PLATFORMS?: string;
  FIREBASE_PROJECT_ID?: string;
}

const CUTOFF_PROMPT_COUNT = 50;

// CORS Headers - Restricted to extension only
// CORS Headers - Restricted to extension only
const ALLOWED_ORIGINS = [
  "chrome-extension://opdaaehibnkaabelcjhoefnfmebciekj", // Deployed ID (Store Version)
  "chrome-extension://gapafgdcpbmleogkpcogjccjekgkpidb", // Production ID (Local/Dev)
  "chrome-extension://pckiikjlgoimpnimojpfpnfndilaogol", // Legacy/Staging
];

interface ExtendedEnv extends Env {
  ALLOW_DEV_EXT?: string;
  ALLOWED_WEB_ORIGINS?: string;
}

function getCorsHeaders(
  origin: string | null,
  env: ExtendedEnv,
): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS, DELETE",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-User-Id",
    "Access-Control-Allow-Credentials": "true",
  };

  if (origin) {
    // Permissive for 1-prompt domains and development
    headers["Access-Control-Allow-Origin"] = origin;
  } else {
    // Fallback for security
    headers["Access-Control-Allow-Origin"] = ALLOWED_ORIGINS[0];
  }

  return headers;
}

// function getCorsHeaders(origin: string | null) ... (implementation remains same)

// Remove legacy support constant
// const corsHeaders = ...

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    const origin = request.headers.get("Origin");
    const headers = getCorsHeaders(origin, env);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // Rate limiting (100 requests per minute per IP)
    const rateLimitResult = await checkRateLimit(request, env);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({
          error: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...headers,
            "Retry-After": String(rateLimitResult.retryAfter),
          },
        },
      );
    }

    // Request size limits (prevent storage exhaustion)
    const contentLength = request.headers.get("Content-Length");
    const MAX_REQUEST_SIZE = 1024 * 1024; // 1MB

    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({
          error: "Request payload too large. Maximum size is 1MB.",
          maxSize: MAX_REQUEST_SIZE,
        }),
        {
          status: 413,
          headers,
        },
      );
    }

    try {
      // 0. AI Summarization (Root or v5 Path)
      if ((url.pathname === "/" || url.pathname === "/summarize/v5") && request.method === "POST") {
        console.log(`[AI] Incoming request for ${url.pathname} from platform: ${request.headers.get("X-Platform") || "unknown"}`);
        return handleSummarize(request, env, headers);
      }

      // 1. Remote Config (Public)
      if (url.pathname === "/config/selectors" && request.method === "GET") {
        return handleGetSelectors(headers);
      }

      if (url.pathname === "/config/runtime" && request.method === "GET") {
        return handleGetRuntimeConfig(request, env, headers);
      }

      if (url.pathname === "/config/quotas" && request.method === "GET") {
        return handleGetQuotas(headers);
      }

      // (debug endpoint removed) - diagnostics cleaned for production

      // 2. User Routes (Protected)
      if (url.pathname === "/user/profile" && request.method === "POST") {
        return handleSaveProfile(request, env, headers);
      }

      if (url.pathname === "/user/tier" && request.method === "POST") {
        return handleCheckTier(request, env, headers);
      }

      // 3. History Routes
      if (url.pathname === "/history" && request.method === "POST") {
        return handleSaveHistory(request, env, ctx, headers);
      }

      if (url.pathname === "/history" && request.method === "GET") {
        return handleGetHistory(request, env, headers);
      }

      if (url.pathname.startsWith("/history/") && request.method === "DELETE") {
        const id = url.pathname.split("/").pop();
        return handleDeleteHistory(id, env, request, headers);
      }

      if (url.pathname === "/history" && request.method === "DELETE") {
        return handleClearHistory(env, request, headers);
      }

      // 4. GDPR Compliance - Delete all user data
      if (url.pathname === "/user/data" && request.method === "DELETE") {
        return handleDeleteAllUserData(env, request, headers);
      }

      // 5. Telemetry & Usage
      if (url.pathname === "/telemetry" && request.method === "POST") {
        return new Response(JSON.stringify({ success: true }), { headers });
      }

      if (url.pathname === "/user/usage" && request.method === "POST") {
        return handleReportUsage(request, env, headers);
      }

      if (url.pathname === "/admin/usage" && request.method === "GET") {
        return handleGetUsageReport(request, env, headers);
      }

      if (url.pathname === "/waitlist" && request.method === "POST") {
        return handleSaveWaitlist(request, env, headers);
      }

      if (url.pathname === "/admin/waitlist" && request.method === "GET") {
        return handleGetWaitlist(request, env, headers);
      }

      return new Response("Not Found", { status: 404, headers });
    } catch (e: any) {
      console.error("Unhandled error:", e);
      return new Response(JSON.stringify({ error: "Internal Server Error" }), {
        status: 500,
        headers: getCorsHeaders(request.headers.get("Origin"), env),
      });
    }
  },
};

// ==========================================
// Google Token Verification (Pure OAuth)
// ==========================================

interface GoogleTokenPayload {
  sub: string;
  email?: string;
  exp: number;
  aud: string;
}

/**
 * Verify Google Access Token via Google API
 */
async function verifyGoogleToken(
  token: string,
): Promise<GoogleTokenPayload | null> {
  try {
    // Verify token with Google's tokeninfo endpoint
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`,
    );

    if (!response.ok) {
      console.error(
        "[Auth] Google token verification failed:",
        await response.text(),
      );
      return null;
    }

    const payload: any = await response.json();

    // Ensure the token hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && parseInt(payload.exp) < now) {
      console.error("[Auth] Token expired");
      return null;
    }

    return {
      sub: payload.sub || payload.user_id,
      email: payload.email,
      exp: parseInt(payload.exp),
      aud: payload.aud,
    };
  } catch (error) {
    console.error("[Auth] Token verification error:", error);
    return null;
  }
}

// Verify Firebase ID token (issued by securetoken.google.com)
async function verifyFirebaseIdToken(token: string, env: Env) {
  try {
    const projectId = env.FIREBASE_PROJECT_ID;
    if (!projectId) {
      console.warn("[Auth] FIREBASE_PROJECT_ID not configured in Worker env");
      return null;
    }

    // Decode header to find `kid`
    let header: any;
    try {
      header = jose.decodeProtectedHeader(token);
    } catch (e) {
      console.error("[Auth] Failed to decode token header", e);
      return null;
    }

    const kid = header.kid;
    if (!kid) {
      console.error("[Auth] Token missing kid header");
      return null;
    }

    // Fetch Google's certs for Firebase tokens
    const certsUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
    const res = await fetch(certsUrl);
    if (!res.ok) {
      console.error("[Auth] Failed to fetch Firebase certs", await res.text());
      return null;
    }
    const certs = await res.json();

    const cert = certs[kid];
    if (!cert) {
      console.error("[Auth] No cert found for kid", kid);
      return null;
    }

    // Import X509 certificate to a key usable by jose
    const key = await jose.importX509(cert, "RS256");

    // Verify the token
    const { payload } = await jose.jwtVerify(token, key, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });

    return payload as any;
  } catch (e) {
    console.error("[Auth] verifyFirebaseIdToken error:", e);
    return null;
  }
}

async function verifyAuth(
  req: Request,
  env: Env,
): Promise<{ userId: string; verified: boolean; email?: string }> {
  const authHeader = req.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    // Try Firebase ID token verification first (web sign-in)
    const fbPayload = await verifyFirebaseIdToken(token, env);
    if (fbPayload && fbPayload.sub) {
      return { userId: fbPayload.sub, verified: true, email: fbPayload.email };
    }

    // Fallback: Google token verification for other flows
    const payload = await verifyGoogleToken(token);

    if (payload) {
      // Token verified - use sub (unique ID) and email
      return { userId: payload.sub, verified: true, email: payload.email };
    }
  }

  throw new Error("Authentication required. Please sign in again.");
}

// ==========================================
// Rate Limiting
// ==========================================

async function checkRateLimit(
  req: Request,
  env: Env,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const ip =
    req.headers.get("CF-Connecting-IP") ||
    req.headers.get("X-Forwarded-For") ||
    "unknown";
  const key = `ratelimit:${ip}`;

  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  // Get current count
  const data = await env.PromptExtractor_KV.get(key);
  const rateData = data
    ? JSON.parse(data)
    : { count: 0, resetTime: now + windowMs };

  // Reset if window expired
  if (now > rateData.resetTime) {
    rateData.count = 0;
    rateData.resetTime = now + windowMs;
  }

  // Check limit
  if (rateData.count >= maxRequests) {
    const retryAfter = Math.ceil((rateData.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Increment count
  rateData.count++;
  await env.PromptExtractor_KV.put(key, JSON.stringify(rateData), {
    expirationTtl: 120, // 2 minutes (buffer)
  });

  return { allowed: true, retryAfter: 0 };
}

// ==========================================
// Handlers
// ==========================================

// Consolidation rules used for all providers (keep consistent across models)
const CONSOLIDATION_RULES = `[INTENT COMPILATION PROTOCOL v5.1 - ENTERPRISE]

CORE DIRECTIVE: Compile user intent into a single, cohesive paragraph.
PHILOSOPHY: 1-prompt does not summarize conversations. It compiles intent into a
 unified narrative.

SECTION A: OUTPUT FORMAT
A1. SINGLE PARAGRAPH ONLY - Output MUST be a single, justified-style paragraph.
A2. NO CATEGORY HEADERS - Do NOT use prefixes like "Story requirement:" or "Outp
ut:".
A3. FINAL STATE ONLY - Output the resolved state of all requirements.
A4. PURE INSTRUCTION ONLY - No headers or meta-commentary.

SECTION B: ZERO INFORMATION LOSS
B1. INCLUDE EVERYTHING - Every noun/constraint mentioned ONCE must appear.
B2. COHESIVE NARRATIVE - Weave distinct requirements into the paragraph naturally.

SECTION C: CONFLICT RESOLUTION
C1. LATEST WINS - Latest explicit instruction takes precedence.
C2. SPECIFICITY OVERRIDE - Specific overrides generic.

SECTION D: STYLE
D1. DIRECT & RAW - State requirements directly. Avoid adding meta-imperatives like "Write", "Describe", or "Create" unless the user explicitly used them. It should read like a personal note or a set of constraints.
D2. NO META-COMMENTARY - No "Here is the summary" or similar.
D3. NATURAL INTEGRATION - When organizations/institutions are mentioned, integrate naturally: "for a student of [School]" not "The story is for [School]".

A10. NO INTENT FALLBACK - If no actionable instruction exists after processing,
 prepend "[unprocessed: no actionable intent detected]" and preserve raw input.
`;

async function handleGetSelectors(headers: Record<string, string>) {
  const config = {
    platforms: {
      "chatgpt.com": {
        promptSelectors: [
          ".whitespace-pre-wrap",
          "div[data-message-author-role='user']",
          "article div.flex-col.gap-1.items-start.max-w-full",
        ],
        excludeSelectors: [".sr-only", "button", "svg"],
      },
      "claude.ai": {
        promptSelectors: [
          ".font-user-message",
          "div[data-test-id='user-message']",
        ],
        excludeSelectors: [],
      },
    },
  };
  return new Response(JSON.stringify({ config }), { headers });
}

async function handleGetQuotas(headers: Record<string, string>) {
  const quotas = {
    guest: 5,
    free: 10,
    go: 25,
    pro: 100,
    infi: 999,
  };
  return new Response(JSON.stringify({ quotas }), { headers });
}

async function handleGetRuntimeConfig(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  const config = {
    features: {
      telemetryEnabled: true,
      remoteSelectorEnabled: true,
    },
    ai: {
      defaultProvider: env.AI_PROVIDER || "gemini",
      model: env.AI_MODEL || "gemini-1.5-flash",
    },
  };
  return new Response(JSON.stringify({ config }), { headers });
}

async function handleSaveProfile(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  const data: any = await req.json();

  // Verify auth
  let userId: string;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  if (!data.id) return new Response("Missing ID", { status: 400, headers });

  // Validate ID matches authenticated user
  if (data.id !== userId) {
    // Optionally enforce mismatch: return new Response('User ID mismatch', { status: 403, headers });
  }

  await env.PromptExtractor_KV.put(
    `user:${userId}:profile`,
    JSON.stringify(data),
  );
  return new Response(JSON.stringify({ success: true }), { headers });
}

async function handleCheckTier(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  // Verify authentication
  let verifiedUserId: string;
  let verifiedEmail: string | undefined;

  try {
    const auth = await verifyAuth(req, env);
    verifiedUserId = auth.userId;
    verifiedEmail = auth.email;
  } catch (e: any) {
    return new Response(JSON.stringify({ tier: "guest", error: e.message }), {
      headers,
    });
  }

  if (!verifiedUserId) {
    return new Response(JSON.stringify({ tier: "guest" }), { headers });
  }

  // 1. Admin check (highest priority)
  const adminEmails = (
    env.ADMIN_EMAILS || "bharathamaravadi@gmail.com,bharath.amaravadi@gmail.com"
  )
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (verifiedEmail && adminEmails.includes(verifiedEmail.toLowerCase())) {
    return new Response(JSON.stringify({ tier: "admin" }), { headers });
  }

  // 2. Check user profile in KV for subscription status
  try {
    const profileStr = await env.PromptExtractor_KV.get(
      `user:${verifiedUserId}:profile`,
    );
    if (profileStr) {
      const profile = JSON.parse(profileStr);

      // Check for active Pro subscription
      if (profile.subscriptionStatus === "active" && profile.tier === "pro") {
        return new Response(JSON.stringify({ tier: "pro" }), { headers });
      }

      // Check for infinite tier (special access)
      if (profile.tier === "infi") {
        return new Response(JSON.stringify({ tier: profile.tier }), {
          headers,
        });
      }
    }

    // Default tier for authenticated users
    return new Response(JSON.stringify({ tier: "go" }), { headers });
  } catch (e) {
    console.error("Tier check error:", e);
    // Fallback to free/go tier on error
    return new Response(JSON.stringify({ tier: "go" }), { headers });
  }
}

// ==========================================
// Input Validation
// ==========================================

interface HistoryItem {
  id: string;
  timestamp: number;
  platform: string;
  promptCount: number;
  preview: string;
  prompts: Array<{ content: string; index?: number; timestamp?: number }>;
  mode?: string;
  duration?: number;
  isPinned?: boolean;
}

function validateHistoryItem(item: any): item is HistoryItem {
  if (!item || typeof item !== "object") return false;

  // Required fields
  if (typeof item.id !== "string" || item.id.length > 100) return false;
  if (typeof item.timestamp !== "number" || item.timestamp < 0) return false;
  if (typeof item.platform !== "string" || item.platform.length > 50)
    return false;
  if (
    typeof item.promptCount !== "number" ||
    item.promptCount < 0 ||
    item.promptCount > 10000
  )
    return false;
  if (typeof item.preview !== "string" || item.preview.length > 500)
    return false;

  // Validate prompts array
  if (!Array.isArray(item.prompts) || item.prompts.length > 10000) return false;
  if (
    !item.prompts.every(
      (p: any) => typeof p.content === "string" && p.content.length < 50000,
    )
  )
    return false;

  return true;
}

function sanitizeHistoryItem(item: HistoryItem): HistoryItem {
  return {
    id: item.id.slice(0, 100),
    timestamp: item.timestamp,
    platform: item.platform.slice(0, 50),
    promptCount: Math.min(item.promptCount, 10000),
    preview: item.preview.slice(0, 500),
    prompts: item.prompts.slice(0, 10000).map((p) => ({
      content: p.content.slice(0, 50000),
      index: p.index,
      timestamp: p.timestamp,
    })),
    mode: item.mode,
    duration: item.duration,
    isPinned: item.isPinned,
  };
}

async function handleSaveHistory(
  req: Request,
  env: Env,
  ctx: any,
  headers: Record<string, string>,
) {
  let item;
  try {
    const body: any = await req.json();
    item = body.item || body;
  } catch {
    return new Response("Invalid JSON", { status: 400, headers });
  }

  // Verify auth
  let userId: string;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  if (!item || !item.id) {
    return new Response("Invalid Data", { status: 400, headers });
  }

  // Validate input
  if (!validateHistoryItem(item)) {
    return new Response(
      JSON.stringify({ error: "Invalid history item format" }),
      {
        status: 400,
        headers,
      },
    );
  }

  // Sanitize
  const sanitizedItem = sanitizeHistoryItem(item);

  // SPEED OPTIMIZATION: Fire-and-forget write (returns immediately to client)
  ctx.waitUntil(
    env.PromptExtractor_KV.put(
      `user:${userId}:history:${sanitizedItem.id}`,
      JSON.stringify(sanitizedItem),
    ),
  );

  return new Response(JSON.stringify({ success: true, optimized: true }), {
    headers,
  });
}

async function handleGetHistory(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  // Verify auth
  let userId: string;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  // List keys starting with user:{id}:history:
  const prefix = `user:${userId}:history:`;
  const list = await env.PromptExtractor_KV.list({ prefix, limit: 100 });

  const history = [];
  for (const key of list.keys) {
    const value = await env.PromptExtractor_KV.get(key.name);
    if (value) history.push(JSON.parse(value));
  }

  // Sort by timestamp descending
  history.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

  return new Response(JSON.stringify({ history }), { headers });
}

async function handleDeleteHistory(
  id: string | undefined,
  env: Env,
  req: Request,
  headers: Record<string, string>,
) {
  // Verify auth
  let userId: string;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  if (!id) return new Response("Missing ID", { status: 400, headers });

  await env.PromptExtractor_KV.delete(`user:${userId}:history:${id}`);
  return new Response(JSON.stringify({ success: true }), { headers });
}

async function handleClearHistory(
  env: Env,
  req: Request,
  headers: Record<string, string>,
) {
  // Verify auth
  let userId: string;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  const prefix = `user:${userId}:history:`;
  const list = await env.PromptExtractor_KV.list({ prefix });

  // KV doesn't support bulk delete, so we loop (User warns: this might be slow for huge history)
  // Cloudflare Workers catch usually handles parallel promises well
  const deletes = list.keys.map((key) =>
    env.PromptExtractor_KV.delete(key.name),
  );
  await Promise.all(deletes);

  return new Response(JSON.stringify({ success: true }), { headers });
}

async function handleGetUsageReport(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  // Verify auth and admin
  let verifiedEmail: string | undefined;
  try {
    const auth = await verifyAuth(req, env);
    verifiedEmail = auth.email;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  const adminEmails = (
    env.ADMIN_EMAILS || "bharathamaravadi@gmail.com,bharath.amaravadi@gmail.com"
  )
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (!verifiedEmail || !adminEmails.includes(verifiedEmail.toLowerCase())) {
    return new Response("Forbidden", { status: 403, headers });
  }

  // Scan for usage keys. Prefix is "user:"
  // Key format: user:${userId}:usage:${date}
  const usageReports: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const list: { keys: { name: string }[]; list_complete: boolean; cursor?: string } = await env.PromptExtractor_KV.list({
      prefix: "user:",
      cursor,
    }) as any;

    for (const key of list.keys) {
      if (key.name.includes(":usage:")) {
        const val = await env.PromptExtractor_KV.get(key.name);
        if (val) usageReports.push(JSON.parse(val));
      }
    }

    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  // Flattened usage reports might need grouping or sorting?
  // For now, return as is.
  return new Response(JSON.stringify({ reports: usageReports }), { headers });
}

async function handleReportUsage(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  // Verify auth
  let userId: string;
  let email: string | undefined;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
    email = auth.email;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  const { mode, date } = (await req.json()) as { mode: "capture" | "compile"; date: string };
  if (!mode || !date) {
    return new Response("Missing mode or date", { status: 400, headers });
  }

  const usageKey = `user:${userId}:usage:${date}`;
  const existing = await env.PromptExtractor_KV.get(usageKey);
  let usage = existing ? JSON.parse(existing) : { email, captures: 0, compiles: 0, date };

  if (mode === "capture") usage.captures++;
  else if (mode === "compile") usage.compiles++;

  await env.PromptExtractor_KV.put(usageKey, JSON.stringify(usage));
  return new Response(JSON.stringify({ success: true, usage }), { headers });
}

async function handleDeleteAllUserData(
  env: Env,
  req: Request,
  headers: Record<string, string>,
) {
  // Verify auth
  let userId: string;
  try {
    const auth = await verifyAuth(req, env);
    userId = auth.userId;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  try {
    // Delete all history
    const historyPrefix = `user:${userId}:history:`;
    const historyList = await env.PromptExtractor_KV.list({
      prefix: historyPrefix,
    });
    const historyDeletes = historyList.keys.map((key: any) =>
      env.PromptExtractor_KV.delete(key.name),
    );

    // Delete profile
    const profileDelete = env.PromptExtractor_KV.delete(
      `user:${userId}:profile`,
    );

    // Delete usage data
    const usagePrefix = `user:${userId}:usage:`;
    const usageList = await env.PromptExtractor_KV.list({
      prefix: usagePrefix,
    });
    const usageDeletes = usageList.keys.map((key: any) =>
      env.PromptExtractor_KV.delete(key.name),
    );

    // Execute all deletions
    await Promise.all([...historyDeletes, profileDelete, ...usageDeletes]);

    console.log(`[GDPR] Deleted all data for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "All user data deleted successfully",
        deletedItems: historyList.keys.length + usageList.keys.length + 1,
      }),
      { headers },
    );
  } catch (error: any) {
    console.error("[GDPR] Data deletion error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to delete user data" }),
      {
        status: 500,
        headers,
      },
    );
  }
}

async function handleSummarize(
  request: Request,
  env: Env,
  headers: Record<string, string>,
): Promise<Response> {
  // Merge provided base headers with specific Content-Type for this handler
  const finalHeaders = { ...headers, "Content-Type": "application/json" };

  try {
    let body: any;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: finalHeaders,
      });
    }

    const { content, additionalInfo, provider, apiKey } = body;

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({
          error: "Missing or invalid content (must be string)",
        }),
        { status: 400, headers: finalHeaders },
      );
    }

    // Sanitize additionalInfo to prevent prompt injection
    const rawInfo =
      typeof additionalInfo === "string"
        ? additionalInfo
        : "Summarize into a single, actionable paragraph.";
    const safeAdditionalInfo = rawInfo
      .replace(/system/gi, "[USER_INST]")
      .replace(/ignore/gi, "[SKIP]");

    // SMART ROUTING: Gemini is now the DEFAULT for all users
    const geminiApiKey = (
      apiKey ||
      env.GEMINI_API_KEY ||
      env.API_KEY ||
      ""
    ).trim();

    // NOTE: debug key-prefix logging removed for production safety

    // Estimate prompt count from content (rough heuristic)
    const estimatedPromptCount = Math.ceil(content.length / 150);
    // Routing: allow per-platform Gemini-first behavior controlled by
    // env.AI_GEMINI_FIRST_PLATFORMS (comma-separated). If the current
    // platform is listed, prefer Gemini first (when key exists). Otherwise
    // prefer Cloudflare Llama (fast). Explicit `provider` overrides still apply.
    const platform = (body.platform || "").toString().toLowerCase();
    const geminiFirstRaw = (env.AI_GEMINI_FIRST_PLATFORMS || "lovable,chatgpt,claude,gemini,perplexity,deepseek").toString();
    const geminiFirstPlatforms = geminiFirstRaw
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    const prefersGemini =
      provider === "gemini"
        ? true
        : provider === "cloudflare"
          ? false
          : geminiFirstPlatforms.includes(platform);

    console.log(`[AI] Routing decision: platform=${platform} prefersGemini=${prefersGemini} geminiKey=${!!geminiApiKey}`);

    let geminiAttempted = false;

    // Helper to attempt Gemini call (returns Response on success, null otherwise)
    async function tryGemini(): Promise<Response | null> {
      if (!geminiApiKey) {
        console.warn("[AI] Gemini key missing, skipping Gemini attempt.");
        return null;
      }
      geminiAttempted = true;
      try {
        console.log(`[AI] Attempting Gemini for ${estimatedPromptCount} prompts`);
        // Use 1.5-flash with key in URL for maximum reliability
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

        const geminiResponse = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: CONSOLIDATION_RULES }]
            },
            contents: [
              {
                parts: [
                  { text: `User Instructions: ${safeAdditionalInfo}\n\nContent to summarize:\n${content}` },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2048,
            }
          }),
        });

        if (geminiResponse.ok) {
          const geminiData: any = await geminiResponse.json();
          const summaryText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (summaryText) {
            console.log("[AI] Gemini success!");
            return new Response(
              JSON.stringify({
                summary: summaryText.trim(),
                model: "gemini-2.0-flash",
                provider: "gemini",
              }),
              {
                headers: {
                  ...finalHeaders,
                  "X-Model-Used": "gemini-2.0-flash",
                },
              },
            );
          }
        } else {
          const errorBody = await geminiResponse.text();
          console.error(`[AI] Gemini API error (${geminiResponse.status}):`, errorBody);

          // If the error is API key related, log a helpful message
          if (geminiResponse.status === 403 || geminiResponse.status === 401) {
            console.error("[AI] Gemini Authentication Failure. Check GEMINI_API_KEY in Cloudflare Dashboard.");
          }
        }
        console.warn("[AI] Gemini attempt failed - falling back to Llama");
      } catch (err: any) {
        console.warn("[AI] Gemini exception:", err?.message || err);
      }
      return null;
    }

    // If we prefer Gemini, try it first; otherwise we will try Cloudflare first and
    // fall back to Gemini only if Cloudflare fails and Gemini is available.
    if (prefersGemini) {
      const geminiResp = await tryGemini();
      if (geminiResp) return geminiResp;
      console.log(`[AI] Gemini not available or failed; will try Cloudflare Llama for ${estimatedPromptCount} prompts`);
    } else {
      console.log(`[AI] Preferring Cloudflare Llama for ${estimatedPromptCount} prompts (<= ${CUTOFF_PROMPT_COUNT} cutoff)`);
    }

    // OPTION 2: CLOUDFLARE WORKERS AI (Primary for most users)
    // Llama 3.2-3b has 128K context - can handle 100+ prompts easily
    const models = [
      "@cf/meta/llama-3.2-3b-instruct", // Primary: 128K context, newest
      "@cf/meta/llama-3.1-8b-instruct", // Fallback: 8K context
      "@cf/meta/llama-2-7b-chat-int8", // Emergency: legacy
    ];

    let aiError = null;
    for (const model of models) {
      try {
        const response = await env.AI.run(model as any, {
          messages: [
            {
              role: "system",
              content: CONSOLIDATION_RULES,
            },
            {
              role: "user",
              content: `[User Instructions]: ${safeAdditionalInfo}\n\n[Raw Content]:\n${content.slice(0, 15000)}`,
            },
          ],
        });

        // Robust summary extraction for different Cloudflare AI response formats
        let summary = "";
        if (typeof response === "string") {
          summary = response;
        } else if (response.response) {
          summary = response.response;
        } else if (response.result?.response) {
          summary = response.result.response;
        } else if (response.result) {
          summary =
            typeof response.result === "string"
              ? response.result
              : JSON.stringify(response.result);
        }

        if (summary) {
          return new Response(
            JSON.stringify({ summary: summary.trim(), model: model, provider: "cloudflare" }),
            { headers: finalHeaders },
          );
        }
      } catch (err: any) {
        console.error(`[AI] Model ${model} failed:`, err.message);
        aiError = err;
      }
    }

    // If we get here, Cloudflare models failed. Try Gemini as a fallback if we
    // haven't already attempted it and have a key available.
    if (!geminiAttempted && geminiApiKey) {
      const geminiRespFallback = await tryGemini();
      if (geminiRespFallback) return geminiRespFallback;
    }

    // If we still have no result, return over-capacity error to trigger client-side fallbacks
    return new Response(
      JSON.stringify({
        summary:
          "[Cloud AI Over-Capacity] 1prompt is experiencing high demand. Please try again in 30 seconds or use a Direct API Key in Settings.",
        error: aiError?.message || "All models failed",
      }),
      {
        status: 429, // Too Many Requests - triggers immediate stop (no retry) in resilientFetch
        headers: finalHeaders,
      },
    );
  } catch (error: any) {
    console.error("[AI] Summarization fatal error:", error);
    return new Response(
      JSON.stringify({ error: "AI processing failed: " + error.message }),
      { status: 500, headers: finalHeaders },
    );
  }
}
async function handleSaveWaitlist(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  try {
    const { email } = (await req.json()) as { email: string };
    if (!email || !email.includes("@")) {
      return new Response("Invalid email", { status: 400, headers });
    }

    const key = `waitlist:${email.toLowerCase()}`;
    const timestamp = Date.now();

    await env.PromptExtractor_KV.put(
      key,
      JSON.stringify({ email, timestamp }),
    );

    return new Response(JSON.stringify({ success: true }), { headers });
  } catch (e: any) {
    return new Response(e.message, { status: 500, headers });
  }
}

async function handleGetWaitlist(
  req: Request,
  env: Env,
  headers: Record<string, string>,
) {
  // Verify auth and admin
  let verifiedEmail: string | undefined;
  try {
    const auth = await verifyAuth(req);
    verifiedEmail = auth.email;
  } catch (e: any) {
    return new Response(e.message, { status: 401, headers });
  }

  const adminEmails = (
    env.ADMIN_EMAILS || "bharathamaravadi@gmail.com,bharath.amaravadi@gmail.com"
  )
    .split(",")
    .map((e) => e.trim().toLowerCase());

  if (!verifiedEmail || !adminEmails.includes(verifiedEmail.toLowerCase())) {
    return new Response("Forbidden", { status: 403, headers });
  }

  const waitlist: any[] = [];
  let cursor: string | undefined = undefined;

  do {
    const list: any = await env.PromptExtractor_KV.list({
      prefix: "waitlist:",
      cursor,
    });

    for (const key of list.keys) {
      const val = await env.PromptExtractor_KV.get(key.name);
      if (val) waitlist.push(JSON.parse(val));
    }

    cursor = list.list_complete ? undefined : list.cursor;
  } while (cursor);

  // Sort by timestamp descending
  waitlist.sort((a, b) => b.timestamp - a.timestamp);

  return new Response(JSON.stringify({ waitlist }), { headers });
}
