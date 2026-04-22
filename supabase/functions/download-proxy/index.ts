import { handleCors, corsHeaders } from "../_shared/security.ts";

const CACHE_DURATION = 10 * 60 * 1000;
const cacheStore = new Map<string, { data: ArrayBuffer; timestamp: number }>();

function getCachedImage(url: string): ArrayBuffer | null {
  const cached = cacheStore.get(url);

  if (!cached) {
    return null;
  }

  const isExpired = Date.now() - cached.timestamp > CACHE_DURATION;

  if (isExpired) {
    cacheStore.delete(url);
    return null;
  }

  return cached.data;
}

function cacheImage(url: string, data: ArrayBuffer): void {
  cacheStore.set(url, {
    data,
    timestamp: Date.now(),
  });
}

async function downloadImage(imageUrl: string): Promise<Response> {
  try {
    const url = new URL(imageUrl);

    const cachedData = getCachedImage(imageUrl);

    if (cachedData) {
      return new Response(cachedData, {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=600",
        },
      });
    }

    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      throw new Error("URL does not point to an image");
    }

    const data = await response.arrayBuffer();

    cacheImage(imageUrl, data);

    return new Response(data, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  const url = new URL(req.url);
  const imageUrl = url.searchParams.get("url");

  if (!imageUrl) {
    return new Response(JSON.stringify({ error: "Missing url parameter" }), {
      status: 400,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }

  return downloadImage(imageUrl);
});
