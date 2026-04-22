import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useCarouselStore } from '@/store/carouselStore';

interface CarouselDraft {
  id: string;
  user_id: string;
  content: {
    step: string;
    selectedTemplate: any;
    inputType: string;
    inputContent: string;
    hooks: any[];
    selectedHook: any;
    carouselText: any;
    caption: string;
    imageKeywords: any;
    generatedImages: any;
    fabricSlides: any[];
    chatMessages: any[];
  };
  saved_at: string;
}

const DRAFT_KEY = 'carousel_draft_local';
const SYNC_INTERVAL = 30000; // 30 seconds

/**
 * Hook for auto-saving carousel drafts
 * Saves to localStorage immediately and syncs to Supabase every 30 seconds
 */
export function useDraftPersistence() {
  const { user } = useAuth();
  const store = useCarouselStore();
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<string>('');

  // Save draft to localStorage
  const saveDraftLocal = useCallback(() => {
    try {
      const draft: CarouselDraft = {
        id: `draft_${Date.now()}`,
        user_id: user?.id || '',
        content: {
          step: store.step,
          selectedTemplate: store.selectedTemplate,
          inputType: store.inputType,
          inputContent: store.inputContent,
          hooks: store.hooks,
          selectedHook: store.selectedHook,
          carouselText: store.carouselText,
          caption: store.caption,
          imageKeywords: store.imageKeywords,
          generatedImages: store.generatedImages,
          fabricSlides: store.fabricSlides,
          chatMessages: store.chatMessages,
        },
        saved_at: new Date().toISOString(),
      };

      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      lastSyncRef.current = JSON.stringify(draft.content);
    } catch (error) {
      console.error('Error saving draft to localStorage:', error);
    }
  }, [user?.id, store]);

  // Sync draft to Supabase
  const syncDraftToSupabase = useCallback(async () => {
    if (!user?.id) return;

    try {
      const draftLocal = localStorage.getItem(DRAFT_KEY);
      if (!draftLocal) return;

      const draft: CarouselDraft = JSON.parse(draftLocal);
      const contentString = JSON.stringify(draft.content);

      // Only sync if content has changed
      if (contentString === lastSyncRef.current) {
        return;
      }

      // Upsert draft to Supabase
      const { data: existing } = await supabase
        .from('carousel_drafts')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .catch(() => ({ data: null }));

      if (existing) {
        // Update existing draft
        const { error } = await supabase
          .from('carousel_drafts')
          .update({
            content: draft.content,
            saved_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Create new draft
        const { error } = await supabase.from('carousel_drafts').insert([
          {
            user_id: user.id,
            content: draft.content,
            saved_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;
      }

      lastSyncRef.current = contentString;
    } catch (error) {
      console.error('Error syncing draft to Supabase:', error);
    }
  }, [user?.id]);

  // Restore draft on mount
  const restoreDraft = useCallback(async () => {
    try {
      // Try to restore from localStorage first
      const draftLocal = localStorage.getItem(DRAFT_KEY);
      if (draftLocal) {
        const draft: CarouselDraft = JSON.parse(draftLocal);
        // Restore store state from draft
        if (draft.content) {
          store.setStep(draft.content.step as any);
          store.setSelectedTemplate(draft.content.selectedTemplate);
          store.setInputType(draft.content.inputType as any);
          store.setInputContent(draft.content.inputContent);
          store.setHooks(draft.content.hooks);
          if (draft.content.selectedHook) {
            store.selectHook(draft.content.selectedHook);
          }
          store.setCarouselText(draft.content.carouselText);
          store.setCaption(draft.content.caption);
          store.setImageKeywords(draft.content.imageKeywords);
          store.setGeneratedImages(draft.content.generatedImages);
          store.setFabricSlides(draft.content.fabricSlides);
          lastSyncRef.current = JSON.stringify(draft.content);
        }
        return;
      }

      // If no local draft, try to restore from Supabase
      if (!user?.id) return;

      const { data } = await supabase
        .from('carousel_drafts')
        .select('content')
        .eq('user_id', user.id)
        .single()
        .catch(() => ({ data: null }));

      if (data?.content) {
        store.setStep(data.content.step as any);
        store.setSelectedTemplate(data.content.selectedTemplate);
        store.setInputType(data.content.inputType as any);
        store.setInputContent(data.content.inputContent);
        store.setHooks(data.content.hooks);
        if (data.content.selectedHook) {
          store.selectHook(data.content.selectedHook);
        }
        store.setCarouselText(data.content.carouselText);
        store.setCaption(data.content.caption);
        store.setImageKeywords(data.content.imageKeywords);
        store.setGeneratedImages(data.content.generatedImages);
        store.setFabricSlides(data.content.fabricSlides);
        lastSyncRef.current = JSON.stringify(data.content);

        // Save to localStorage for faster future loads
        const draftObj: CarouselDraft = {
          id: `draft_${Date.now()}`,
          user_id: user.id,
          content: data.content,
          saved_at: new Date().toISOString(),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftObj));
      }
    } catch (error) {
      console.error('Error restoring draft:', error);
    }
  }, [user?.id, store]);

  // Clear draft
  const clearDraft = useCallback(async () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
      lastSyncRef.current = '';

      if (user?.id) {
        // Delete from Supabase
        await supabase.from('carousel_drafts').delete().eq('user_id', user.id);
      }

      store.reset();
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [user?.id, store]);

  // Setup auto-save on mount and cleanup
  useEffect(() => {
    // Restore draft on mount
    restoreDraft();

    // Save to localStorage immediately when store changes
    const localSaveTimer = setTimeout(() => {
      saveDraftLocal();
    }, 500);

    // Setup periodic sync to Supabase
    syncTimerRef.current = setInterval(() => {
      syncDraftToSupabase();
    }, SYNC_INTERVAL);

    return () => {
      clearTimeout(localSaveTimer);
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
      }
    };
  }, []);

  // Save to localStorage whenever store changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveDraftLocal();
    }, 500);

    return () => clearTimeout(timer);
  }, [
    store.step,
    store.selectedTemplate,
    store.inputType,
    store.inputContent,
    store.hooks,
    store.selectedHook,
    store.carouselText,
    store.caption,
    store.imageKeywords,
    store.generatedImages,
    store.fabricSlides,
    store.chatMessages,
    saveDraftLocal,
  ]);

  return {
    restoreDraft,
    clearDraft,
    saveDraftLocal,
    syncDraftToSupabase,
  };
}
