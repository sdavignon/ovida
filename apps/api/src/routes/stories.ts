import type { FastifyInstance } from 'fastify';

export async function registerStoryRoutes(app: FastifyInstance) {
  app.get('/v1/stories', async (_request, reply) => {
    const { data, error } = await app.supabase.from('stories').select('*');
    if (error) {
      throw error;
    }
    reply.send({ stories: data });
  });
}
