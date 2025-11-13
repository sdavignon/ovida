'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const { user, profile, loading, isAdmin, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Not authenticated - show login option
        return;
      }

      if (requireAdmin && !isAdmin) {
        // User is authenticated but not an admin
        router.push('/');
      }
    }
  }, [user, profile, loading, isAdmin, requireAdmin, router]);

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'monospace'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'monospace',
        gap: '20px'
      }}>
        <div>Authentication required</div>
        <button
          onClick={signInWithGoogle}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: '#4285f4',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontFamily: 'monospace'
      }}>
        <div>Access denied. Admin privileges required.</div>
      </div>
    );
  }

  return <>{children}</>;
};
