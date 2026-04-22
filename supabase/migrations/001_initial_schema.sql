-- ============================================
-- CARROSSEL IA - Schema Completo do Banco de Dados
-- ============================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USER SETTINGS - Configurações do Usuário
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Prompts de IA
  content_system_prompt TEXT,
  content_prompt_template TEXT,
  style_instructions TEXT,
  caption_prompt_template TEXT,
  hook_strategy_prompt TEXT,
  image_style_prompt TEXT,

  -- Chaves API
  gemini_api_key TEXT,

  -- Instagram
  instagram_username TEXT,
  instagram_full_name TEXT,
  instagram_biography TEXT,
  instagram_profile_pic_url TEXT,
  instagram_followers_count INTEGER,
  instagram_is_verified BOOLEAN,
  instagram_last_updated TIMESTAMPTZ,
  instagram_publish_enabled BOOLEAN DEFAULT false,
  instagram_access_token TEXT,
  instagram_business_account_id TEXT,

  -- Canva
  canva_access_token TEXT,
  canva_refresh_token TEXT,
  canva_token_expires_at TIMESTAMPTZ,

  -- Preferências
  use_ai_images BOOLEAN DEFAULT true,
  content_analysis JSONB,

  -- Onboarding
  welcome_video_dismissed BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_settings" ON user_settings
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 2. CANVA TEMPLATES - Templates de Carrossel
-- ============================================
CREATE TABLE IF NOT EXISTS canva_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  name TEXT NOT NULL,
  description TEXT,
  category TEXT,

  -- Canva Integration
  canva_template_id TEXT UNIQUE,
  embed_id TEXT,

  -- Visual
  preview_image_url TEXT,
  preview_thumbnail_url TEXT,

  -- Configuração (CAMPO MAIS IMPORTANTE)
  template_config JSONB NOT NULL,

  -- Metadata
  tags TEXT[] DEFAULT '{}',
  search_style_suffix TEXT,
  is_active BOOLEAN DEFAULT true,
  is_premium BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT false,

  -- Propriedade
  user_id UUID REFERENCES auth.users(id),
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE canva_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "templates_public_read" ON canva_templates
  FOR SELECT USING (true);
CREATE POLICY "templates_owner_write" ON canva_templates
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================
-- 3. USER CAROUSELS - Carrosséis Criados
-- ============================================
CREATE TABLE IF NOT EXISTS user_carousels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Conteúdo
  title TEXT NOT NULL,
  hook_text TEXT,
  caption TEXT,
  carousel_content JSONB NOT NULL,
  carousel_text JSONB,
  carousel_fabric_json JSONB,
  generated_images JSONB,
  rendered_slides JSONB,

  -- Metadata
  content_type TEXT DEFAULT 'carousel',
  status TEXT DEFAULT 'ready',
  position INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',

  -- Template
  template_id UUID REFERENCES canva_templates(id),

  -- Canva
  canva_design_id TEXT,
  canva_design_url TEXT,

  -- Instagram
  instagram_media_id TEXT,
  instagram_permalink TEXT,
  published_to_instagram_at TIMESTAMPTZ,

  -- Agendamento
  scheduled_date TIMESTAMPTZ,
  published_date TIMESTAMPTZ,

  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_carousels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_carousels" ON user_carousels
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_user_carousels_user_id ON user_carousels(user_id);
CREATE INDEX idx_user_carousels_status ON user_carousels(user_id, status, position);

-- ============================================
-- 4. KANBAN COLUMNS - Colunas do Kanban
-- ============================================
CREATE TABLE IF NOT EXISTS kanban_columns (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '📋',
  position INTEGER NOT NULL,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, slug)
);

ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_columns" ON kanban_columns
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 5. CAROUSEL DRAFTS - Rascunhos Auto-Salvos
-- ============================================
CREATE TABLE IF NOT EXISTS carousel_drafts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  last_step TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE carousel_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_drafts" ON carousel_drafts
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 6. CONTENT IDEAS CACHE - Cache de Ideias IA
-- ============================================
CREATE TABLE IF NOT EXISTS content_ideas_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ideas JSONB NOT NULL DEFAULT '[]',
  sources_metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '4 hours')
);

ALTER TABLE content_ideas_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_ideas_cache" ON content_ideas_cache
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 7. CONTENT IDEA FEEDBACK
-- ============================================
CREATE TABLE IF NOT EXISTS content_idea_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  idea_hash TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'dismissed', 'generated')),
  idea_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE content_idea_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_feedback" ON content_idea_feedback
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 8. USER FEEDBACK - Bugs e Sugestões
-- ============================================
CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_url TEXT,
  page_url TEXT,
  user_agent TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_user_feedback" ON user_feedback
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admin_all_feedback" ON user_feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================
-- 9. USAGE EVENTS - Tracking de Custos IA
-- ============================================
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  publication_id UUID,
  provider TEXT NOT NULL,
  product TEXT NOT NULL,
  model TEXT,
  api_key_source TEXT NOT NULL,
  action TEXT,
  request_id TEXT,
  usage_metadata_raw JSONB,
  usage JSONB,
  cost_platform_usd NUMERIC DEFAULT 0,
  cost_user_external_usd NUMERIC,
  billable_usd NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_usage" ON usage_events
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 10. API KEYS - Chaves de API Externa
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  name TEXT DEFAULT 'Default',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_api_keys" ON api_keys
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 11. API SESSIONS - Sessões da API Externa
-- ============================================
CREATE TABLE IF NOT EXISTS api_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  briefing TEXT,
  template_id UUID REFERENCES canva_templates(id),
  hooks JSONB,
  selected_hook_id INTEGER,
  content JSONB,
  caption TEXT,
  image_keywords JSONB,
  images JSONB,
  publication_id UUID REFERENCES user_carousels(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sessions" ON api_sessions
  FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- 12. PROFILES - Perfis de Usuário
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);
CREATE POLICY "public_profiles_read" ON profiles
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS - Funções auxiliares
-- ============================================

-- Criar colunas Kanban padrão para novos usuários
CREATE OR REPLACE FUNCTION create_default_kanban_columns()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO kanban_columns (user_id, name, slug, icon, position, is_system) VALUES
    (NEW.id, 'Ideias', 'idea', '💡', 0, true),
    (NEW.id, 'Em Produção', 'in_progress', '⚙️', 1, true),
    (NEW.id, 'Agendado', 'scheduled', '📅', 2, true),
    (NEW.id, 'Pronto', 'ready', '✅', 3, true),
    (NEW.id, 'Publicado', 'published', '🚀', 4, true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar profile e settings padrão para novos usuários
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true
  );

  INSERT INTO user_settings (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_auth_user_created_kanban
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_kanban_columns();

-- ============================================
-- STORAGE - Buckets
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('carousel-images', 'carousel-images', true),
  ('profile-images', 'profile-images', true),
  ('template-thumbnails', 'template-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "public_read_carousel_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'carousel-images');
CREATE POLICY "authenticated_upload_carousel_images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'carousel-images' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_profile_images" ON storage.objects
  FOR SELECT USING (bucket_id = 'profile-images');
CREATE POLICY "authenticated_upload_profile_images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'profile-images' AND auth.role() = 'authenticated');

CREATE POLICY "public_read_template_thumbnails" ON storage.objects
  FOR SELECT USING (bucket_id = 'template-thumbnails');
