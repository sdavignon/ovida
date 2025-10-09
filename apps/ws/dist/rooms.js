export class RoomCoordinator {
    constructor(publish) {
        this.publish = publish;
        this.channels = new Map();
    }
    attach(roomId, channel) {
        this.channels.set(roomId, channel);
    }
    handleEvent(event) {
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
