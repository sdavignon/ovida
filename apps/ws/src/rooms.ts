import type { RealtimeChannel } from '@supabase/supabase-js';
import type { RoomEvent, ServerEvent } from './protocol';

export class RoomCoordinator {
  private channels = new Map<string, RealtimeChannel>();

  constructor(private publish: (id: string, event: ServerEvent) => void) {}

  attach(roomId: string, channel: RealtimeChannel) {
    this.channels.set(roomId, channel);
  }

  handleEvent(event: RoomEvent) {
    if (event.type === 'room.vote') {
      this.publish(event.roomId, {
        type: 'room.result',
        choiceId: event.choiceId,
        beatIdx: event.beatIdx,
      });
    }
    if (event.type === 'room.join') {
      this.publish(event.roomId, { type: 'room.state', state: 'joined' });
    }
    if (event.type === 'room.leave') {
      this.publish(event.roomId, { type: 'room.state', state: 'left' });
    }
  }
}
