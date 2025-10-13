'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { resolveRunId } from '@/lib/run-id';
import styles from './page.module.css';

type ReplayPayload = Record<string, unknown>;

function ReplayContent() {
  const searchParams = useSearchParams();
  const runId = resolveRunId(searchParams?.get('runId'));
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

  const heading = useMemo(() => `Run ${runId}`, [runId]);

  return (
    <section className={styles.replay}>
      <header>
        <p className={styles.eyebrow}>Replay</p>
        <h2>{heading}</h2>
      </header>
      {error && <p className={styles.error}>{error}</p>}
      <pre className={styles.log}>{JSON.stringify(replay, null, 2)}</pre>
    </section>
  );
}

export default function ReplayPage() {
  return (
    <Suspense fallback={<section className={styles.replay}>Loading replay…</section>}>
      <ReplayContent />
    </Suspense>
  );
}
