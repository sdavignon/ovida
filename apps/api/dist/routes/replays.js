import { z } from 'zod';
import { ReplaySchema } from '@ovida/schemas';
export async function registerReplayRoutes(app) {
    app.get('/v1/replays/:id/verify', async (request, reply) => {
        const ParamsSchema = z.object({ id: z.string() });
        const { id } = ParamsSchema.parse(request.params);
        const QuerySchema = z.object({ replay: z.string() });
        const { replay } = QuerySchema.parse(request.query);
        const parsed = ReplaySchema.safeParse(JSON.parse(replay));
        if (!parsed.success) {
            return reply.code(400).send({ id, valid: false, errors: parsed.error.flatten() });
        }
        return reply.send({ id, valid: true });
    });
}
