import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:8080, https://conteudo.frankcosta.me",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
  "Access-Control-Max-Age": "86400",
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100;

function getClientId(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const auth = req.headers.get("authorization") || "anonymous";
  return `${ip}:${auth}`;
}

export function checkRateLimit(req: Request): { allowed: boolean; remaining: number } {
  const clientId = getClientId(req);
  const now = Date.now();

  let entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitStore.set(clientId, entry);
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - entry.count };
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }
  return null;
}

export async function validateJWT(req: Request): Promise<{ valid: boolean; user?: any; error?: string }> {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const token = authHeader.substring(7);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    return { valid: false, error: "Missing Supabase configuration" };
  }

  const client = createClient(supabaseUrl, supabaseAnonKey);

  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser(token);

    if (error || !user) {
      return { valid: false, error: error?.message || "Invalid token" };
    }

    return { valid: true, user };
  } catch (error) {
    return { valid: false, error: `JWT validation failed: ${error.message}` };
  }
}

export function validateApiKey(req: Request): { valid: boolean; error?: string } {
  const apiKey = req.headers.get("x-api-key");

  if (!apiKey) {
    return { valid: false, error: "Missing X-API-Key header" };
  }

  if (!apiKey.startsWith("sk_carousel_")) {
    return { valid: false, error: "Invalid API key format" };
  }

  // In production, validate against database
  const validKeys = Deno.env.get("VALID_API_KEYS")?.split(",") || [];
  if (!validKeys.includes(apiKey)) {
    return { valid: false, error: "Invalid API key" };
  }

  return { valid: true };
}

export function createJsonResponse(
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...headers,
    },
  });
}

export function createErrorResponse(message: string, status: number = 400): Response {
  return createJsonResponse({ success: false, error: message }, status);
}

export { corsHeaders };
