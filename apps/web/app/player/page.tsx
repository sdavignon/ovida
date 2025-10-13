'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { resolveRunId } from '@/lib/run-id';
import styles from './page.module.css';

function PlayerContent() {
  const searchParams = useSearchParams();
  const runId = resolveRunId(searchParams?.get('runId'));

  return (
    <section className={styles.player}>
      <header>
        <p className={styles.eyebrow}>Player Controls</p>
        <h2>Run {runId}</h2>
      </header>
      <p>
        Launch a synchronized experience for viewers. From here you can jump into the live room to
        vote or review a recorded replay of the story so far.
      </p>
      <div className={styles.actions}>
        <Link href={{ pathname: '/replay', query: { runId } }}>View Replay</Link>
        <Link href={{ pathname: '/room', query: { runId } }}>Enter Room</Link>
      </div>
    </section>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<section className={styles.player}>Loading player…</section>}>
      <PlayerContent />
    </Suspense>
  );
}
