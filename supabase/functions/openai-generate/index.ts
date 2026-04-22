import { handleCors, createJsonResponse, createErrorResponse, corsHeaders } from "../_shared/security.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = "gemini-2-flash-preview";
const RATE_LIMIT_WINDOW = 60000;
const RATE_LIMIT_MAX = 20;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkGlobalRateLimit(): boolean {
  const now = Date.now();
  let entry = rateLimitStore.get("global");

  if (!entry || now > entry.resetTime) {
    entry = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    rateLimitStore.set("global", entry);
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

interface GenerateContentRequest {
  title: string;
  content: string;
}

interface GenerateHooksRequest {
  briefing: string;
}

interface RefineContentRequest {
  script: string;
  feedback: string;
}

interface DistributeContentRequest {
  text: string;
  template_fields: string[];
}

interface ChatWithToolsRequest {
  messages: Array<{ role: string; content: string }>;
  tools?: string[];
}

async function callGemini(prompt: string): Promise<string> {
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + GEMINI_API_KEY, {
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
  });

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

async function generateContent(req: Request): Promise<any> {
  try {
    const body = (await req.json()) as GenerateContentRequest;

    if (!body.title || !body.content) {
      return { success: false, error: "Missing title or content" };
    }

    if (!checkGlobalRateLimit()) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const prompt = `Generate a 6-slide carousel script for a social media post with the following:
Title: ${body.title}
Content: ${body.content}

Return a JSON object with:
{
  "slides": [
    { "text": "...", "speaker_notes": "..." },
    ...
  ],
  "caption": "...",
  "hashtags": ["..."]
}`;

    const result = await callGemini(prompt);
    const parsed = JSON.parse(result);

    return {
      success: true,
      slides: parsed.slides,
      caption: parsed.caption,
      hashtags: parsed.hashtags,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function generateHooks(req: Request): Promise<any> {
  try {
    const body = (await req.json()) as GenerateHooksRequest;

    if (!body.briefing) {
      return { success: false, error: "Missing briefing" };
    }

    if (!checkGlobalRateLimit()) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const prompt = `Generate 3 viral hook options for a carousel post with the briefing: "${body.briefing}"

Each hook should have a specific style. Return JSON:
{
  "hooks": [
    { "id": 1, "text": "...", "style": "polêmico" },
    { "id": 2, "text": "...", "style": "resultado" },
    { "id": 3, "text": "...", "style": "curiosidade" }
  ]
}`;

    const result = await callGemini(prompt);
    const parsed = JSON.parse(result);

    return {
      success: true,
      hooks: parsed.hooks,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function refineContent(req: Request): Promise<any> {
  try {
    const body = (await req.json()) as RefineContentRequest;

    if (!body.script || !body.feedback) {
      return { success: false, error: "Missing script or feedback" };
    }

    if (!checkGlobalRateLimit()) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const prompt = `Refine the following carousel script based on the feedback provided:

Original Script:
${body.script}

Feedback:
${body.feedback}

Return the refined script maintaining the same structure.`;

    const result = await callGemini(prompt);

    return {
      success: true,
      refined_script: result,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function distributeContent(req: Request): Promise<any> {
  try {
    const body = (await req.json()) as DistributeContentRequest;

    if (!body.text || !body.template_fields) {
      return { success: false, error: "Missing text or template_fields" };
    }

    if (!checkGlobalRateLimit()) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const fieldsStr = body.template_fields.join(", ");
    const prompt = `Distribute the following text across these template fields: ${fieldsStr}

Text to distribute:
${body.text}

Return JSON with the distributed content in the template fields format.`;

    const result = await callGemini(prompt);
    const parsed = JSON.parse(result);

    return {
      success: true,
      distributed_content: parsed,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function chatWithTools(req: Request): Promise<any> {
  try {
    const body = (await req.json()) as ChatWithToolsRequest;

    if (!body.messages || body.messages.length === 0) {
      return { success: false, error: "Missing messages" };
    }

    if (!checkGlobalRateLimit()) {
      return { success: false, error: "Rate limit exceeded" };
    }

    const messageText = body.messages.map((m) => `${m.role}: ${m.content}`).join("\n");

    const prompt = `You are a helpful carousel content creation assistant. Respond to the following conversation:

${messageText}

Available tools you can suggest:
- generate_hooks: Generate viral hooks
- generate_script: Generate full carousel script
- respond_text: Respond with text
- adjust_script: Adjust existing script`;

    const result = await callGemini(prompt);

    return {
      success: true,
      response: result,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!GEMINI_API_KEY) {
    return createErrorResponse("Missing GEMINI_API_KEY configuration", 500);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  try {
    let result: any;

    switch (action) {
      case "generate_content":
        result = await generateContent(req);
        break;
      case "generate_hooks":
        result = await generateHooks(req);
        break;
      case "refine_content":
        result = await refineContent(req);
        break;
      case "distribute_content":
        result = await distributeContent(req);
        break;
      case "chat_with_tools":
        result = await chatWithTools(req);
        break;
      default:
        return createErrorResponse(`Unknown action: ${action}`, 400);
    }

    return createJsonResponse(result, result.error ? 400 : 200);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
