import { handleCors, createJsonResponse, createErrorResponse } from "../_shared/security.ts";

interface NewsItem {
  title: string;
  description: string;
  link: string;
  source: string;
  pub_date: string;
  viral_score: number;
}

const VIRAL_KEYWORDS = [
  "viral",
  "trending",
  "imperdível",
  "polêmico",
  "chocante",
  "surpreendente",
  "incrível",
  "bombástico",
  "revelação",
  "escândalo",
  "recordista",
  "maior",
  "pior",
  "melhor",
  "novo recorde",
  "nunca antes",
  "exclusivo",
  "vazado",
  "confirmado",
  "desmentido",
];

function calculateViralScore(title: string, description: string): number {
  let score = 0;
  const text = (title + " " + description).toLowerCase();

  VIRAL_KEYWORDS.forEach((keyword) => {
    const count = (text.match(new RegExp(keyword, "g")) || []).length;
    score += count * 10;
  });

  if (title === title.toUpperCase() && title.length > 10) {
    score += 5;
  }

  const punctuation = (title.match(/[!?]/g) || []).length;
  score += punctuation * 3;

  return Math.min(score, 100);
}

async function fetchGoogleNewsRSS(): Promise<NewsItem[]> {
  try {
    const response = await fetch("https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt");
    const text = await response.text();

    const items: NewsItem[] = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(text)) !== null) {
      const itemText = match[1];

      const titleMatch = /<title>(.*?)<\/title>/.exec(itemText);
      const descriptionMatch = /<description>([\s\S]*?)<\/description>/.exec(itemText);
      const linkMatch = /<link>(.*?)<\/link>/.exec(itemText);
      const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemText);

      if (titleMatch && linkMatch) {
        const title = titleMatch[1]
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, "&");

        const description = descriptionMatch
          ? descriptionMatch[1]
              .replace(/<[^>]*>/g, "")
              .replace(/&lt;/g, "<")
              .replace(/&gt;/g, ">")
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, "&")
              .substring(0, 200)
          : "";

        const link = linkMatch[1];
        const viralScore = calculateViralScore(title, description);

        items.push({
          title,
          description,
          link,
          source: "Google News",
          pub_date: pubDateMatch?.[1] || new Date().toISOString(),
          viral_score: viralScore,
        });
      }
    }

    items.sort((a, b) => b.viral_score - a.viral_score);

    return items.slice(0, 20);
  } catch (error) {
    console.error("Error fetching Google News:", error);
    return [];
  }
}

async function fetchTrendingNews(req: Request): Promise<any> {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 15, 50);

    const newsItems = await fetchGoogleNewsRSS();

    return {
      success: true,
      news: newsItems.slice(0, limit),
      total: newsItems.length,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== "GET") {
    return createErrorResponse("Method not allowed. Use GET.", 405);
  }

  try {
    const result = await fetchTrendingNews(req);
    return createJsonResponse(result, result.error ? 400 : 200);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
