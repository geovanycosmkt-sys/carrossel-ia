import { handleCors, createJsonResponse, createErrorResponse } from "../_shared/security.ts";

const SCRAPECREATORS_API_KEY = Deno.env.get("SCRAPECREATORS_API_KEY");

interface ScraperRequest {
  url: string;
}

interface ScraperResult {
  title: string;
  content: string;
  description: string;
  author?: string;
  image?: string;
  success: boolean;
  error?: string;
}

function isYoutubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/.test(url);
}

function isInstagramUrl(url: string): boolean {
  return /instagram\.com/.test(url);
}

async function scrapeYoutube(url: string): Promise<ScraperResult> {
  try {
    if (!SCRAPECREATORS_API_KEY) {
      return {
        success: false,
        error: "Missing ScrapeCreators API key",
        title: "",
        content: "",
        description: "",
      };
    }

    const response = await fetch("https://api.scrapecreators.com/youtube/transcript", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SCRAPECREATORS_API_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      title: data.title || "YouTube Video",
      content: data.transcript || data.content || "",
      description: data.description || "",
      author: data.channel_name,
      image: data.thumbnail,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      title: "",
      content: "",
      description: "",
    };
  }
}

async function scrapeInstagram(url: string): Promise<ScraperResult> {
  try {
    if (!SCRAPECREATORS_API_KEY) {
      return {
        success: false,
        error: "Missing ScrapeCreators API key",
        title: "",
        content: "",
        description: "",
      };
    }

    const response = await fetch("https://api.scrapecreators.com/instagram/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SCRAPECREATORS_API_KEY}`,
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      title: data.caption || "Instagram Post",
      content: data.caption || "",
      description: "",
      author: data.username,
      image: data.image_url,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      title: "",
      content: "",
      description: "",
    };
  }
}

async function scrapeHTML(url: string): Promise<ScraperResult> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const html = await response.text();

    const titleMatch = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
    const descriptionMatch = /<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i.exec(html);
    const ogImageMatch = /<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i.exec(html);
    const authorMatch = /<meta\s+name=["']author["']\s+content=["']([^"']*)["']/i.exec(html);

    const contentMatch = /<(?:article|main|div[^>]*class=["'][^"']*content[^"']*["'])[^>]*>([\s\S]*?)<\/(?:article|main|div)>/i.exec(html);
    const bodyContent = contentMatch
      ? contentMatch[1]
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500)
      : html
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500);

    return {
      success: true,
      title: titleMatch?.[1]?.trim() || "Untitled",
      content: bodyContent,
      description: descriptionMatch?.[1]?.trim() || "",
      image: ogImageMatch?.[1],
      author: authorMatch?.[1],
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      title: "",
      content: "",
      description: "",
    };
  }
}

async function scrapeUrl(req: Request): Promise<ScraperResult> {
  try {
    const body = (await req.json()) as ScraperRequest;

    if (!body.url) {
      return {
        success: false,
        error: "Missing URL parameter",
        title: "",
        content: "",
        description: "",
      };
    }

    try {
      new URL(body.url);
    } catch (error) {
      return {
        success: false,
        error: "Invalid URL format",
        title: "",
        content: "",
        description: "",
      };
    }

    if (isYoutubeUrl(body.url)) {
      return await scrapeYoutube(body.url);
    }

    if (isInstagramUrl(body.url)) {
      return await scrapeInstagram(body.url);
    }

    return await scrapeHTML(body.url);
  } catch (error) {
    return {
      success: false,
      error: error.message,
      title: "",
      content: "",
      description: "",
    };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "POST") {
    return createErrorResponse("Method not allowed. Use POST.", 405);
  }

  try {
    const result = await scrapeUrl(req);
    return createJsonResponse(result, result.error ? 400 : 200);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
