import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xl animate-bounce"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Modo Offline — Exibindo dados em cache do catálogo.</span>
    </div>
  );
};
