'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { resolveRunId } from '@/lib/run-id';
import styles from './page.module.css';

type ReplayChoice = {
  id: string;
  text: string;
};

type ReplayBeatAudio = {
  provider: string;
  urls: string[];
  mime: string;
};

type ReplayBeat = {
  index: number;
  narration: string;
  choices: ReplayChoice[];
  audio?: ReplayBeatAudio;
};

type ReplayPayload = {
  id: string;
  replay: {
    version: string;
    story: { id: string; title: string };
    engine: { llm: string; tts: string };
    seed: number;
    beats: ReplayBeat[];
    signature: string;
  };
};

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
  const beats = replay?.replay.beats ?? [];
  const storyTitle = replay?.replay.story.title ?? 'Unknown story';
  const engine = replay?.replay.engine;

  return (
    <section className={styles.replay}>
      <header>
        <p className={styles.eyebrow}>Replay</p>
        <h2>{heading}</h2>
      </header>
      {error && <p className={styles.error}>{error}</p>}
      {!replay && !error && <p className={styles.loading}>Preparing your replay…</p>}
      {replay && (
        <>
          <section className={styles.summary} aria-labelledby="replay-summary-heading">
            <h3 id="replay-summary-heading">Overview</h3>
            <dl className={styles.metadata}>
              <div>
                <dt>Story</dt>
                <dd>{storyTitle}</dd>
              </div>
              <div>
                <dt>Seed</dt>
                <dd>{replay.replay.seed}</dd>
              </div>
              <div>
                <dt>Engine</dt>
                <dd>{engine ? `${engine.llm} + ${engine.tts}` : 'Unknown'}</dd>
              </div>
              <div>
                <dt>Beats</dt>
                <dd>{beats.length}</dd>
              </div>
            </dl>
          </section>
          <ol className={styles.beats}>
            {beats.map((beat) => (
              <li key={beat.index} className={styles.beat}>
                <header>
                  <span className={styles.beatIndex}>Beat {beat.index + 1}</span>
                  {beat.audio && beat.audio.urls.length > 0 && (
                    <audio controls className={styles.audioPlayer}>
                      <source src={beat.audio.urls[0]} type={beat.audio.mime} />
                      Your browser does not support the audio element.
                    </audio>
                  )}
                  <p className={styles.narration}>{beat.narration}</p>
                </header>
                <div>
                  <h4 className={styles.choiceHeading}>Available choices</h4>
                  <ul className={styles.choices}>
                    {beat.choices.map((choice) => (
                      <li key={choice.id}>
                        <span className={styles.choiceLabel}>{choice.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
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
