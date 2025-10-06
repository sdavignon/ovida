import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import cookie from '@fastify/cookie';
import { loadEnv } from './env';
import { createSupabaseServer } from './supa';
import { registerErrorHandler } from './middleware/error';
import { registerAuthRoutes } from './routes/auth.supabase';
import { registerDemoRoutes } from './routes/demos';
import { registerStoryRoutes } from './routes/stories';
import { registerRunRoutes } from './routes/runs';
import { registerReplayRoutes } from './routes/replays';
import { registerRoomRoutes } from './routes/rooms.http';

const bootstrap = async () => {
  const env = loadEnv();
  const app = Fastify({ logger: true });
  const supabase = createSupabaseServer(env);
  app.decorate('env', env);
  app.decorate('supabase', supabase);

  await app.register(cors, { origin: env.APP_ORIGIN ?? true, credentials: true });
  await app.register(helmet);
  await app.register(cookie);
  await app.register(sensible);

  registerErrorHandler(app);

  await registerAuthRoutes(app);
  await registerDemoRoutes(app);
  await registerStoryRoutes(app);
  await registerRunRoutes(app);
  await registerReplayRoutes(app);
  await registerRoomRoutes(app);

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    app.log.info(`API listening on ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

bootstrap();
