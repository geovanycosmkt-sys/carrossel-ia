/**
 * OpenAI Service
 * Wrapper for calling Supabase edge functions for AI generation
 */

import { supabase } from '@/integrations/supabase/client';
import { TemplateConfig, ChatMessage } from '@/types';

interface GenerateContentRequest {
  title: string;
  content: string;
  templateConfig: TemplateConfig;
  systemPrompt?: string;
  niche?: string;
  contentType?: string;
  language?: string;
}

interface GenerateContentResponse {
  slides: Record<string, Record<string, string>>;
  script: string;
  metadata?: Record<string, any>;
}

interface GenerateHooksRequest {
  briefing: string;
  templateConfig: TemplateConfig;
  niche?: string;
  count?: number;
}

interface GenerateHooksResponse {
  hooks: Array<{
    text: string;
    type: 'question' | 'statement' | 'curiosity' | 'benefit' | 'story';
    engagement_score?: number;
  }>;
}

interface RefineContentRequest {
  content: string;
  feedback: string;
  templateConfig: TemplateConfig;
  language?: string;
}

interface RefineContentResponse {
  refined_content: string;
  improvements: string[];
}

interface DistributeContentRequest {
  text: string;
  templateConfig: TemplateConfig;
  slideCount: number;
}

interface DistributeContentResponse {
  distributed: Record<string, Record<string, string>>;
  wordCounts: Record<number, number>;
}

interface ChatWithToolsRequest {
  messages: ChatMessage[];
  templateConfig: TemplateConfig;
  systemPrompt?: string;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  niche?: string;
  contentType?: string;
}

interface ChatWithToolsResponse {
  message: ChatMessage;
  tool_calls?: Array<{
    tool_name: string;
    parameters: Record<string, any>;
  }>;
  content: string;
}

/**
 * Generate carousel content using OpenAI
 */
export async function generateContent(
  title: string,
  content: string,
  templateConfig: TemplateConfig,
  systemPrompt?: string,
  niche?: string,
  contentType?: string,
  language: string = 'pt-BR'
): Promise<GenerateContentResponse> {
  const { data, error } = await supabase.functions.invoke('openai-generate', {
    body: {
      action: 'generateContent',
      title,
      content,
      templateConfig,
      systemPrompt,
      niche,
      contentType,
      language,
    } as GenerateContentRequest,
  });

  if (error) {
    throw new Error(`Failed to generate content: ${error.message}`);
  }

  return data as GenerateContentResponse;
}

/**
 * Generate 3 viral hooks for the content
 */
export async function generateHooks(
  briefing: string,
  templateConfig: TemplateConfig,
  niche?: string,
  count: number = 3,
  language: string = 'pt-BR'
): Promise<GenerateHooksResponse> {
  const { data, error } = await supabase.functions.invoke('openai-generate', {
    body: {
      action: 'generateHooks',
      briefing,
      templateConfig,
      niche,
      count,
      language,
    } as GenerateHooksRequest,
  });

  if (error) {
    throw new Error(`Failed to generate hooks: ${error.message}`);
  }

  return data as GenerateHooksResponse;
}

/**
 * Refine existing content based on feedback
 */
export async function refineContent(
  content: string,
  feedback: string,
  templateConfig: TemplateConfig,
  language: string = 'pt-BR'
): Promise<RefineContentResponse> {
  const { data, error } = await supabase.functions.invoke('openai-generate', {
    body: {
      action: 'refineContent',
      content,
      feedback,
      templateConfig,
      language,
    } as RefineContentRequest,
  });

  if (error) {
    throw new Error(`Failed to refine content: ${error.message}`);
  }

  return data as RefineContentResponse;
}

/**
 * Distribute text across template slides
 */
export async function distributeContent(
  text: string,
  templateConfig: TemplateConfig,
  language: string = 'pt-BR'
): Promise<DistributeContentResponse> {
  const { data, error } = await supabase.functions.invoke('openai-generate', {
    body: {
      action: 'distributeContent',
      text,
      templateConfig,
      slideCount: templateConfig.slideCount,
      language,
    } as DistributeContentRequest,
  });

  if (error) {
    throw new Error(`Failed to distribute content: ${error.message}`);
  }

  return data as DistributeContentResponse;
}

/**
 * Chat with OpenAI using function calling for tool use
 */
export async function chatWithTools(
  messages: ChatMessage[],
  templateConfig: TemplateConfig,
  systemPrompt?: string,
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>,
  niche?: string,
  contentType?: string,
  language: string = 'pt-BR'
): Promise<ChatWithToolsResponse> {
  const { data, error } = await supabase.functions.invoke('openai-generate', {
    body: {
      action: 'chatWithTools',
      messages,
      templateConfig,
      systemPrompt,
      tools,
      niche,
      contentType,
      language,
    } as ChatWithToolsRequest,
  });

  if (error) {
    throw new Error(`Failed to chat with tools: ${error.message}`);
  }

  return data as ChatWithToolsResponse;
}

/**
 * Health check for OpenAI service
 */
export async function checkOpenAIService(): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('openai-generate', {
      body: { action: 'ping' },
    });

    return !error && data?.status === 'ok';
  } catch (error) {
    console.error('OpenAI service health check failed:', error);
    return false;
  }
}
