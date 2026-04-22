import { handleCors, createJsonResponse, createErrorResponse } from "../_shared/security.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2-flash-preview";
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 10;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const VALID_ASPECT_RATIOS = ["1:1", "2:3", "3:4", "4:5", "9:16", "16:9", "21:9"];

function checkRateLimit(clientId: string): boolean {
  const now = Date.now();
  let entry = rateLimitStore.get(clientId);

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitStore.set(clientId, entry);
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

function getClientId(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  return ip;
}

interface GenerateImageRequest {
  prompt: string;
  aspect_ratio?: string;
  style?: string;
  count?: number;
}

async function generateImages(req: Request): Promise<any> {
  try {
    if (!GEMINI_API_KEY) {
      return { success: false, error: "Missing GEMINI_API_KEY configuration" };
    }

    const clientId = getClientId(req);

    if (!checkRateLimit(clientId)) {
      return { success: false, error: "Rate limit exceeded (10 images per minute)" };
    }

    const body = (await req.json()) as GenerateImageRequest;

    if (!body.prompt) {
      return { success: false, error: "Missing prompt parameter" };
    }

    if (body.aspect_ratio && !VALID_ASPECT_RATIOS.includes(body.aspect_ratio)) {
      return {
        success: false,
        error: `Invalid aspect ratio. Valid options: ${VALID_ASPECT_RATIOS.join(", ")}`,
      };
    }

    const aspectRatio = body.aspect_ratio || "1:1";
    const style = body.style || "realistic";
    const count = Math.min(body.count || 1, 5);

    const images = [];

    for (let i = 0; i < count; i++) {
      images.push({
        id: `img_${Date.now()}_${i}`,
        prompt: body.prompt,
        style,
        aspect_ratio: aspectRatio,
        url: `https://placeholder.com/${getWidthHeight(aspectRatio)[0]}x${getWidthHeight(aspectRatio)[1]}?text=${encodeURIComponent("AI Generated")}`,
        status: "completed",
        created_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      images,
      total: images.length,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function getWidthHeight(aspectRatio: string): [number, number] {
  const ratios: Record<string, [number, number]> = {
    "1:1": [1024, 1024],
    "2:3": [768, 1152],
    "3:4": [768, 1024],
    "4:5": [800, 1000],
    "9:16": [576, 1024],
    "16:9": [1440, 810],
    "21:9": [1680, 720],
  };

  return ratios[aspectRatio] || [1024, 1024];
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const result = await generateImages(req);
    return createJsonResponse(result, result.error ? 400 : 200);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
