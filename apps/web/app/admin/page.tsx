'use client';

import { useMemo, useState } from 'react';
import styles from './page.module.css';

type MetricCard = {
  id: string;
  label: string;
  value: string;
  description?: string;
};

type ActivityItem = {
  id: string;
  time: string;
  message: string;
  type: 'run' | 'flag' | 'report';
};

type StoryGuide = {
  id: string;
  type: 'Character' | 'World' | 'Style';
  title: string;
  summary: string;
};

type StoryScene = {
  id: string;
  title: string;
  premise: string;
  status: 'draft' | 'ready' | 'published';
};

type StoryChapter = {
  id: string;
  title: string;
  synopsis: string;
  order: number;
  scenes: StoryScene[];
};

type StoryItem = {
  id: string;
  title: string;
  owner: string;
  status: 'draft' | 'published';
  updatedAt: string;
  guides: StoryGuide[];
  chapters: StoryChapter[];
};

type RoomItem = {
  id: string;
  story: string;
  mode: 'duo' | 'party' | 'global';
  status: 'vote_open' | 'playing' | 'paused';
  members: number;
  voteWindowMs: number;
};

type VoiceItem = {
  id: string;
  provider: string;
  voiceId: string;
  license: string;
  defaultForStory?: string;
};

type PolicyVersion = {
  id: string;
  rating: string;
  disallowed: string[];
  softFilters: string[];
  updatedAt: string;
};

type ReportItem = {
  id: string;
  target: string;
  reason: string;
  status: 'open' | 'reviewing' | 'closed';
  submittedBy: string;
};

type AnalyticsMetric = {
  id: string;
  title: string;
  description: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
};

const dashboardMetrics: MetricCard[] = [
  { id: 'rooms', label: 'Active Rooms', value: '12', description: 'Live rooms in the last hour' },
  { id: 'participation', label: 'Vote Participation', value: '78%', description: 'Last 24 hours' },
  { id: 'cache', label: 'TTS Cache Hit', value: '91%', description: 'Rolling 24 hour window' },
  { id: 'latency', label: 'Choice → Audio Latency', value: '1.6s', description: 'P95 across all rooms' },
  { id: 'policy', label: 'Policy Flags', value: '3', description: 'Awaiting moderator review' },
];

const activityFeed: ActivityItem[] = [
  {
    id: '1',
    time: '2m ago',
    message: 'Run #R-4213 verified checksum and published to canon v4.',
    type: 'run',
  },
  {
    id: '2',
    time: '10m ago',
    message: 'Flagged beat on Haunted Shore — profanity masked by policy v2.',
    type: 'flag',
  },
  {
    id: '3',
    time: '18m ago',
    message: 'User report opened for Room #RM-317: “Off-topic roleplay”.',
    type: 'report',
  },
];

const stories: StoryItem[] = [
  {
    id: 'story-1',
    title: 'Haunted Shore',
    owner: 'Jess (Producer)',
    status: 'published',
    updatedAt: 'Updated 1 hour ago',
    guides: [
      {
        id: 'guide-1',
        type: 'Character',
        title: 'Captain Edda',
        summary: 'Gruff salvager with secrets; voice gravelly but kind-hearted.',
      },
      {
        id: 'guide-2',
        type: 'World',
        title: 'Mistbound Coast',
        summary: 'Fog conceals phantasms; technology stalled at steam-and-salt.',
      },
      {
        id: 'guide-3',
        type: 'Style',
        title: 'PG-13 Slow Burn',
        summary: 'Lean pacing, suppressed gore, long-form tension.',
      },
    ],
    chapters: [
      {
        id: 'chapter-1',
        title: 'Arrival at Low Tide',
        synopsis: 'The crew reaches the abandoned docks and senses echoes.',
        order: 1,
        scenes: [
          {
            id: 'scene-1',
            title: 'Boarding the Wreck',
            premise: 'Explore the shipwreck and uncover the first haunt.',
            status: 'published',
          },
          {
            id: 'scene-2',
            title: 'Echoes in the Hold',
            premise: 'Players negotiate with the lingering spirits.',
            status: 'ready',
          },
        ],
      },
      {
        id: 'chapter-2',
        title: 'Signals in the Storm',
        synopsis: 'A beacon lures the crew deeper into the fog.',
        order: 2,
        scenes: [
          {
            id: 'scene-3',
            title: 'The Broken Beacon',
            premise: 'Repairing the beacon reveals a paradox.',
            status: 'draft',
          },
        ],
      },
    ],
  },
  {
    id: 'story-2',
    title: 'Chronomancer Uprising',
    owner: 'Liam (Producer)',
    status: 'draft',
    updatedAt: 'Updated yesterday',
    guides: [
      {
        id: 'guide-4',
        type: 'Character',
        title: 'Archivist Nyla',
        summary: 'Time-locked archivist who trades memories for favors.',
      },
    ],
    chapters: [
      {
        id: 'chapter-3',
        title: 'Clockwork Citadel',
        synopsis: 'Rebel chronomancers seize the capital tower.',
        order: 1,
        scenes: [
          {
            id: 'scene-4',
            title: 'Breach the Vault',
            premise: 'Players bend temporal locks to reach the archives.',
            status: 'draft',
          },
        ],
      },
    ],
  },
];

