'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { wsOrigin } from '@/lib/config';
import styles from './page.module.css';

type Message = {
  id: string;
  payload: string;
};

export default function RoomPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const socketRef = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = new WebSocket(wsOrigin);
    socketRef.current = socket;

    socket.onopen = () => setConnected(true);
    socket.onclose = () => setConnected(false);
    socket.onerror = () => setConnected(false);
    socket.onmessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : event.data.toString();
      setMessages((prev) => [
        { id: `${Date.now()}-${prev.length}`, payload: data },
        ...prev,
      ]);
    };

    return () => {
      socket.close();
    };
  }, []);

  const sendVote = useCallback(() => {
    const vote = {
      type: 'room.vote',
      roomId: runId,
      choiceId: 'continue',
      beatIdx: 0,
    };
    socketRef.current?.send(JSON.stringify(vote));
  }, [runId]);

  return (
    <section className={styles.room}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Live Room</p>
        <h2>Run {runId}</h2>
        <span
          className={`${styles.status} ${connected ? styles.connected : styles.disconnected}`}
        >
          {connected ? 'Connected' : 'Disconnected'}
        </span>
      </header>
      <button className={styles.action} onClick={sendVote} disabled={!connected}>
        Cast Vote
      </button>
      <div className={styles.log}>
        {messages.length === 0 && <p>No events yet. Votes and realtime updates appear here.</p>}
        {messages.map((message) => (
          <article key={message.id}>{message.payload}</article>
        ))}
      </div>
    </section>
  );
}
