import { createContext, useContext, type ReactNode } from 'react';
import { useCurrentUser } from '../api/auth';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isReadOnly: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAdmin: false,
  isReadOnly: true,
  isAuthenticated: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status" />
      </div>
    );
  }

  if (isError || !user) {
    window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
    return null;
  }

  const isAdmin = user.role === 'superadmin' || user.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        isReadOnly: user.role === 'readonly',
        isAuthenticated: true,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
