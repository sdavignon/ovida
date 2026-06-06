'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, requireAdmin = false }) => {
  const { user, profile, loading, isAdmin, signInWithGoogle, authError } = useAuth();
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
        {authError ? (
          <div style={{ color: '#f87171', maxWidth: '360px', textAlign: 'center' }}>{authError}</div>
        ) : null}
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
        <Link
          href="/admin/api-tests"
          style={{
            color: '#93c5fd',
            fontSize: '14px',
            textDecoration: 'underline'
          }}
        >
          Open API Test Tools
        </Link>
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
