import { handleCors, createJsonResponse, createErrorResponse } from "../_shared/security.ts";
import { getSupabaseAdmin } from "../_shared/supabase.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SERPAPI_API_KEY = Deno.env.get("SERPAPI_API_KEY");
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY");
const GEMINI_MODEL = "gemini-2-flash-preview";
const CACHE_DURATION = 4 * 60 * 60 * 1000;

interface NewsItem {
  title: string;
  description: string;
  source: string;
}

interface Idea {
  title: string;
  description: string;
  hook: string;
  style: string;
  source: string;
  relevance_score: number;
}

async function fetchGoogleNews(): Promise<NewsItem[]> {
  try {
    const response = await fetch("https://news.google.com/rss?hl=pt-BR");
    const text = await response.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
      const itemText = match[1];
      const titleMatch = /<title>(.*?)<\/title>/.exec(itemText);
      const descriptionMatch = /<description>(.*?)<\/description>/.exec(itemText);

      if (titleMatch && descriptionMatch) {
        items.push({
          title: titleMatch[1],
          description: descriptionMatch[1],
          source: "Google News",
        });
      }

      if (items.length >= 4) break;
    }

    return items;
  } catch (error) {
    console.error("Error fetching Google News:", error);
    return [];
  }
}

async function fetchYouTubeTrends(): Promise<NewsItem[]> {
  try {
    if (!YOUTUBE_API_KEY) {
      return [];
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=trendingVideo&regionCode=BR&key=${YOUTUBE_API_KEY}&maxResults=4`
    );
    const data = await response.json();

    return (data.items || []).map((item: any) => ({
      title: item.snippet.title,
      description: item.snippet.description,
      source: "YouTube Trends",
    }));
  } catch (error) {
    console.error("Error fetching YouTube trends:", error);
    return [];
  }
}

async function fetchGoogleTrends(): Promise<NewsItem[]> {
  try {
    if (!SERPAPI_API_KEY) {
      return [];
    }

    const response = await fetch(
      `https://serpapi.com/search?engine=google_trends&api_key=${SERPAPI_API_KEY}&date=now%201d&geo=BR`
    );
    const data = await response.json();

    return (data.trending_searches || []).slice(0, 4).map((item: any) => ({
      title: item.query || item.title || "",
      description: "",
      source: "Google Trends",
    }));
  } catch (error) {
    console.error("Error fetching Google Trends:", error);
    return [];
  }
}

async function fetchWebNews(): Promise<NewsItem[]> {
  try {
    if (!SERPAPI_API_KEY) {
      return [];
    }

    const response = await fetch(
      `https://serpapi.com/search?q=viral%20trending&tbm=nws&api_key=${SERPAPI_API_KEY}&num=4`
    );
    const data = await response.json();

    return (data.news_results || []).map((item: any) => ({
      title: item.title,
      description: item.snippet || "",
      source: "Web Search",
    }));
  } catch (error) {
    console.error("Error fetching web news:", error);
    return [];
  }
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + GEMINI_API_KEY,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error("No content generated from Gemini");
  }

  return content;
}

async function curateIdeas(sources: NewsItem[], userId?: string): Promise<Idea[]> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const sourcesText = sources.map((s) => `- ${s.title}: ${s.description} (${s.source})`).join("\n");

  const prompt = `Analyze these current trends and news and generate 8-12 personalized carousel post ideas. Focus on ideas that are viral, engaging, and suitable for social media.

Current trends and news:
${sourcesText}

Generate ideas in JSON format:
[
  {
    "title": "...",
    "description": "...",
    "hook": "...",
    "style": "polêmico|resultado|curiosidade|humor",
    "source": "...",
    "relevance_score": 0.0-1.0
  }
]

Return only valid JSON array.`;

  const result = await callGemini(prompt);

  try {
    return JSON.parse(result);
  } catch (error) {
    console.error("Failed to parse Gemini response:", result);
    return [];
  }
}

async function getCachedIdeas(userId: string): Promise<Idea[] | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("cached_ideas")
      .select("*")
      .eq("user_id", userId)
      .gt("created_at", new Date(Date.now() - CACHE_DURATION).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data.ideas;
  } catch (error) {
    return null;
  }
}

async function cacheIdeas(userId: string, ideas: Idea[]): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("cached_ideas").insert({
      user_id: userId,
      ideas,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error caching ideas:", error);
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET") {
    return createErrorResponse("Method not allowed", 405);
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("user_id");

    if (userId) {
      const cached = await getCachedIdeas(userId);
      if (cached) {
        return createJsonResponse({
          success: true,
          ideas: cached,
          cached: true,
        });
      }
    }

    const [newsItems, youtubeItems, trendsItems, webItems] = await Promise.all([
      fetchGoogleNews(),
      fetchYouTubeTrends(),
      fetchGoogleTrends(),
      fetchWebNews(),
    ]);

    const allSources = [...newsItems, ...youtubeItems, ...trendsItems, ...webItems];

    const ideas = await curateIdeas(allSources, userId);

    if (userId && ideas.length > 0) {
      await cacheIdeas(userId, ideas);
    }

    return createJsonResponse({
      success: true,
      ideas: ideas.slice(0, 12),
      cached: false,
    });
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse(error.message, 500);
  }
});
