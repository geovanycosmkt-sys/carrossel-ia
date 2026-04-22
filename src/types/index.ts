/**
 * User and Profile Types
 */
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'light' | 'dark';
  language: string;
  notifications_enabled: boolean;
  email_notifications: boolean;
  default_template_id?: string;
  default_image_source: 'serp' | 'ai' | 'both';
  ai_model: 'gpt-4' | 'gpt-4o' | 'gpt-3.5-turbo';
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  bio?: string;
  website?: string;
  location?: string;
  niche?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Carousel Content Types
 */
export interface CarouselContent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  template_id: string;
  slides: CarouselSlide[];
  images: Record<string, string>; // slideIndex -> imageUrl
  hooks?: Hook[];
  script?: string;
  script_refined?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  niche?: string;
  content_type?: string;
  language?: string;
}

export interface CarouselSlide {
  index: number;
  fields: SlideField[];
  images?: string[];
  notes?: string;
}

export interface SlideField {
  key: string;
  value: string;
  type: 'text' | 'title' | 'description' | 'cta' | 'image';
  isVariable: boolean;
  limit?: number;
}

/**
 * Template Types
 */
export interface Template {
  id: string;
  user_id?: string; // null for system templates
  name: string;
  description?: string;
  category: string;
  thumbnail_url?: string;
  slides: SlideJSON[];
  template_config: TemplateConfig;
  is_public: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateConfig {
  name: string;
  description?: string;
  fields: {
    [slideIndex: number]: {
      [fieldKey: string]: {
        type: 'text' | 'image';
        limit?: number;
        maxWidth?: number;
        maxHeight?: number;
        fontSize?: number;
        fontFamily?: string;
      };
    };
  };
  aspectRatio?: string; // "1:1", "9:16", etc
  slideCount: number;
  width?: number;
  height?: number;
}

export interface SlideJSON {
  version: string;
  objects: FabricObject[];
  background?: string;
}

export interface FabricObject {
  type: string;
  left: number;
  top: number;
  width: number;
  height: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  angle?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  styles?: Record<number, Record<string, any>>;
  src?: string;
  content_key?: string;
  isVariable?: boolean;
  [key: string]: any;
}

/**
 * Kanban Types
 */
export interface KanbanColumn {
  id: string;
  title: string;
  items: ContentItem[];
  order: number;
}

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  carousel_id?: string;
  status: 'idea' | 'draft' | 'review' | 'scheduled' | 'published';
  created_at: string;
  updated_at: string;
}

/**
 * Content Idea Types
 */
export interface ContentIdea {
  id: string;
  user_id: string;
  niche: string;
  title: string;
  brief: string;
  content_type: string;
  hooks?: Hook[];
  script?: string;
  status: 'idea' | 'brainstorm' | 'ready';
  created_at: string;
  updated_at: string;
}

export interface Hook {
  id?: string;
  text: string;
  type: 'question' | 'statement' | 'curiosity' | 'benefit' | 'story';
  engagement_score?: number;
}

/**
 * API Session Types
 */
export interface ApiSession {
  id: string;
  user_id: string;
  session_id: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'other';
  context: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UsageEvent {
  id: string;
  user_id: string;
  event_type: 'carousel_created' | 'carousel_generated' | 'carousel_exported' | 'ai_call' | 'image_search';
  metadata?: Record<string, any>;
  created_at: string;
}

/**
 * Chat Types
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatAction {
  type: 'generate_content' | 'refine_content' | 'generate_hooks' | 'get_images' | 'distribute_text';
  params: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  created_at: string;
}
