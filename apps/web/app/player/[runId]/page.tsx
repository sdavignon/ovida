import Link from 'next/link';
import styles from './page.module.css';

export default function PlayerPage({ params }: { params: { runId: string } }) {
  const { runId } = params;

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
        <Link href={`/replay/${runId}`}>View Replay</Link>
        <Link href={`/room/${runId}`}>Enter Room</Link>
      </div>
    </section>
  );
}
