import {
  handleCors,
  checkRateLimit,
  validateJWT,
  validateApiKey,
  createJsonResponse,
  createErrorResponse,
  corsHeaders,
} from "../_shared/security.ts";
import {
  getSupabaseAdmin,
  createSession,
  updateSession,
  getSession,
  createPublication,
  getPublication,
} from "../_shared/supabase.ts";

interface QuickCreateRequest {
  briefing: string;
  template_id?: string;
}

interface GenerateHooksRequest {
  briefing: string;
  template_id?: string;
}

interface GenerateContentRequest {
  session_id: string;
  hook_id: number;
}

interface GenerateImagesRequest {
  session_id: string;
  slides?: any[];
  style?: string;
}

async function quickCreate(
  req: Request
): Promise<{ success: boolean; session_id?: string; publication_id?: string; edit_url?: string; slides?: any[]; caption?: string; image_keywords?: string[]; error?: string }> {
  const body = (await req.json()) as QuickCreateRequest;

  if (!body.briefing) {
    return { success: false, error: "Missing briefing field" };
  }

  const { valid, user } = await validateJWT(req);
  if (!valid) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const session = await createSession(user.id, body.briefing, body.template_id);

    const generatedContent = {
      hooks: ["Hook 1", "Hook 2", "Hook 3"],
      slides: [
        { text: "Slide 1", image_keyword: "keyword1" },
        { text: "Slide 2", image_keyword: "keyword2" },
      ],
      caption: "Generated caption",
      image_keywords: ["keyword1", "keyword2"],
    };

    const publication = await createPublication(
      session.id,
      user.id,
      body.template_id || "default",
      "Generated Carousel",
      body.briefing,
      generatedContent.slides,
      generatedContent.caption,
      generatedContent.image_keywords
    );

    await updateSession(session.id, {
      status: "ready",
      content: generatedContent,
      publication_id: publication.id,
    });

    return {
      success: true,
      session_id: session.id,
      publication_id: publication.id,
      edit_url: `http://localhost:8080/editor/${publication.id}`,
      slides: generatedContent.slides,
      caption: generatedContent.caption,
      image_keywords: generatedContent.image_keywords,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function generateHooks(
  req: Request
): Promise<{ success: boolean; session_id?: string; hooks?: any[]; error?: string }> {
  const body = (await req.json()) as GenerateHooksRequest;

  if (!body.briefing) {
    return { success: false, error: "Missing briefing field" };
  }

  const { valid, user } = await validateJWT(req);
  if (!valid) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const session = await createSession(user.id, body.briefing, body.template_id);

    const hooks = [
      { id: 1, text: "Polêmico hook", style: "polêmico" },
      { id: 2, text: "Resultado hook", style: "resultado" },
      { id: 3, text: "Curiosidade hook", style: "curiosidade" },
    ];

    await updateSession(session.id, { status: "hooks_generated", hooks });

    return {
      success: true,
      session_id: session.id,
      hooks,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function generateContent(
  req: Request
): Promise<{ success: boolean; session_id?: string; publication_id?: string; content?: any; caption?: string; image_keywords?: string[]; error?: string }> {
  const body = (await req.json()) as GenerateContentRequest;

  if (!body.session_id || !body.hook_id) {
    return { success: false, error: "Missing session_id or hook_id" };
  }

  const { valid, user } = await validateJWT(req);
  if (!valid) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const session = await getSession(body.session_id);

    if (session.user_id !== user.id) {
      return { success: false, error: "Unauthorized access to session" };
    }

    const generatedContent = {
      slides: [
        { text: "Slide 1", image_keyword: "keyword1" },
        { text: "Slide 2", image_keyword: "keyword2" },
        { text: "Slide 3", image_keyword: "keyword3" },
        { text: "Slide 4", image_keyword: "keyword4" },
        { text: "Slide 5", image_keyword: "keyword5" },
        { text: "Slide 6", image_keyword: "keyword6" },
      ],
      caption: "Full carousel caption",
      image_keywords: ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"],
    };

    const publication = await createPublication(
      session.id,
      user.id,
      session.template_id || "default",
      "Generated Carousel",
      session.briefing || "",
      generatedContent.slides,
      generatedContent.caption,
      generatedContent.image_keywords
    );

    await updateSession(session.id, {
      status: "content_generated",
      content: generatedContent,
      publication_id: publication.id,
    });

    return {
      success: true,
      session_id: session.id,
      publication_id: publication.id,
      content: generatedContent,
      caption: generatedContent.caption,
      image_keywords: generatedContent.image_keywords,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function generateImages(
  req: Request
): Promise<{ success: boolean; session_id?: string; images?: any[]; error?: string }> {
  const body = (await req.json()) as GenerateImagesRequest;

  if (!body.session_id) {
    return { success: false, error: "Missing session_id" };
  }

  const { valid, user } = await validateJWT(req);
  if (!valid) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const session = await getSession(body.session_id);

    if (session.user_id !== user.id) {
      return { success: false, error: "Unauthorized access to session" };
    }

    const images = [
      { slide_index: 0, url: "https://example.com/image1.jpg" },
      { slide_index: 1, url: "https://example.com/image2.jpg" },
    ];

    return {
      success: true,
      session_id: session.id,
      images,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getTemplates(req: Request): Promise<{ success: boolean; templates?: any[]; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("templates").select("*");

    if (error) throw error;

    return {
      success: true,
      templates: data || [],
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getTemplate(
  req: Request,
  templateId: string
): Promise<{ success: boolean; template?: any; error?: string }> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("id", templateId)
      .single();

    if (error) throw error;

    return {
      success: true,
      template: data,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getStatus(
  req: Request,
  sessionId: string
): Promise<{ success: boolean; status?: string; error?: string }> {
  const { valid, user } = await validateJWT(req);
  if (!valid) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const session = await getSession(sessionId);

    if (session.user_id !== user.id) {
      return { success: false, error: "Unauthorized access to session" };
    }

    return {
      success: true,
      status: session.status,
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const rateLimit = checkRateLimit(req);
  if (!rateLimit.allowed) {
    return createErrorResponse("Rate limit exceeded", 429);
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/").filter(Boolean);

  try {
    if (req.method === "POST" && pathParts[pathParts.length - 1] === "quick-create") {
      const result = await quickCreate(req);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    if (req.method === "POST" && pathParts[pathParts.length - 1] === "generate-hooks") {
      const result = await generateHooks(req);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    if (req.method === "POST" && pathParts[pathParts.length - 1] === "generate-content") {
      const result = await generateContent(req);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    if (req.method === "POST" && pathParts[pathParts.length - 1] === "generate-images") {
      const result = await generateImages(req);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    if (req.method === "GET" && pathParts[pathParts.length - 1] === "templates") {
      const result = await getTemplates(req);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    if (req.method === "GET" && pathParts.length >= 2 && pathParts[pathParts.length - 2] === "templates") {
      const templateId = pathParts[pathParts.length - 1];
      const result = await getTemplate(req, templateId);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    if (req.method === "GET" && pathParts.length >= 2 && pathParts[pathParts.length - 2] === "status") {
      const sessionId = pathParts[pathParts.length - 1];
      const result = await getStatus(req, sessionId);
      return createJsonResponse(result, result.error ? 400 : 200);
    }

    return createErrorResponse("Not found", 404);
  } catch (error) {
    console.error("Error:", error);
    return createErrorResponse("Internal server error", 500);
  }
});
