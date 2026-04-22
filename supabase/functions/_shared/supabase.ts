import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

let supabaseClient: any = null;

export function getSupabaseAdmin() {
  if (!supabaseClient) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration (URL or SERVICE_ROLE_KEY)");
    }

    supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseClient;
}

export interface Session {
  id: string;
  status: "pending" | "hooks_generated" | "content_generated" | "ready" | "error";
  user_id: string;
  briefing?: string;
  template_id?: string;
  hooks?: any[];
  content?: any;
  publication_id?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface Publication {
  id: string;
  session_id: string;
  user_id: string;
  template_id: string;
  title: string;
  description: string;
  slides: any[];
  caption: string;
  image_keywords: string[];
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export async function createSession(
  userId: string,
  briefing: string,
  templateId?: string
): Promise<Session> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: userId,
      briefing,
      template_id: templateId || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSession(
  sessionId: string,
  updates: Partial<Session>
): Promise<Session> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSession(sessionId: string): Promise<Session> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();

  if (error) throw error;
  return data;
}

export async function createPublication(
  sessionId: string,
  userId: string,
  templateId: string,
  title: string,
  description: string,
  slides: any[],
  caption: string,
  imageKeywords: string[]
): Promise<Publication> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("publications")
    .insert({
      session_id: sessionId,
      user_id: userId,
      template_id: templateId,
      title,
      description,
      slides,
      caption,
      image_keywords: imageKeywords,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPublication(publicationId: string): Promise<Publication> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("publications")
    .select("*")
    .eq("id", publicationId)
    .single();

  if (error) throw error;
  return data;
}

export async function updatePublication(
  publicationId: string,
  updates: Partial<Publication>
): Promise<Publication> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("publications")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", publicationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}
