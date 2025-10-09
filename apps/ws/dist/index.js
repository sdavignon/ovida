import 'dotenv/config';
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import { createSupabaseServer } from './supa';
import { RoomCoordinator } from './rooms';
const PORT = Number(process.env.PORT ?? 4001);
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://localhost:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const supabase = createSupabaseServer(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const app = Fastify({ logger: true });
const coordinator = new RoomCoordinator((roomId, event) => {
    app.log.info({ roomId, event }, 'server event');
});
app.register(websocket);
app.get('/ws', { websocket: true }, (connection) => {
    connection.socket.on('message', (message) => {
        try {
            const event = JSON.parse(message.toString());
            coordinator.handleEvent(event);
        }
        catch (error) {
            app.log.error({ error }, 'failed to parse event');
        }
    });
    connection.socket.send(JSON.stringify({ type: 'room.state', state: 'connected', supabaseUrl: SUPABASE_URL }));
});
app.listen({ port: PORT, host: '0.0.0.0' }).catch((error) => {
    app.log.error(error);
    process.exit(1);
});
void supabase;
