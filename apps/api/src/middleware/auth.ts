import type { FastifyRequest, FastifyReply, FastifyInstance } from 'fastify';
import type { User } from '@supabase/supabase-js';
import { ensureUserProfile } from '../services/auth.supabase';

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  role?: string;
  created_at?: string;
}

// Extend FastifyRequest to include authenticated user and profile
declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    profile?: ProfileRow;
  }
}

/**
 * Middleware that requires authentication
 * Attaches user and profile to request if authenticated
 */
export const requireAuth = (app: FastifyInstance) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const accessToken =
      (request.headers['sb-access-token'] as string | undefined) ||
      (request.cookies?.['sb-access-token'] as string | undefined);

    if (!accessToken) {
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide a valid access token.',
      });
    }

    const { data, error } = await app.supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      request.log.warn({ error }, 'Failed to authenticate user');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Invalid or expired access token.',
      });
    }

    try {
      const profile = await ensureUserProfile({
        supabase: app.supabase,
        user: data.user,
        logger: request.log,
      });

      request.user = data.user;
      request.profile = profile || undefined;
    } catch (err) {
      request.log.error({ err }, 'Failed to ensure user profile');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to load user profile.',
      });
    }
  };
};

/**
 * Middleware that requires a specific role
 * Must be used after requireAuth
 */
export const requireRole = (...allowedRoles: string[]) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.profile) {
      request.log.warn('requireRole called without profile - ensure requireAuth is applied first');
      return reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required.',
      });
    }

    const userRole = request.profile.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      request.log.warn(
        { userId: request.profile.user_id, userRole, allowedRoles },
        'User does not have required role'
      );
      return reply.code(403).send({
        error: 'Forbidden',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
      });
    }
  };
};

/**
 * Middleware that requires admin role
 */
export const requireAdmin = (app: FastifyInstance) => {
  const authMiddleware = requireAuth(app);
  const roleMiddleware = requireRole('admin');

  return async (request: FastifyRequest, reply: FastifyReply) => {
    await authMiddleware(request, reply);
    if (reply.sent) return;
    await roleMiddleware(request, reply);
  };
};

/**
 * Optional auth - attaches user/profile if token provided but doesn't require it
 */
export const optionalAuth = (app: FastifyInstance) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const accessToken =
      (request.headers['sb-access-token'] as string | undefined) ||
      (request.cookies?.['sb-access-token'] as string | undefined);

    if (!accessToken) {
      return;
    }

    const { data, error } = await app.supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return;
    }

    try {
      const profile = await ensureUserProfile({
        supabase: app.supabase,
        user: data.user,
        logger: request.log,
      });

      request.user = data.user;
      request.profile = profile || undefined;
    } catch (err) {
      request.log.error({ err }, 'Failed to ensure user profile in optional auth');
    }
  };
};
