import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { OverlayInstruction } from '../services/video.jobs';

const TimingFields = {
  start: z.number().min(0),
  end: z.number().min(0),
};

const LogoOverlaySchema = z.object({
  ...TimingFields,
  type: z.literal('logo'),
  asset_url: z.string().url(),
  x: z.string().min(1),
  y: z.string().min(1),
  fade_in: z.number().min(0).max(60).optional(),
  fade_out: z.number().min(0).max(60).optional(),
  scale: z.string().min(1).optional(),
});

const TextOverlaySchema = z.object({
  ...TimingFields,
  type: z.literal('text'),
  text: z.string().min(1),
  fontfile: z.string().min(1),
  fontsize: z.number().positive().max(512),
  fontcolor: z.string().min(1),
  x: z.string().min(1),
  y: z.string().min(1),
  shadow: z.boolean().optional(),
});

const OverlaySchema = z.discriminatedUnion('type', [LogoOverlaySchema, TextOverlaySchema]);

const CreateJobBodySchema = z
  .object({
    source_url: z.string().url(),
    overlays: z.array(OverlaySchema).max(10).default([]),
    output_format: z.enum(['mp4', 'mov', 'mkv']).default('mp4'),
    callback_url: z.string().url().nullable().optional(),
    audio_url: z.string().url().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    data.overlays.forEach((overlay, index) => {
      if (overlay.end <= overlay.start) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'end must be greater than start',
          path: ['overlays', index, 'end'],
        });
      }

      if (overlay.type === 'logo') {
        const duration = overlay.end - overlay.start;
        if (overlay.fade_in !== undefined && overlay.fade_in > duration) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'fade_in cannot exceed overlay duration',
            path: ['overlays', index, 'fade_in'],
          });
        }
        if (overlay.fade_out !== undefined && overlay.fade_out > duration) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'fade_out cannot exceed overlay duration',
            path: ['overlays', index, 'fade_out'],
          });
        }
      }
    });
  });

const JobParamsSchema = z.object({
  job_id: z.string().min(1),
});

type CreateJobBody = z.infer<typeof CreateJobBodySchema>;
type OverlayInput = z.infer<typeof OverlaySchema>;
export async function registerVideoJobRoutes(app: FastifyInstance) {
  const requireApiKey = async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return reply.code(401).send({ message: 'Missing API key' });
    }
    const token = header.slice('Bearer '.length).trim();
    if (token.length === 0 || token !== app.env.VIDEO_API_KEY) {
      return reply.code(401).send({ message: 'Invalid API key' });
    }
    return undefined;
  };

  app.post('/api/v1/jobs', { preHandler: requireApiKey }, async (request, reply) => {
    const body = CreateJobBodySchema.parse(request.body);
    const manager = app.videoJobs;

    const payload = mapCreatePayload(body);

    try {
      const job = manager.createJob(payload);
      const statusUrl = buildStatusUrl(app, job.job_id);
      return reply.code(202).send({
        job_id: job.job_id,
        status: job.status,
        status_url: statusUrl,
      });
    } catch (error) {
      request.log.error({ err: error }, 'Failed to create video job');
      return reply.code(500).send({ message: 'Failed to create job' });
    }
  });

  app.get('/api/v1/jobs/:job_id', { preHandler: requireApiKey }, async (request, reply) => {
    const { job_id } = JobParamsSchema.parse(request.params);
    const job = app.videoJobs.getJob(job_id);
    if (!job) {
      return reply.code(404).send({ message: 'Job not found' });
    }
    return reply.send({
      job_id: job.job_id,
      status: job.status,
      progress: job.progress,
      download_url: job.download_url ?? null,
      error: job.error ?? null,
    });
  });

  app.get('/api/v1/jobs/:job_id/download', { preHandler: requireApiKey }, async (request, reply) => {
    const { job_id } = JobParamsSchema.parse(request.params);
    const job = app.videoJobs.getJob(job_id);
    if (!job || job.status !== 'completed' || !job.download_url) {
      return reply.code(404).send({ message: 'Job output not available' });
    }
    return reply.redirect(job.download_url);
  });
}

const mapCreatePayload = (body: CreateJobBody) => {
  const overlays: OverlayInstruction[] = body.overlays.map(mapOverlayInstruction);
  return {
    sourceUrl: body.source_url,
    overlays,
    outputFormat: body.output_format,
    callbackUrl: body.callback_url ?? undefined,
    audioUrl: body.audio_url ?? undefined,
  };
};

const mapOverlayInstruction = (overlay: OverlayInput): OverlayInstruction => {
  if (overlay.type === 'logo') {
    return {
      type: 'logo',
      asset_url: overlay.asset_url,
      x: overlay.x,
      y: overlay.y,
      start: overlay.start,
      end: overlay.end,
      fade_in: overlay.fade_in ?? undefined,
      fade_out: overlay.fade_out ?? undefined,
      scale: overlay.scale ?? undefined,
    };
  }
  return {
    type: 'text',
    text: overlay.text,
    fontfile: overlay.fontfile,
    fontsize: overlay.fontsize,
    fontcolor: overlay.fontcolor,
    x: overlay.x,
    y: overlay.y,
    start: overlay.start,
    end: overlay.end,
    shadow: overlay.shadow ?? undefined,
  };
};

const buildStatusUrl = (app: FastifyInstance, jobId: string) => {
  const pathname = `/api/v1/jobs/${jobId}`;
  const origin = app.env.API_ORIGIN ?? null;
  if (!origin) {
    return pathname;
  }
  try {
    return new URL(pathname, origin).toString();
  } catch {
    return pathname;
  }
};
