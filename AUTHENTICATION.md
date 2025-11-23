# Ovida Authentication & Authorization

This document describes the authentication and authorization system implemented in Ovida.

## Overview

Ovida uses Supabase for authentication with role-based access control (RBAC). The system protects both API endpoints and frontend pages.

## Architecture

### Backend (API)

- **Authentication Middleware** (`apps/api/src/middleware/auth.ts`)
  - `requireAuth(app)` - Requires valid Supabase access token
  - `requireRole(...roles)` - Requires user to have one of the specified roles
  - `requireAdmin(app)` - Shorthand for requiring admin role
  - `optionalAuth(app)` - Attaches user/profile if token provided

### Frontend (Web)

- **Auth Context** (`apps/web/lib/auth-context.tsx`)
  - Manages authentication state
  - Provides hooks: `useAuth()`
  - Handles Google OAuth sign-in

- **Auth Guard** (`apps/web/components/auth-guard.tsx`)
  - Protects pages requiring authentication
  - Can require admin role with `requireAdmin` prop

## User Roles

Defined in database (`supabase/migrations/0002_profiles_roles.sql`):

- `admin` - Full platform control (all admin functions)
- `producer` - Story creation and management
- `moderator` - Content moderation and reporting
- `analyst` - Analytics and metrics review
- `user` - Default role for all authenticated users

## Protected Endpoints

### Admin-Only Endpoints
- `POST /v1/scenes/images` - Scene image generation (OpenAI)

### Authenticated User Endpoints
- `POST /v1/runs` - Create a new run
- `POST /v1/runs/:id/next` - Get next beat in run
- `POST /v1/rooms` - Create a new room

### Public Endpoints
- `GET /v1/auth/session` - Get current session
- `POST /v1/auth/logout` - Logout
- `POST /v1/demos/*` - Demo flow for guest users
- `GET /v1/stories` - List stories

## Setup Instructions

### 1. Configure Supabase

Add the following to your `.env` file:

```bash
# Backend API
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Frontend (Next.js)
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 2. Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URIs:
   - `http://localhost:54321/auth/v1/callback` (local)
   - `https://your-project.supabase.co/auth/v1/callback` (production)
4. Add credentials to `.env`:

```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
```

5. In Supabase Dashboard:
   - Go to Authentication > Providers
   - Enable Google
   - Add your Client ID and Secret

### 3. Run Database Migrations

```bash
# If using local Supabase
pnpm supabase migration up

# Or apply migrations manually in Supabase Dashboard
```

Migrations include:
- `0001_init.sql` - Initial schema with profiles table
- `0002_profiles_roles.sql` - Add role column and constraints
- `0003_admin_user_setup.sql` - Auto-assign admin role to designated users

### 4. Set Admin User

The migration `0003_admin_user_setup.sql` automatically sets `sdavignon1@gmail.com` as an admin.

To add more admin users, either:

**Option A: Update the migration before running it**
```sql
-- In 0003_admin_user_setup.sql, modify the email check
WHERE email IN ('sdavignon1@gmail.com', 'another-admin@example.com')
```

**Option B: Manually update the database**
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'new-admin@example.com'
);
```

### 5. Install Dependencies

```bash
# From project root
pnpm install
```

## Usage

### Backend - Protecting Routes

```typescript
import { requireAuth, requireAdmin } from '../middleware/auth';

// Require any authenticated user
app.post('/v1/runs', { preHandler: requireAuth(app) }, async (request, reply) => {
  // Access user via request.user and request.profile
  const userId = request.user?.id;
  const userRole = request.profile?.role;
  // ...
});

// Require admin role
app.post('/v1/admin/action', { preHandler: requireAdmin(app) }, async (request, reply) => {
  // Only admins can reach here
  // ...
});
```

### Frontend - Protecting Pages

```tsx
import { AuthGuard } from '@/components/auth-guard';

export default function AdminPage() {
  return (
    <AuthGuard requireAdmin>
      {/* Only admins can see this content */}
      <div>Admin Dashboard</div>
    </AuthGuard>
  );
}
```

### Frontend - Using Auth Context

```tsx
'use client';

import { useAuth } from '@/lib/auth-context';

export default function MyComponent() {
  const { user, profile, isAdmin, signInWithGoogle, signOut } = useAuth();

  if (!user) {
    return <button onClick={signInWithGoogle}>Sign In</button>;
  }

  return (
    <div>
      <p>Welcome, {profile?.display_name}!</p>
      <p>Role: {profile?.role}</p>
      {isAdmin && <p>You are an admin!</p>}
      <button onClick={signOut}>Sign Out</button>
    </div>
  );
}
```

### Making Authenticated API Calls

The API wrapper (`apps/web/lib/api.ts`) automatically includes auth tokens:

```typescript
import { api } from '@/lib/api';

// Token is automatically attached from Supabase session
const response = await api.post('/v1/runs', {
  body: JSON.stringify({ story_id: 'haunted-shore', seed: 42 })
});
```

## Security Features

### Row-Level Security (RLS)

Supabase RLS policies (`supabase/policies/rls.sql`) provide database-level protection:

- **Profiles**: Users can read all profiles, update only their own (role must stay 'user')
- **Runs**: Public/unlisted runs are visible to all; private runs only to owner
- **Events**: Inherit visibility from parent run
- **Rooms**: Public unless in lobby status (then owner-only)

### API Middleware

- Validates Supabase access tokens
- Checks user roles before allowing access
- Returns appropriate HTTP status codes (401 Unauthorized, 403 Forbidden)

### Frontend Guards

- Redirects unauthenticated users to sign-in
- Hides admin pages from non-admin users
- Shows loading state during auth check

## Testing

### Testing Authentication Flow

1. Start the application:
   ```bash
   pnpm dev
   ```

2. Navigate to `/admin` in your browser

3. You should be prompted to sign in with Google

4. After signing in, if you're not an admin, you'll see "Access denied"

5. If you're the configured admin user, you'll see the admin dashboard

### Testing API Protection

```bash
# Without authentication - should fail
curl -X POST http://localhost:4000/v1/runs \
  -H "Content-Type: application/json" \
  -d '{"story_id": "test", "seed": 42}'

# With authentication - should succeed
curl -X POST http://localhost:4000/v1/runs \
  -H "Content-Type: application/json" \
  -H "sb-access-token: YOUR_ACCESS_TOKEN" \
  -d '{"story_id": "test", "seed": 42}'
```

## Troubleshooting

### "Authentication required" on all pages

- Check that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
- Verify Supabase is running (for local development)
- Check browser console for errors

### Can't sign in with Google

- Verify Google OAuth credentials are configured in Supabase Dashboard
- Check that redirect URIs are correctly set in Google Cloud Console
- Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are in `.env`

### User is authenticated but shows as 'user' role instead of 'admin'

- Check that the migration `0003_admin_user_setup.sql` has been applied
- Verify the email in the migration matches the user's Google account email
- Try signing out and signing in again
- Check the database directly:
  ```sql
  SELECT p.role, u.email
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id;
  ```

### API returns 401 even with valid token

- Check that the token is being sent in the `sb-access-token` header
- Verify the Supabase URL matches between frontend and backend
- Ensure the backend has access to `SUPABASE_SERVICE_ROLE_KEY`

## Additional Resources

- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Next.js Authentication](https://nextjs.org/docs/authentication)
