import { z } from 'zod';
import { ensureUserProfile } from '../services/auth.supabase';
export async function registerAuthRoutes(app) {
    app.get('/v1/auth/session', async (request, reply) => {
        const accessToken = request.headers['sb-access-token'];
        if (!accessToken) {
            return reply.send({ user: null, profile: null });
        }
        const { data, error } = await app.supabase.auth.getUser(accessToken);
        if (error) {
            request.log.warn({ error }, 'failed to fetch supabase user');
            return reply.code(401).send({ user: null, profile: null });
        }
        let profile = null;
        if (data.user) {
            try {
                profile = await ensureUserProfile({
                    supabase: app.supabase,
                    user: data.user,
                    logger: request.log,
                });
            }
            catch (err) {
                request.log.error({ err }, 'failed to ensure user profile for session');
                return reply.code(500).send({ user: data.user, profile: null });
            }
        }
        return reply.send({ user: data.user, profile });
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
