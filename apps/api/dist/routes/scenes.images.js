import { z } from 'zod';
import { generateSceneImages, SceneImageError } from '../services/images.openai';
const SceneImageSchema = z.object({
    scene_id: z.string().min(1),
    scene_title: z.string().min(1),
    path_id: z.string().min(1),
    path_label: z.string().min(1),
    path_summary: z.string().min(1),
    prompt: z.string().min(1),
    style: z.string().optional(),
});
export async function registerSceneImageRoutes(app) {
    app.post('/v1/scenes/images', async (request, reply) => {
        if (!app.env.OPENAI_API_KEY) {
            return reply.code(503).send({ message: 'Scene image generation is not configured.' });
        }
        const payload = SceneImageSchema.parse(request.body);
        try {
            const result = await generateSceneImages(app.env, {
                sceneTitle: payload.scene_title,
                pathLabel: payload.path_label,
                pathSummary: payload.path_summary,
                prompt: payload.prompt,
                style: payload.style,
            });
            return reply.send({
                scene_id: payload.scene_id,
                path_id: payload.path_id,
                prompt: result.prompt,
                thumbnail: result.thumbnail,
                full: result.full,
                generated_at: new Date().toISOString(),
            });
        }
        catch (error) {
            request.log.error({ err: error }, 'Failed to generate scene images');
            if (error instanceof SceneImageError) {
                return reply.code(502).send({ message: error.message });
            }
            return reply.code(500).send({ message: 'Unexpected error generating scene image.' });
        }
    });
}
