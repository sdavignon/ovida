'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

type DemoResponse = {
  guest_id: string;
  run_id: string;
  beat: { narration: string };
};

export default function HomePage() {
  const [demo, setDemo] = useState<DemoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStartDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = await apiFetch<DemoResponse>('/v1/demos/start', { method: 'POST' });
      setDemo(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start demo');
    } finally {
      setLoading(false);
    }
  }, []);

  const summary = useMemo(() => {
    if (!demo) {
      return 'Start the 3-step Haunted Shore demo to receive a fresh narration and run identifier that you can explore across the player, room, and admin surfaces.';
    }
    return demo.beat.narration;
  }, [demo]);

  return (
    <section className={styles.hero}>
      <header>
        <p className={styles.eyebrow}>Interactive Narrative Demo</p>
        <h2>Shape the haunted shoreline together.</h2>
      </header>
      <p className={styles.summary}>{summary}</p>
      <div className={styles.actions}>
        <button onClick={handleStartDemo} disabled={loading}>
          {loading ? 'Starting…' : 'Start Demo'}
        </button>
        {demo && (
          <Link className={styles.primaryLink} href={`/player/${demo.run_id}`}>
            Open Player
          </Link>
        )}
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <footer className={styles.footer}>
        <span>Operator tools</span>
        <Link href="/admin">Admin Console</Link>
      </footer>
    </section>
  );
}
