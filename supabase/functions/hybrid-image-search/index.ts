import { handleCors, createJsonResponse, createErrorResponse } from "../_shared/security.ts";

const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
const MIN_WIDTH = 800;
const MIN_HEIGHT = 600;

interface ImageSearchRequest {
  query: string;
  count?: number;
  filters?: {
    size?: string;
    color?: string;
    type?: string;
  };
}

interface SearchImage {
  url: string;
  thumbnail: string;
  title: string;
  width: number;
  height: number;
  source: string;
}

async function searchImages(req: Request): Promise<any> {
  try {
    if (!SERPAPI_API_KEY) {
      return { success: false, error: "Missing SERPAPI_API_KEY configuration" };
    }

    const body = (await req.json()) as ImageSearchRequest;

    if (!body.query) {
      return { success: false, error: "Missing query parameter" };
    }

    const count = body.count || 10;

    let params = `q=${encodeURIComponent(body.query)}&tbm=isch&api_key=${SERPAPI_API_KEY}&num=${count}`;

    if (body.filters?.size) {
      params += `&imgsz=${body.filters.size}`;
    }

    if (body.filters?.color) {
      params += `&imgcolor=${body.filters.color}`;
    }

    if (body.filters?.type) {
      params += `&imgtype=${body.filters.type}`;
    }

    const response = await fetch(`https://serpapi.com/search?${params}`);
    const data = await response.json();

    if (!data.images_results) {
      return { success: true, images: [] };
    }

    const images: SearchImage[] = data.images_results
      .map((img: any) => ({
        url: img.original,
        thumbnail: img.thumbnail,
        title: img.title,
        width: img.width || 0,
        height: img.height || 0,
        source: img.source,
      }))
      .filter((img: SearchImage) => img.width >= MIN_WIDTH && img.height >= MIN_HEIGHT)
      .slice(0, count);

    return {
      success: true,
      images,
      total: images.length,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const result = await searchImages(req);
    return createJsonResponse(result, result.error ? 400 : 200);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
