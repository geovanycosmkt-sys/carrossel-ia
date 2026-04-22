import { handleCors, createJsonResponse, createErrorResponse } from "../_shared/security.ts";

const SCRAPECREATORS_API_KEY = Deno.env.get("SCRAPECREATORS_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2-flash-preview";

interface ProfileAnalysisRequest {
  instagram_profile_url: string;
}

interface CommunicationDNA {
  tone: string;
  themes: string[];
  content_types: string[];
  posting_frequency: string;
  average_engagement: string;
  audience_demographics: string;
  key_characteristics: string[];
  recommended_styles: string[];
}

async function analyzeInstagramProfile(req: Request): Promise<any> {
  try {
    if (!SCRAPECREATORS_API_KEY || !GEMINI_API_KEY) {
      return { success: false, error: "Missing required API keys" };
    }

    const body = (await req.json()) as ProfileAnalysisRequest;

    if (!body.instagram_profile_url) {
      return { success: false, error: "Missing instagram_profile_url" };
    }

    const profileResponse = await fetch("https://api.scrapecreators.com/instagram/profile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SCRAPECREATORS_API_KEY}`,
      },
      body: JSON.stringify({
        profile_url: body.instagram_profile_url,
        include_posts: true,
        post_limit: 20,
      }),
    });

    if (!profileResponse.ok) {
      return { success: false, error: "Failed to fetch Instagram profile" };
    }

    const profileData = await profileResponse.json();

    const analysisPrompt = `Analyze this Instagram profile and extract the creator's "communication DNA":

Profile Information:
- Username: ${profileData.username}
- Bio: ${profileData.bio}
- Follower Count: ${profileData.followers}
- Following Count: ${profileData.following}
- Post Count: ${profileData.post_count}

Recent Posts:
${profileData.posts
  ?.slice(0, 10)
  .map(
    (p: any) =>
      `- Caption: ${p.caption}\n  Likes: ${p.likes}, Comments: ${p.comments}, Engagement: ${p.engagement}%`
  )
  .join("\n")}

Analyze and return a JSON object with:
{
  "tone": "formal|casual|humorous|inspirational",
  "themes": ["theme1", "theme2", ...],
  "content_types": ["type1", "type2", ...],
  "posting_frequency": "daily|3-4x week|2-3x week|weekly",
  "average_engagement": "high|medium|low",
  "audience_demographics": "description of typical audience",
  "key_characteristics": ["characteristic1", "characteristic2", ...],
  "recommended_styles": ["style1", "style2", ...]
}

Return only valid JSON.`;

    const geminiResponse = await fetch(
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
                  text: analysisPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500,
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      return { success: false, error: "Failed to analyze profile" };
    }

    const geminiData = await geminiResponse.json();
    const analysisText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysisText) {
      return { success: false, error: "Failed to generate analysis" };
    }

    const dna: CommunicationDNA = JSON.parse(analysisText);

    return {
      success: true,
      profile: {
        username: profileData.username,
        url: body.instagram_profile_url,
        followers: profileData.followers,
        bio: profileData.bio,
      },
      communication_dna: dna,
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
    const result = await analyzeInstagramProfile(req);
    return createJsonResponse(result, result.error ? 400 : 200);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
