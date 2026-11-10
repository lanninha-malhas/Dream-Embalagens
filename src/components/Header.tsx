import React from 'react';
import { ShieldCheck, ExternalLink, LogOut } from 'lucide-react';
import { StoreSettings } from '../types.ts';

interface HeaderProps {
  currentView: 'catalog' | 'cart' | 'admin';
  onNavigate: (view: 'catalog' | 'cart' | 'admin') => void;
  cartCount: number;
  onOpenCart: () => void;
  settings: StoreSettings;
  isCloudConnected?: boolean;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  settings,
  onLogout,
}) => {
  return (
    <header className="w-full bg-white border-b border-stone-200/90 shadow-2xs">
      <div
        className={`max-w-md mx-auto px-4 flex items-center justify-between relative ${
          currentView === 'admin' ? 'h-14' : 'h-28'
        }`}
      >
        {currentView === 'admin' ? (
          <div className="flex items-center justify-between w-full">
            <h1 className="text-sm font-bold tracking-tight text-stone-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#302C9B]" />
              <span>Painel</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onNavigate('catalog')}
                className="text-xs font-semibold text-stone-700 hover:text-stone-900 py-1.5 px-2.5 rounded-lg border border-stone-200 bg-stone-100 hover:bg-stone-200 transition-colors cursor-pointer flex items-center gap-1"
                title="Abrir Catálogo Público"
              >
                <span>Catálogo</span>
                <ExternalLink className="w-3 h-3 text-stone-500" />
              </button>
              {onLogout && (
                <button
                  onClick={onLogout}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 py-1.5 px-2 rounded-lg border border-red-200/70 transition-colors cursor-pointer flex items-center gap-1"
                  title="Bloquear Painel / Sair"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`w-full flex items-center py-2 overflow-hidden h-28 ${
              settings.logoPosition === 'left'
                ? 'justify-start'
                : settings.logoPosition === 'right'
                ? 'justify-end'
                : 'justify-center'
            }`}
          >
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.storeName || ''}
                style={{
                  transform: `scale(${1 + (settings.logoZoom ?? 0) / 100})`,
                  transformOrigin:
                    settings.logoPosition === 'left'
                      ? 'left center'
                      : settings.logoPosition === 'right'
                      ? 'right center'
                      : 'center center',
                }}
                className="h-16 sm:h-[72px] w-auto max-w-[280px] object-contain select-none transition-transform duration-150"
              />
            ) : settings.storeName ? (
              <span className="font-bold text-lg tracking-tight text-stone-900">
                {settings.storeName}
              </span>
            ) : null}
          </div>
        )}
      </div>
    </header>
  );
};
