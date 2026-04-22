import { create } from 'zustand';
import { supabase } from '@/integrations/supabase/client';
import { ContentItem, KanbanColumn } from '@/types';

export interface ContentStore {
  // State
  contents: ContentItem[];
  columns: KanbanColumn[];
  selectedContent: ContentItem | null;
  view: 'kanban' | 'calendar' | 'list' | 'ideas';
  isLoading: boolean;

  // Actions
  loadContents(): Promise<void>;
  loadColumns(): Promise<void>;
  moveContent(id: string, newStatus: string, position: number): Promise<void>;
  updateContent(id: string, updates: Partial<ContentItem>): Promise<void>;
  deleteContent(id: string): Promise<void>;
  createContent(data: Partial<ContentItem>): Promise<ContentItem>;
  setSelectedContent(content: ContentItem | null): void;
  setView(view: 'kanban' | 'calendar' | 'list' | 'ideas'): void;
  toggleFavorite(id: string): Promise<void>;
}

export const useContentStore = create<ContentStore>((set, get) => ({
  contents: [],
  columns: [],
  selectedContent: null,
  view: 'kanban',
  isLoading: false,

  loadContents: async () => {
    set({ isLoading: true });
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch user's carousels from user_carousels table
      const { data: carousels, error } = await supabase
        .from('user_carousels')
        .select('id, title, description, status, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Transform carousels to ContentItems
      const contentItems: ContentItem[] = (carousels || []).map((carousel: any) => ({
        id: carousel.id,
        title: carousel.title,
        description: carousel.description,
        status: carousel.status || 'draft',
        created_at: carousel.created_at,
        updated_at: carousel.updated_at,
      }));

      set({ contents: contentItems });
    } catch (error) {
      console.error('Error loading contents:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  loadColumns: async () => {
    set({ isLoading: true });
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch kanban columns for user
      const { data: columnsData, error } = await supabase
        .from('kanban_columns')
        .select('id, title, order')
        .eq('user_id', user.id)
        .order('order', { ascending: true });

      if (error) {
        throw error;
      }

      // Initialize columns with empty items
      const columns: KanbanColumn[] = (columnsData || []).map((col: any) => ({
        id: col.id,
        title: col.title,
        order: col.order,
        items: [],
      }));

      // For each column, fetch its items from user_carousels
      for (const column of columns) {
        const { data: items, error: itemsError } = await supabase
          .from('user_carousels')
          .select('id, title, description, created_at, updated_at')
          .eq('user_id', user.id)
          .eq('status', column.title.toLowerCase());

        if (!itemsError && items) {
          column.items = items.map((item: any) => ({
            id: item.id,
            title: item.title,
            description: item.description,
            status: column.title.toLowerCase(),
            created_at: item.created_at,
            updated_at: item.updated_at,
          }));
        }
      }

      set({ columns });
    } catch (error) {
      console.error('Error loading columns:', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  moveContent: async (id: string, newStatus: string, position: number) => {
    try {
      const { data, error } = await supabase
        .from('user_carousels')
        .update({ status: newStatus })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Update local state
      const updatedContents = get().contents.map((item) =>
        item.id === id ? { ...item, status: newStatus as any } : item
      );

      set({ contents: updatedContents });

      // Reload columns to reflect the change
      await get().loadColumns();
    } catch (error) {
      console.error('Error moving content:', error);
      throw error;
    }
  },

  updateContent: async (id: string, updates: Partial<ContentItem>) => {
    try {
      const updateData: any = {};
      if (updates.title) updateData.title = updates.title;
      if (updates.description) updateData.description = updates.description;
      if (updates.status) updateData.status = updates.status;

      const { error } = await supabase
        .from('user_carousels')
        .update(updateData)
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      const updatedContents = get().contents.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );

      set({ contents: updatedContents });

      // Update selected content if it's the one being edited
      const selected = get().selectedContent;
      if (selected?.id === id) {
        set({ selectedContent: { ...selected, ...updates } });
      }
    } catch (error) {
      console.error('Error updating content:', error);
      throw error;
    }
  },

  deleteContent: async (id: string) => {
    try {
      const { error } = await supabase.from('user_carousels').delete().eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      const updatedContents = get().contents.filter((item) => item.id !== id);
      set({ contents: updatedContents });

      // Clear selection if the deleted item was selected
      if (get().selectedContent?.id === id) {
        set({ selectedContent: null });
      }
    } catch (error) {
      console.error('Error deleting content:', error);
      throw error;
    }
  },

  createContent: async (data: Partial<ContentItem>) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const newContent = {
        user_id: user.id,
        title: data.title || 'Untitled',
        description: data.description || '',
        status: data.status || 'idea',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: created, error } = await supabase
        .from('user_carousels')
        .insert([newContent])
        .select()
        .single();

      if (error) {
        throw error;
      }

      const contentItem: ContentItem = {
        id: created.id,
        title: created.title,
        description: created.description,
        status: created.status,
        created_at: created.created_at,
        updated_at: created.updated_at,
      };

      // Update local state
      const updatedContents = [...get().contents, contentItem];
      set({ contents: updatedContents });

      return contentItem;
    } catch (error) {
      console.error('Error creating content:', error);
      throw error;
    }
  },

  setSelectedContent: (content: ContentItem | null) => {
    set({ selectedContent: content });
  },

  setView: (view: 'kanban' | 'calendar' | 'list' | 'ideas') => {
    set({ view });
  },

  toggleFavorite: async (id: string) => {
    try {
      // Note: This assumes there's a favorite/starred column in user_carousels
      // Adjust based on actual schema
      const item = get().contents.find((c) => c.id === id);
      if (!item) return;

      const { error } = await supabase
        .from('user_carousels')
        .update({ is_favorite: !item.updated_at })
        .eq('id', id);

      if (error) {
        throw error;
      }

      // Update local state
      const updatedContents = get().contents.map((c) =>
        c.id === id ? { ...c, updated_at: new Date().toISOString() } : c
      );

      set({ contents: updatedContents });
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },
}));
