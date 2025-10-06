'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

type ReplayPayload = Record<string, unknown>;

export default function ReplayPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const [replay, setReplay] = useState<ReplayPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<ReplayPayload>(`/v1/runs/${runId}/replay`)
      .then((data) => {
        if (!cancelled) {
          setReplay(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load replay');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [runId]);

  return (
    <section className={styles.replay}>
      <header>
        <p className={styles.eyebrow}>Replay</p>
        <h2>Run {runId}</h2>
      </header>
      {error && <p className={styles.error}>{error}</p>}
      <pre>{JSON.stringify(replay, null, 2)}</pre>
    </section>
  );
}
