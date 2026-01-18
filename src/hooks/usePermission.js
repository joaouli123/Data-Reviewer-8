import { useAuth } from '@/contexts/AuthContext';

export function usePermission() {
  const { user } = useAuth();

  const hasPermission = (permission) => {
    // Super admin tem todas as permissões
    if (user?.isSuperAdmin) return true;

    // Admin tem todas as permissões
    if (user?.role === 'admin') return true;

    // Se não tem permissions, usa role padrão
    if (!user?.permissions) {
      return false;
    }

    try {
      const perms = typeof user.permissions === 'string' 
        ? JSON.parse(user.permissions) 
        : user.permissions;
      return perms[permission] === true;
    } catch (e) {
      return false;
    }
  };

  const hasAnyPermission = (permissions) => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions) => {
    return permissions.every(p => hasPermission(p));
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    userPermissions: user?.permissions ? 
      (typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions) 
      : {}
  };
}
