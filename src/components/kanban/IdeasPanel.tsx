import React, { useState, useEffect } from 'react';
import { RefreshCw, Save, Play, Trash2, Loader } from 'lucide-react';
import { ContentIdea } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IdeasPanelProps {
  onSaveIdea?: (idea: ContentIdea) => void;
  onGenerateContent?: (idea: ContentIdea) => void;
}

export const IdeasPanel: React.FC<IdeasPanelProps> = ({ onSaveIdea, onGenerateContent }) => {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('content-ideas', {
        body: { action: 'list' },
      });

      if (error) throw error;
      setIdeas(data.ideas || []);
    } catch (error) {
      console.error('Failed to fetch ideas:', error);
      toast.error('Failed to load ideas');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchIdeas();
      toast.success('Ideas refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveIdea = async (idea: ContentIdea) => {
    try {
      onSaveIdea?.(idea);
      toast.success('Idea saved to kanban');
    } catch (error) {
      console.error('Failed to save idea:', error);
      toast.error('Failed to save idea');
    }
  };

  const handleGenerateContent = async (idea: ContentIdea) => {
    try {
      onGenerateContent?.(idea);
      toast.success('Starting content generation');
    } catch (error) {
      console.error('Failed to generate content:', error);
      toast.error('Failed to generate content');
    }
  };

  const handleDiscardIdea = async (id: string) => {
    try {
      setIdeas(ideas.filter((idea) => idea.id !== id));
      toast.success('Idea discarded');
    } catch (error) {
      console.error('Failed to discard idea:', error);
      toast.error('Failed to discard idea');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4" size={32} />
          <p className="text-gray-600">Carregando ideias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-gray-900">Ideias Geradas por IA</h3>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Ideas Grid */}
      {ideas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-2">Nenhuma ideia gerada ainda</p>
          <p className="text-sm text-gray-500">Clique em "Atualizar" para buscar novas ideias</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              {/* Title */}
              <h4 className="font-bold text-gray-900 mb-2 line-clamp-2">{idea.title}</h4>

              {/* Brief */}
              <p className="text-sm text-gray-700 mb-3 line-clamp-3">{idea.brief}</p>

              {/* Tags */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {idea.niche && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                    {idea.niche}
                  </span>
                )}
                {idea.content_type && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    {idea.content_type}
                  </span>
                )}
                {idea.status && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    {idea.status}
                  </span>
                )}
              </div>

              {/* Hooks */}
              {idea.hooks && idea.hooks.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-900 mb-2">Hooks:</p>
                  {idea.hooks.slice(0, 2).map((hook, idx) => (
                    <p key={idx} className="text-xs text-yellow-800 mb-1 line-clamp-1">
                      • {hook.text}
                    </p>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => handleSaveIdea(idea)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-600 rounded hover:bg-green-100 text-sm font-medium transition-colors"
                >
                  <Save size={16} />
                  Salvar
                </button>
                <button
                  onClick={() => handleGenerateContent(idea)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 text-sm font-medium transition-colors"
                >
                  <Play size={16} />
                  Gerar
                </button>
                <button
                  onClick={() => handleDiscardIdea(idea.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm font-medium transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default IdeasPanel;