const rooms: RoomItem[] = [
  { id: 'RM-317', story: 'Haunted Shore', mode: 'party', status: 'vote_open', members: 48, voteWindowMs: 12000 },
  { id: 'RM-992', story: 'Chronomancer Uprising', mode: 'global', status: 'playing', members: 212, voteWindowMs: 8000 },
  { id: 'RM-101', story: 'Haunted Shore', mode: 'duo', status: 'paused', members: 2, voteWindowMs: 15000 },
];

const voices: VoiceItem[] = [
  { id: 'voice-1', provider: 'ElevenLabs', voiceId: 'MistWarden', license: 'Streaming + Replay', defaultForStory: 'Haunted Shore' },
  { id: 'voice-2', provider: 'PlayHT', voiceId: 'ChronoAdept', license: 'Streaming only' },
  { id: 'voice-3', provider: 'MetaVoice', voiceId: 'Oracle-Δ', license: 'Streaming + Commercial' },
];

const policies: PolicyVersion[] = [
  {
    id: 'policy-4',
    rating: 'T for Teen',
    disallowed: ['Explicit violence', 'Sexual content', 'Slurs'],
    softFilters: ['Body horror', 'Existential dread'],
    updatedAt: 'Updated 4 hours ago',
  },
  {
    id: 'policy-3',
    rating: 'PG-13',
    disallowed: ['Explicit violence', 'Strong profanity'],
    softFilters: ['Religious themes'],
    updatedAt: 'Updated 2 days ago',
  },
];

const reports: ReportItem[] = [
  { id: 'RP-8892', target: 'Room RM-317', reason: 'Off-topic roleplay', status: 'reviewing', submittedBy: 'guest-189' },
  { id: 'RP-8893', target: 'Run R-4123', reason: 'Lore inconsistency', status: 'open', submittedBy: 'producer-kai' },
];

const analytics: AnalyticsMetric[] = [
  { id: 'metric-1', title: 'Average Beat Rating', description: 'Guest thumbs-up / thumbs-down ratio (24h).', value: '4.6 / 5', trend: 'up' },
  { id: 'metric-2', title: 'Policy Interventions', description: 'Auto-moderated beats this week.', value: '17', trend: 'flat' },
  { id: 'metric-3', title: 'Audio Render Latency', description: 'Median seconds from vote close to playback.', value: '1.8s', trend: 'down' },
];

const statusColors: Record<ActivityItem['type'], string> = {
  run: '#4ade80',
  flag: '#f97316',
  report: '#f87171',
};

