import { usePermission } from '@/hooks/usePermission';
import { Lock } from 'lucide-react';

export function ProtectedFeature({ permission, children, fallback = null }) {
  const { hasPermission } = usePermission();

  if (!hasPermission(permission)) {
    return fallback || (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-3">
        <Lock className="w-4 h-4 text-amber-600" />
        <p className="text-sm text-amber-800">Você não tem permissão para acessar este recurso</p>
      </div>
    );
  }

  return children;
}

export function ProtectedButton({ permission, children, ...props }) {
  const { hasPermission } = usePermission();
  
  return (
    <div title={!hasPermission(permission) ? 'Você não tem permissão para essa ação' : ''}>
      {children({ disabled: !hasPermission(permission) })}
    </div>
  );
}
