import React, { useState } from 'react';
import { Lock, ChevronRight, ArrowLeft, Check } from 'lucide-react';
import { useAuth, MOCK_ACCOUNTS, AuthUser } from '../contexts/AuthContext';
import { adminStore } from '../lib/adminStore';
import { TimiaWordmark, TimiaMark } from './TimiaLogo';

type Step = 'initial' | 'picker' | 'verifying';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const features = [
  'Seguimiento de tareas e ingestas ADA',
  'Inventario de objetos y Control-M',
  'Bitácora de cambios funcionales',
  'Monitor de ANS y alertas en tiempo real',
  'Asistente Gemini con contexto TIMIA',
];

export default function Login() {
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('initial');
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [progress, setProgress] = useState(0);

  const storeUsers = adminStore.getUsers().filter(u => u.active);
  const accounts: AuthUser[] = (storeUsers.length > 0 ? storeUsers : MOCK_ACCOUNTS) as AuthUser[];

  const handleSelectAccount = (account: AuthUser) => {
    setSelected(account);
    setStep('verifying');
    setProgress(0);
    setTimeout(() => setProgress(100), 80);
    setTimeout(() => login(account), 1800);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl overflow-hidden border border-slate-200 flex" style={{ minHeight: '520px' }}>

        {/* Panel izquierdo — branding */}
        <div className="hidden md:flex flex-col justify-between p-10 w-5/12" style={{ background: '#1a1a2e' }}>
          <div>
            {/* Logo TIMIA — inline SVG, siempre visible en fondo oscuro */}
            <div className="flex items-center gap-3 mb-6">
              <svg width="38" height="38" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <path d="M 18,74 L 40,22 L 60,22 L 82,74 Z" fill="white" />
                <path d="M 29,68 L 43,30 L 57,30 L 71,68 Z" fill="#1a1a2e" />
                <rect x="14" y="78" width="72" height="12" rx="2" fill="#DC2626" />
              </svg>
              <span style={{ color: 'white', fontFamily: "'Arial Black','Helvetica Neue',Arial,sans-serif", fontWeight: 900, fontSize: 28, letterSpacing: '-0.5px', lineHeight: 1 }}>TIMIA</span>
            </div>
            <p className="text-sm mb-8" style={{ color: '#8892b0' }}>Plataforma de gestión de proyectos de datos</p>
            <div className="space-y-3">
              {features.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#DC2626' }} />
                  <span className="text-xs" style={{ color: '#a8b2d8' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs" style={{ color: '#4a5568' }}>© 2026 TIMIA · Gobierno del dato · v1.0</p>
        </div>

        {/* Panel derecho — login */}
        <div className="flex flex-col items-center justify-center p-10 flex-1">
          <div className="w-full max-w-xs">

            {/* Logo móvil — A-mark con fondo oscuro */}
            <div className="flex justify-center mb-6 md:hidden">
              <TimiaMark size={48} bg="rounded" />
            </div>

            {/* Logo móvil visible en pantallas md+ cuando no hay panel izquierdo */}
            <div className="hidden md:flex justify-center mb-4">
              {/* espacio invisible para alinear con el panel */}
            </div>

            <h2 className="text-lg font-medium text-slate-900 text-center mb-1">Bienvenido</h2>
            <p className="text-sm text-slate-500 text-center mb-6">Inicia sesión para continuar en Timia Hub</p>

            {/* Badge dominio */}
            <div className="flex justify-center mb-5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
                <Lock size={11} />
                Solo cuentas @timia.ai
              </span>
            </div>

            {/* Paso 1: botón inicial */}
            {step === 'initial' && (
              <div>
                <button
                  onClick={() => setStep('picker')}
                  className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg border text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                  style={{ borderColor: '#dadce0' }}
                >
                  <GoogleIcon />
                  Continuar con Google
                  <ChevronRight size={14} className="text-slate-400" />
                </button>
                <p className="text-xs text-slate-400 text-center mt-3">Se abrirá el selector de cuenta Google</p>
              </div>
            )}

            {/* Paso 2: selector de cuentas */}
            {step === 'picker' && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-2">Elige tu cuenta TIMIA</p>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: '#dadce0' }}>
                  <div className="px-3 py-2 bg-slate-50 border-b text-xs text-slate-500" style={{ borderColor: '#f3f4f6' }}>
                    Cuentas disponibles
                  </div>
                  {accounts.map((acc) => (
                    <button
                      key={acc.id}
                      onClick={() => handleSelectAccount(acc)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition-colors border-b last:border-0 text-left"
                      style={{ borderColor: '#f3f4f6' }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                        style={{ background: acc.avatarColor + '18', color: acc.avatarColor }}
                      >
                        {acc.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 truncate">{acc.name}</p>
                        <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                      </div>
                    </button>
                  ))}
                  <div className="flex items-center gap-3 px-3 py-2.5 opacity-50 cursor-not-allowed border-t" style={{ borderColor: '#f3f4f6' }}>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-400 text-lg leading-none">+</span>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Usar otra cuenta @timia.ai</p>
                      <p className="text-xs text-slate-400">Solo cuentas corporativas</p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStep('initial')}
                  className="w-full flex items-center justify-center gap-1 mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <ArrowLeft size={12} />
                  Volver
                </button>
              </div>
            )}

            {/* Paso 3: verificando */}
            {step === 'verifying' && selected && (
              <div className="text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-medium mx-auto mb-3"
                  style={{ background: selected.avatarColor + '18', color: selected.avatarColor }}
                >
                  {selected.initials}
                </div>
                <p className="text-sm font-medium text-slate-800 mb-0.5">{selected.name}</p>
                <p className="text-xs text-slate-400 mb-4">{selected.email}</p>
                <div className="flex items-center justify-center gap-1.5 text-xs mb-4" style={{ color: '#059669' }}>
                  <Check size={14} />
                  Verificando cuenta TIMIA...
                </div>
                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ background: '#DC2626', width: `${progress}%`, transition: 'width 1.5s ease' }}
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400 text-center mt-5">
              Al iniciar sesión aceptas los términos de uso internos de TIMIA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
