import type { FastifyInstance } from 'fastify';

export const registerErrorHandler = (app: FastifyInstance) => {
  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request errored');
    if (!reply.statusCode || reply.statusCode < 400) {
      reply.status(500);
    }

    reply.send({
      message: error.message,
      code: error.code ?? 'INTERNAL_ERROR',
    });
  });
};
