import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.get('/v1/auth/session', async (request, reply) => {
    const accessToken = request.headers['sb-access-token'] as string | undefined;
    if (!accessToken) {
      return reply.send({ user: null, profile: null });
    }

    const { data, error } = await app.supabase.auth.getUser(accessToken);
    if (error) {
      request.log.warn({ error }, 'failed to fetch supabase user');
      return reply.code(401).send({ user: null, profile: null });
    }

    const profile = data.user
      ? await app.supabase
          .from('profiles')
          .select('*')
          .eq('user_id', data.user.id)
          .maybeSingle()
      : { data: null };

    return reply.send({ user: data.user, profile: profile?.data ?? null });
  });

  app.post('/v1/auth/logout', async (_request, reply) => {
    const BodySchema = z.object({
      accessToken: z.string().optional(),
    });
    const { accessToken } = BodySchema.parse(_request.body ?? {});
    if (accessToken) {
      await app.supabase.auth.admin.signOut(accessToken);
    }
    reply.clearCookie('sb-access-token');
    reply.send({ success: true });
  });
}
