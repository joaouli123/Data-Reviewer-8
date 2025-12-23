import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { usePermission } from './usePermission';

export function useRequirePermission(permission) {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  const { hasPermission } = usePermission();

  useEffect(() => {
    if (!loading && user && !hasPermission(permission)) {
      setLocation('/access-denied');
    }
  }, [loading, user, permission, hasPermission, setLocation]);

  return loading || (user && hasPermission(permission));
}
