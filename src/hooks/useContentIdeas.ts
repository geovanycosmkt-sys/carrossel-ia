import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ContentIdea } from '@/types';
import { useAuth } from './useAuth';

interface UseContentIdeasReturn {
  ideas: ContentIdea[];
  isLoading: boolean;
  error: Error | null;
  refreshIdeas(bypassCache?: boolean): Promise<void>;
  approveIdea(idea: ContentIdea): Promise<void>;
  dismissIdea(idea: ContentIdea): Promise<void>;
}

/**
 * Hook for fetching and managing AI-generated content ideas
 */
export function useContentIdeas(): UseContentIdeasReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Fetch content ideas
  const { data: ideas = [], isLoading } = useQuery<ContentIdea[]>({
    queryKey: ['contentIdeas', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      try {
        // Call the content-ideas edge function
        const { data, error } = await supabase.functions.invoke('content-ideas', {
          body: {
            user_id: user.id,
          },
        });

        if (error) {
          throw new Error(error.message || 'Failed to fetch content ideas');
        }

        setError(null);

        // Return ideas, handling both direct array and nested response
        return Array.isArray(data) ? data : data.ideas || [];
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Approve idea mutation
  const { mutateAsync: approveMutation } = useMutation({
    mutationFn: async (idea: ContentIdea) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        // Save idea to kanban/user_carousels
        const { error } = await supabase.from('user_carousels').insert([
          {
            user_id: user.id,
            title: idea.title,
            description: idea.brief,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

        if (error) throw error;

        // Mark idea as approved in database
        await supabase
          .from('content_ideas')
          .update({ status: 'ready' })
          .eq('id', idea.id)
          .catch(() => {
            // Silently fail if table doesn't exist
          });

        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate ideas cache
      queryClient.invalidateQueries({
        queryKey: ['contentIdeas', user?.id],
      });
    },
  });

  // Dismiss idea mutation
  const { mutateAsync: dismissMutation } = useMutation({
    mutationFn: async (idea: ContentIdea) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        // Mark idea as dismissed
        await supabase
          .from('content_ideas')
          .update({ status: 'brainstorm' })
          .eq('id', idea.id)
          .catch(() => {
            // Silently fail if table doesn't exist
          });

        setError(null);
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate ideas cache
      queryClient.invalidateQueries({
        queryKey: ['contentIdeas', user?.id],
      });
    },
  });

  const refreshIdeas = useCallback(
    async (bypassCache = false) => {
      if (bypassCache) {
        // Invalidate cache to force refetch
        await queryClient.invalidateQueries({
          queryKey: ['contentIdeas', user?.id],
        });
      }

      // Refetch
      return queryClient.refetchQueries({
        queryKey: ['contentIdeas', user?.id],
      });
    },
    [user?.id, queryClient]
  );

  const approveIdea = useCallback(
    async (idea: ContentIdea) => {
      return approveMutation(idea);
    },
    [approveMutation]
  );

  const dismissIdea = useCallback(
    async (idea: ContentIdea) => {
      return dismissMutation(idea);
    },
    [dismissMutation]
  );

  return {
    ideas,
    isLoading,
    error,
    refreshIdeas,
    approveIdea,
    dismissIdea,
  };
}
