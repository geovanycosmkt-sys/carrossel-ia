import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { UserSettings } from '@/types';
import { useAuth } from './useAuth';

interface UseUserSettingsReturn {
  settings: UserSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettings(updates: Partial<UserSettings>): Promise<UserSettings>;
  refreshSettings(): Promise<void>;
}

/**
 * Hook for managing user settings
 * Uses TanStack Query for efficient caching and server state management
 */
export function useUserSettings(): UseUserSettingsReturn {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Fetch user settings
  const { data: settings, isLoading } = useQuery<UserSettings | null>({
    queryKey: ['userSettings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          // PGRST116 is "no rows found"
          throw error;
        }

        return data || null;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    enabled: !!user?.id,
  });

  // Update settings mutation
  const { mutateAsync: updateMutation } = useMutation({
    mutationFn: async (updates: Partial<UserSettings>) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      try {
        // Prepare update data
        const updateData: any = {
          user_id: user.id,
          ...updates,
          updated_at: new Date().toISOString(),
        };

        // Remove id if present
        delete updateData.id;

        // Try to update existing settings
        const { data: existing } = await supabase
          .from('user_settings')
          .select('id')
          .eq('user_id', user.id)
          .single();

        let result;

        if (existing) {
          // Update existing record
          const { data, error } = await supabase
            .from('user_settings')
            .update(updateData)
            .eq('user_id', user.id)
            .select()
            .single();

          if (error) throw error;
          result = data;
        } else {
          // Create new record
          const { data, error } = await supabase
            .from('user_settings')
            .insert([{ ...updateData, created_at: new Date().toISOString() }])
            .select()
            .single();

          if (error) throw error;
          result = data;
        }

        setError(null);
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Update cache with new settings
      queryClient.setQueryData(['userSettings', user?.id], data);
    },
  });

  const updateSettings = async (updates: Partial<UserSettings>) => {
    return updateMutation(updates);
  };

  const refreshSettings = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['userSettings', user?.id],
    });
  };

  return {
    settings: settings || null,
    isLoading,
    error,
    updateSettings,
    refreshSettings,
  };
}
