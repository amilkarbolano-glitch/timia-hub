import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';

interface Props {
  children: React.ReactNode;
  // En desarrollo: bypass = true omite la protección
  // En producción: bypass = false (default)
  devBypass?: boolean;
}

export default function ProtectedRoute({ children, devBypass = false }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#DC2626' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <span className="text-sm text-slate-400">Cargando Timia Hub...</span>
        </div>
      </div>
    );
  }

  // En desarrollo puedes activar devBypass para saltar el login
  if (!user && !devBypass) {
    return <Login />;
  }

  return <>{children}</>;
}
