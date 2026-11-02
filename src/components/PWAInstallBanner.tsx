import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { Download, Share2, PlusSquare, X, Smartphone, Check } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Se já estiver rodando como aplicativo instalado (standalone) ou foi dispensado na sessão, não exibe
  if (isInstalled || isDismissed) {
    return null;
  }

  // Se não for nem instalável no Chromium nem dispositivo iOS, não exibe
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="mx-0.5 mb-2.5 p-3 rounded-2xl bg-gradient-to-r from-[#1F1B68] to-[#302C9B] text-white shadow-md border border-[#302C9B]/40 relative overflow-hidden transition-all animate-in fade-in slide-in-from-top-2 duration-300">
        {/* Glow decorativo sutil */}
        <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2.5 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-white text-[#302C9B] flex items-center justify-center shrink-0 shadow-xs">
            <Smartphone className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-white tracking-tight leading-tight flex items-center gap-1.5">
              <span>Instalar Aplicativo</span>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-1.5 py-0.5 rounded-md">
                PWA
              </span>
            </h4>
            <p className="text-[11px] text-stone-200 leading-tight mt-0.5 truncate">
              Acesso rápido ao catálogo na tela inicial
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable && (
              <button
                type="button"
                onClick={install}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 active:scale-[0.97] text-[#302C9B] text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </button>
            )}

            {isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-stone-100 active:scale-[0.97] text-[#302C9B] text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Como Instalar</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="p-1 text-stone-300 hover:text-white rounded-lg transition-colors cursor-pointer"
              aria-label="Fechar aviso de instalação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Guiado para usuários iOS (iPhone / iPad) */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#302C9B]/10 text-[#302C9B] flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-[#302C9B]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-stone-900 leading-tight">Instalar no iPhone / iPad</h3>
                  <p className="text-[11px] text-stone-500">Adicione o catálogo como app na tela de início</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-700">
              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                <span className="w-6 h-6 rounded-full bg-[#302C9B] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                    Toque em Compartilhar <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    No navegador Safari, clique no ícone de compartilhamento na barra inferior.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                <span className="w-6 h-6 rounded-full bg-[#302C9B] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                    Role e toque em <PlusSquare className="w-3.5 h-3.5 text-stone-700 inline" /> &ldquo;Adicionar à Tela de Início&rdquo;
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Você verá o ícone do aplicativo na sua tela de início.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-2xl bg-stone-50 border border-stone-200/80">
                <span className="w-6 h-6 rounded-full bg-[#302C9B] text-white text-[11px] font-black flex items-center justify-center shrink-0">
                  3
                </span>
                <div>
                  <p className="font-semibold text-stone-900 flex items-center gap-1.5">
                    Toque em <Check className="w-3.5 h-3.5 text-emerald-600 inline" /> &ldquo;Adicionar&rdquo;
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    Pronto! O catálogo abrirá direto como aplicativo de alta velocidade.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#302C9B] text-white text-xs font-bold hover:bg-[#25227B] transition-colors cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
