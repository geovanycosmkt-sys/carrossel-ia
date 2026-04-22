import { useContext } from 'react';
import { AuthContext } from '@/components/auth/AuthProvider';

/**
 * Hook to access the Auth context
 * Provides user authentication state and methods
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
