import React, { useState } from 'react';
import { Lock, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AdminLoginModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  expectedPassword?: string;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  onSuccess,
  onCancel,
  expectedPassword = 'abc1234',
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Por favor, informe a senha de acesso.');
      return;
    }

    const targetPass = expectedPassword || 'abc1234';
    if (password === targetPass) {
      setError(null);
      onSuccess();
    } else {
      setError('Senha incorreta. Acesso não autorizado.');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-stone-200 p-6 space-y-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-auth-title"
      >
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-cyan-100 text-[#002B49] mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7 text-[#002B49]" />
          </div>
          <h2 id="admin-auth-title" className="text-lg font-bold text-stone-900">
            Acesso Restrito
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                className="w-full h-11 pl-3.5 pr-10 text-sm bg-stone-50 focus:bg-white rounded-xl border border-stone-300 focus:border-[#22CBD0] focus:ring-1 focus:ring-[#22CBD0] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
                title={showPassword ? 'Ocultar senha' : 'Ver senha'}
                aria-label={showPassword ? 'Ocultar senha' : 'Ver senha'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <button
              type="submit"
              className="w-full h-11 bg-[#22CBD0] hover:bg-[#1db9be] active:bg-[#18a6ab] active:scale-[0.98] text-[#002B49] font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-[#22CBD0]/20 transition-all cursor-pointer"
            >
              <span>Entrar no Painel</span>
              <ArrowRight className="w-4 h-4 text-[#002B49]" />
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full h-10 text-stone-600 hover:text-stone-900 hover:bg-stone-100 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar ao Catálogo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
