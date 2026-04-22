import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@radix-ui/react-tabs';
import { Plus, Loader } from 'lucide-react';
import { ContentItem } from '@/types';
import KanbanBoard from './KanbanBoard';
import IdeasPanel from './IdeasPanel';
import ContentDetailPanel from './ContentDetailPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ContentManagerViewProps {
  onSelectContent?: (item: ContentItem) => void;
  onCreateNew?: () => void;
}

export const ContentManagerView: React.FC<ContentManagerViewProps> = ({
  onSelectContent,
  onCreateNew,
}) => {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      // This would typically come from Supabase
      // For now, we'll use mock data
      setItems([]);
    } catch (error) {
      console.error('Failed to fetch items:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleItemMove = async (itemId: string, newStatus: string) => {
    try {
      setItems(
        items.map((item) =>
          item.id === itemId ? { ...item, status: newStatus as any } : item
        )
      );
      toast.success('Content moved');
    } catch (error) {
      console.error('Failed to move item:', error);
      toast.error('Failed to move content');
    }
  };

  const handleSelectItem = (item: ContentItem) => {
    setSelectedItem(item);
    onSelectContent?.(item);
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      setItems(items.filter((item) => item.id !== itemId));
      setSelectedItem(null);
      toast.success('Content deleted');
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleFavoriteToggle = (id: string) => {
    if (favoriteIds.includes(id)) {
      setFavoriteIds(favoriteIds.filter((fid) => fid !== id));
    } else {
      setFavoriteIds([...favoriteIds, id]);
    }
  };

  const handleCreateNew = () => {
    onCreateNew?.();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-600">Carregando conteúdo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciador de Conteúdo</h2>
        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
        >
          <Plus size={20} />
          Novo Conteúdo
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b border-gray-200">
          <div className="flex gap-1 p-4">
            <TabsTrigger
              value="kanban"
              className="px-4 py-2 font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 cursor-pointer"
            >
              Kanban
            </TabsTrigger>
            <TabsTrigger
              value="ideas"
              className="px-4 py-2 font-medium text-gray-700 hover:text-gray-900 border-b-2 border-transparent hover:border-gray-300 cursor-pointer"
            >
              Ideias IA
            </TabsTrigger>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          <TabsContent value="kanban">
            <KanbanBoard
              items={items}
              onItemMove={handleItemMove}
              onSelectItem={handleSelectItem}
              favoriteIds={favoriteIds}
              onFavoriteToggle={handleFavoriteToggle}
            />
          </TabsContent>

          <TabsContent value="ideas">
            <IdeasPanel
              onSaveIdea={(idea) => {
                const newItem: ContentItem = {
                  id: idea.id,
                  title: idea.title,
                  description: idea.brief,
                  status: 'idea',
                  created_at: idea.created_at,
                  updated_at: idea.updated_at,
                };
                setItems([...items, newItem]);
                toast.success('Idea saved to kanban');
              }}
              onGenerateContent={(idea) => {
                toast.info('Generating content from idea...');
              }}
            />
          </TabsContent>
        </div>
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <ContentDetailPanel
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onEdit={(item) => {
            onSelectContent?.(item);
          }}
          onDelete={handleDeleteItem}
        />
      )}
    </div>
  );
};

export default ContentManagerView;
