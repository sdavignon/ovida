'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

type Choice = {
  id: string;
  text: string;
};

type Beat = {
  index: number;
  narration: string;
  choices: Choice[];
};

type SoundstagePlan = {
  ambience?: { id: string; gain: number } | null;
  cues: { at: number; label: string }[];
};

type NarrationProfile = {
  voice: string;
  style: string;
  tempo: string;
  treatment: string;
};

type AudioPayload = {
  provider: string;
  urls: string[];
  mime: string;
  soundstage?: SoundstagePlan;
  narrator?: NarrationProfile;
};

type BeatResponse = {
  beat: Beat;
  audio: AudioPayload;
};

type DemoCachePayload = {
  beat: Beat;
  audio: AudioPayload;
  guest_id?: string;
};

type HistoryEntry = {
  id: string;
  beatIndex: number;
  narration: string;
  choiceId: string;
  choiceText: string;
  auto: boolean;
};

const COUNTDOWN_SECONDS = 8;

export default function PlayerPage({ params }: { params: { runId: string } }) {
  const { runId } = params;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const decisionStartedRef = useRef(false);

  const [currentBeat, setCurrentBeat] = useState<Beat | null>(null);
  const [audioMeta, setAudioMeta] = useState<AudioPayload | null>(null);
  const [audioQueue, setAudioQueue] = useState<string[]>([]);
  const [audioIndex, setAudioIndex] = useState(0);
  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'decision' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [pendingChoice, setPendingChoice] = useState<{ choiceText: string; auto: boolean } | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);

  const stopCountdown = useCallback(() => {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
  }, []);

  const attemptPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    try {
      await audio.play();
      setAutoplayBlocked(false);
      setStatus('playing');
    } catch (err) {
      setAutoplayBlocked(true);
      setStatus('idle');
    }
  }, []);

  const loadBeat = useCallback(
    async (options?: { index?: number }) => {
      const query = typeof options?.index === 'number' ? `?index=${options.index}` : '';
      setStatus('loading');
      setError(null);
      stopCountdown();
      decisionStartedRef.current = false;
      setPendingChoice(null);

      try {
        const payload = await apiFetch<BeatResponse>(`/v1/runs/${runId}/next${query}`, {
          method: 'POST',
        });
        setCurrentBeat(payload.beat);
        setAudioMeta(payload.audio ?? null);
        setAudioQueue(payload.audio?.urls ?? []);
        setAudioIndex(0);
        setSelectedChoice(null);
        setStatus(payload.audio?.urls?.length ? 'playing' : 'decision');
        setAutoplayBlocked(false);

        if (typeof window !== 'undefined' && typeof options?.index === 'number' && options.index === 0) {
          try {
            window.localStorage.setItem(
              `ovida-demo:${runId}`,
              JSON.stringify({ beat: payload.beat, audio: payload.audio }),
            );
          } catch (storageError) {
            console.warn('Unable to cache initial beat payload', storageError);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unable to load beat';
        setError(message);
        setStatus('error');
      }
    },
    [runId, stopCountdown],
  );

  const handleChoice = useCallback(
    (choiceId: string, auto = false) => {
      if (!currentBeat) {
        return;
      }
      if (!auto && status !== 'decision') {
        return;
      }

      stopCountdown();
      decisionStartedRef.current = false;
      setCountdown(null);

      const choice = currentBeat.choices.find((item) => item.id === choiceId);
      const choiceText = choice?.text ?? choiceId;

      setSelectedChoice(choiceId);
      setPendingChoice({ choiceText, auto });
      const entryId = `${currentBeat.index}-${choiceId}-${Date.now()}`;
      setHistory((prev) => [
        {
          id: entryId,
          beatIndex: currentBeat.index,
          narration: currentBeat.narration,
          choiceId,
          choiceText,
          auto,
        },
        ...prev,
      ]);

      setStatus('loading');
      setAudioQueue([]);
      setAudioIndex(0);
      setAudioMeta(null);
      setError(null);

      void loadBeat();
    },
    [currentBeat, loadBeat, status, stopCountdown],
  );

  const startDecisionPhase = useCallback(() => {
    if (decisionStartedRef.current || !currentBeat) {
      return;
    }

    decisionStartedRef.current = true;
    stopCountdown();
    setStatus('decision');
    const defaultChoice = currentBeat.choices[0];

    if (!defaultChoice) {
      return;
    }

    setCountdown(COUNTDOWN_SECONDS);
    countdownTimer.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          return prev;
        }
        if (prev <= 1) {
          handleChoice(defaultChoice.id, true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [currentBeat, handleChoice, stopCountdown]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      stopCountdown();
      decisionStartedRef.current = false;
      setHistory([]);
      setError(null);

      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(`ovida-demo:${runId}`);
        if (raw) {
          try {
            const cached: DemoCachePayload = JSON.parse(raw);
            if (!cancelled) {
              setCurrentBeat(cached.beat);
              setAudioMeta(cached.audio ?? null);
              setAudioQueue(cached.audio?.urls ?? []);
              setAudioIndex(0);
              setSelectedChoice(null);
              setPendingChoice(null);
              setStatus(cached.audio?.urls?.length ? 'playing' : 'decision');
              setAutoplayBlocked(false);
              setInitializing(false);
            }
            return;
          } catch (parseError) {
            console.warn('Failed to load cached demo beat', parseError);
          }
        }
      }

      await loadBeat({ index: 0 });
      if (!cancelled) {
        setInitializing(false);
      }
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, [runId, loadBeat, stopCountdown]);

  useEffect(() => {
    if (status === 'decision') {
      startDecisionPhase();
    }
  }, [status, startDecisionPhase]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    const handleEnded = () => {
      setAudioIndex((idx) => {
        const nextIdx = idx + 1;
        if (nextIdx < audioQueue.length) {
          return nextIdx;
        }
        startDecisionPhase();
        return idx;
      });
    };

    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioQueue.length, startDecisionPhase]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (!audioQueue.length) {
      audio.pause();
      audio.removeAttribute('src');
      return;
    }

    const nextUrl = audioQueue[audioIndex] ?? audioQueue[0];
    if (!nextUrl) {
      return;
    }

    if (audio.src !== nextUrl) {
      audio.src = nextUrl;
    }

    void attemptPlay();
  }, [audioQueue, audioIndex, attemptPlay]);

  useEffect(() => {
    return () => {
      stopCountdown();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
    };
  }, [stopCountdown]);

  const statusLabel = useMemo(() => {
    switch (status) {
      case 'loading':
        return 'Loading next beat…';
      case 'playing':
        return 'Playing narration';
      case 'decision':
        return 'Awaiting decision';
      case 'error':
        return 'Playback interrupted';
      case 'idle':
      default:
        return 'Ready';
    }
  }, [status]);

  const defaultChoice = currentBeat?.choices[0] ?? null;
  const segmentLabel = useMemo(() => {
    if (!audioQueue.length) {
      return null;
    }
    return `Segment ${Math.min(audioIndex + 1, audioQueue.length)} of ${audioQueue.length}`;
  }, [audioQueue.length, audioIndex]);

  return (
    <section className={styles.player}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Podcast Player</p>
          <h2>Run {runId}</h2>
        </div>
        <span className={styles.badge}>{statusLabel}</span>
      </header>

      <div className={styles.actions}>
        <Link href={`/replay/${runId}`}>View Replay</Link>
        <Link href={`/room/${runId}`}>Enter Room</Link>
      </div>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          {status === 'error' && (
            <button type="button" onClick={() => loadBeat()}>
              Retry
            </button>
          )}
        </div>
      )}

      <div className={styles.layout}>
        <article className={styles.beatCard}>
          {initializing ? (
            <p className={styles.loading}>Preparing the broadcast…</p>
          ) : currentBeat ? (
            <>
              <div className={styles.beatHeader}>
                <span className={styles.beatIndex}>Beat {currentBeat.index + 1}</span>
                <span className={styles.audioMeta}>
                  {audioMeta?.provider ? `${audioMeta.provider} • ${audioMeta.mime}` : 'No audio for this beat'}
                </span>
              </div>
              <p className={styles.narration}>{currentBeat.narration}</p>

              <div className={styles.playback}>
                <div className={styles.playbackStatus}>
                  <span className={styles.indicator} aria-hidden />
                  <span>{segmentLabel ?? statusLabel}</span>
                </div>
                {autoplayBlocked && (
                  <button type="button" onClick={attemptPlay} className={styles.retryButton}>
                    Resume audio
                  </button>
                )}
              </div>

              {status === 'decision' && currentBeat.choices.length > 0 && (
                <div className={styles.choices}>
                  <p className={styles.prompt}>
                    Decide where the story drifts next.
                    {countdown !== null && defaultChoice && (
                      <span className={styles.countdown}>
                        {' '}
                        Auto-selecting <strong>{defaultChoice.text}</strong> in {countdown}s
                      </span>
                    )}
                  </p>
                  <div className={styles.choiceList}>
                    {currentBeat.choices.map((choice) => (
                      <button
                        key={choice.id}
                        type="button"
                        className={`${styles.choiceButton} ${selectedChoice === choice.id ? styles.choiceSelected : ''}`}
                        onClick={() => handleChoice(choice.id)}
                        disabled={status !== 'decision'}
                      >
                        <span>{choice.text}</span>
                        {defaultChoice?.id === choice.id && <span className={styles.choiceDefault}>Default</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {pendingChoice && status === 'loading' && (
                <p className={styles.pendingChoice}>
                  {pendingChoice.auto ? 'Default choice selected:' : 'You selected:'}{' '}
                  <strong>{pendingChoice.choiceText}</strong>. Generating the next beat…
                </p>
              )}
            </>
          ) : (
            <p className={styles.emptyState}>
              No narration yet. Start the Haunted Shore demo to begin the story.
            </p>
          )}
        </article>

        <aside className={styles.history}>
          <h3>Recent Decisions</h3>
          {history.length === 0 ? (
            <p className={styles.historyEmpty}>Choices will appear here as the stream progresses.</p>
          ) : (
            <ul className={styles.historyList}>
              {history.map((entry) => (
                <li key={entry.id} className={styles.historyItem}>
                  <div className={styles.historyHeader}>
                    <span className={styles.historyBeat}>Beat {entry.beatIndex + 1}</span>
                    {entry.auto && <span className={styles.historyAuto}>Auto</span>}
                  </div>
                  <p className={styles.historyNarration}>{entry.narration}</p>
                  <p className={styles.historyChoice}>
                    Chosen: <strong>{entry.choiceText}</strong>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <audio ref={audioRef} preload="auto" className={styles.audio} />
    </section>
  );
}
