import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: 'admin' | 'leader' | 'member' | 'guest';
  avatarColor: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isLoading: true,
});

// Cuentas simuladas @timia.ai — en producción reemplazar por Cloudflare Access / Google OAuth
export const MOCK_ACCOUNTS: AuthUser[] = [
  { id: 'u-1', name: 'Amilkar Bolaño',     email: 'amilkar.bolano@timia.ai',    initials: 'AB', role: 'leader',  avatarColor: '#DC2626' },
  { id: 'u-2', name: 'Juan Pablo Arévalo', email: 'jp.arevalo@timia.ai',        initials: 'JP', role: 'admin',   avatarColor: '#1d4ed8' },
  { id: 'u-3', name: 'Alfonso Portillo',   email: 'a.portillo@timia.ai',        initials: 'AP', role: 'leader',  avatarColor: '#065f46' },
  { id: 'u-4', name: 'Sergio Rodriguez',   email: 's.rodriguez@timia.ai',       initials: 'SR', role: 'member',  avatarColor: '#7c3aed' },
  { id: 'u-5', name: 'Fabrizio Atiquipa',  email: 'f.atiquipa@timia.ai',        initials: 'FA', role: 'member',  avatarColor: '#b45309' },
];

const STORAGE_KEY = 'timia_hub_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {}
    setIsLoading(false);
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch {}
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