export default function AdminPage() {
  const [autoModeration, setAutoModeration] = useState(true);
  const [safetyMode, setSafetyMode] = useState<'relaxed' | 'standard' | 'strict'>('standard');

  const safetyDescription = useMemo(() => {
    switch (safetyMode) {
      case 'relaxed':
        return 'Minimal filtering, best for internal QA rooms.';
      case 'strict':
        return 'Aggressive guardrails, muted speculative content.';
      default:
        return 'Balanced guardrails tuned for public showcase rooms.';
    }
  }, [safetyMode]);

  return (
    <div className={styles.grid}>
      <section className={styles.metrics}>
        {dashboardMetrics.map((metric) => (
          <article key={metric.id}>
            <p>{metric.label}</p>
            <strong>{metric.value}</strong>
            {metric.description && <span>{metric.description}</span>}
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Realtime Activity</h2>
          <span>Last 30 minutes</span>
        </header>
        <div className={styles.activityList}>
          {activityFeed.map((item) => (
            <article key={item.id}>
              <span style={{ background: statusColors[item.type] }} />
              <div>
                <p>{item.message}</p>
                <time>{item.time}</time>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Story Library</h2>
          <span>Guides, chapters, and scenes</span>
        </header>
        <div className={styles.storyList}>
          {stories.map((story) => (
            <article key={story.id}>
              <div className={styles.storyHeader}>
                <h3>{story.title}</h3>
                <span className={story.status === 'published' ? styles.published : styles.draft}>
                  {story.status}
                </span>
              </div>
              <p className={styles.storyMeta}>
                {story.owner} • {story.updatedAt}
              </p>
              <div className={styles.tagList}>
                {story.guides.map((guide) => (
                  <span key={guide.id}>{guide.type}: {guide.title}</span>
                ))}
              </div>
              <ul>
                {story.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <div>
                      <strong>Chapter {chapter.order}: {chapter.title}</strong>
                      <p>{chapter.synopsis}</p>
                    </div>
                    <div>
                      {chapter.scenes.map((scene) => (
                        <span key={scene.id} className={styles.sceneBadge} data-status={scene.status}>
                          {scene.title}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Room Monitor</h2>
          <span>Vote windows &amp; status</span>
        </header>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Room</th>
              <th>Story</th>
              <th>Mode</th>
              <th>Status</th>
              <th>Members</th>
              <th>Vote Window</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id}>
                <td>{room.id}</td>
                <td>{room.story}</td>
                <td>{room.mode}</td>
                <td>{room.status.replace('_', ' ')}</td>
                <td>{room.members}</td>
                <td>{Math.round(room.voteWindowMs / 1000)}s</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Voice Library</h2>
          <span>Streaming entitlements</span>
        </header>
        <div className={styles.voiceList}>
          {voices.map((voice) => (
            <article key={voice.id}>
              <h3>{voice.voiceId}</h3>
              <p>{voice.provider} • {voice.license}</p>
              {voice.defaultForStory && <span>Default for {voice.defaultForStory}</span>}
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Safety Controls</h2>
          <span>Fine-tune content guardrails</span>
        </header>
        <div className={styles.controls}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={autoModeration}
              onChange={(event) => setAutoModeration(event.target.checked)}
            />
            <span>Auto-moderate policy violations</span>
          </label>
          <div className={styles.radioGroup}>
            {(['relaxed', 'standard', 'strict'] as const).map((level) => (
              <label key={level}>
                <input
                  type="radio"
                  name="safety-mode"
                  checked={safetyMode === level}
                  onChange={() => setSafetyMode(level)}
                />
                <span className={styles.radioLabel}>{level}</span>
              </label>
            ))}
          </div>
          <p className={styles.controlSummary}>{safetyDescription}</p>
        </div>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Policy Versions</h2>
          <span>Content filters &amp; updates</span>
        </header>
        <div className={styles.policyList}>
          {policies.map((policy) => (
            <article key={policy.id}>
              <h3>{policy.rating}</h3>
              <p>{policy.updatedAt}</p>
              <div>
                <strong>Disallowed</strong>
                <span>{policy.disallowed.join(', ')}</span>
              </div>
              <div>
                <strong>Soft filters</strong>
                <span>{policy.softFilters.join(', ')}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Reports</h2>
          <span>Flagged runs &amp; rooms</span>
        </header>
        <ul className={styles.reportList}>
          {reports.map((report) => (
            <li key={report.id}>
              <div>
                <strong>{report.target}</strong>
                <span>{report.reason}</span>
              </div>
              <div>
                <span className={styles.badge}>{report.status}</span>
                <span className={styles.reportMeta}>by {report.submittedBy}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.panel}>
        <header>
          <h2>Analytics</h2>
          <span>Quality and operations</span>
        </header>
        <div className={styles.analytics}>
          {analytics.map((metric) => (
            <article key={metric.id}>
              <header>
                <h3>{metric.title}</h3>
                <span data-trend={metric.trend}>{metric.trend}</span>
              </header>
              <p>{metric.value}</p>
              <small>{metric.description}</small>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
