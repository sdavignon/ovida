export type RoomEvent =
  | { type: 'room.join'; roomId: string; userId?: string; guestId?: string }
  | { type: 'room.vote'; roomId: string; choiceId: string; beatIdx: number }
  | { type: 'room.leave'; roomId: string };

export type ServerEvent =
  | { type: 'room.state'; state: string }
  | { type: 'room.result'; choiceId: string; beatIdx: number }
  | { type: 'room.beat'; beatIdx: number };
