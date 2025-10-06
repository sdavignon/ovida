import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Switch, Image } from 'react-native';
import { apiFetch } from '../api/client';

interface MetricCard {
  id: string;
  label: string;
  value: string;
  description?: string;
}

interface ActivityItem {
  id: string;
  time: string;
  message: string;
  type: 'run' | 'flag' | 'report';
}

interface StoryGuide {
  id: string;
  type: 'Character' | 'World' | 'Style';
  title: string;
  summary: string;
}

interface ScenePath {
  id: string;
  label: string;
  summary: string;
  prompt: string;
  style?: string;
}

interface StoryScene {
  id: string;
  title: string;
  premise: string;
  status: 'draft' | 'ready' | 'published';
  paths: ScenePath[];
}

interface StoryChapter {
  id: string;
  title: string;
  synopsis: string;
  order: number;
  scenes: StoryScene[];
}

interface StoryItem {
  id: string;
  title: string;
  owner: string;
  status: 'draft' | 'published';
  updatedAt: string;
  guides: StoryGuide[];
  chapters: StoryChapter[];
}

interface RunItem {
  id: string;
  story: string;
  createdBy: string;
  seed: string;
  visibility: 'public' | 'private';
  beats: number;
  policyFlags: number;
}

interface RoomItem {
  id: string;
  story: string;
  mode: 'duo' | 'party' | 'global';
  status: 'vote_open' | 'playing' | 'paused';
  members: number;
  voteWindowMs: number;
}

interface VoiceItem {
  id: string;
  provider: string;
  voiceId: string;
  license: string;
  defaultForStory?: string;
}

interface PolicyVersion {
  id: string;
  rating: string;
  disallowed: string[];
  softFilters: string[];
  updatedAt: string;
}

interface SceneImageResponse {
  scene_id: string;
  path_id: string;
  prompt: string;
  thumbnail: string;
  full: string;
  generated_at: string;
}

interface SceneImageAsset {
  thumbnail: string;
  full: string;
  prompt: string;
  generatedAt: string;
}

const makeSceneKey = (sceneId: string, pathId: string) => `${sceneId}:${pathId}`;

interface ReportItem {
  id: string;
  target: string;
  reason: string;
  status: 'open' | 'reviewing' | 'closed';
  submittedBy: string;
}

interface AnalyticsMetric {
  id: string;
  title: string;
  description: string;
  value: string;
  trend: 'up' | 'down' | 'flat';
}

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
            paths: [
              {
                id: 'scene-1-path-a',
                label: 'Captain\'s Quarters',
                summary: 'Investigate the sealed captain\'s door amid storm lanterns.',
                prompt:
                  'A weathered salvage crew pries open a captain\'s cabin on a wrecked ship, fog rolling in, spectral ropes swaying, teal and amber lighting.',
                style: 'Oil painting with volumetric light',
              },
              {
                id: 'scene-1-path-b',
                label: 'Rusted Deck',
                summary: 'Survey the exposed deck while tides crash below.',
                prompt:
                  'Wide shot of a haunted ship deck at low tide, barnacle-crusted railings, ghosts forming in sea spray, cinematic dusk palette.',
                style: 'Cinematic concept art',
              },
            ],
          },
          {
            id: 'scene-2',
            title: 'Echoes in the Hold',
            premise: 'Players negotiate with the lingering spirits.',
            status: 'ready',
            paths: [
              {
                id: 'scene-2-path-a',
                label: 'Appease the Choir',
                summary: 'Soothe a chorus of ghosts bound to anchor chains.',
                prompt:
                  'Subterranean ship hold with glowing chains, translucent ghost choir circling an anchor, warm candles vs cold moonlight contrast.',
                style: 'Dark fantasy illustration',
              },
              {
                id: 'scene-2-path-b',
                label: 'Bargain with the Tide',
                summary: 'Strike a deal with a tidal spirit through mirrored water.',
                prompt:
                  'A reflective pool in a ship hold forming a towering water spirit, protagonists offering relics, bioluminescent blues and silvers.',
                style: 'Iridescent watercolor',
              },
            ],
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
            paths: [
              {
                id: 'scene-3-path-a',
                label: 'Rewind the Flame',
                summary: 'Reassemble shattered glass suspended mid-air.',
                prompt:
                  'Clockwork lighthouse interior with suspended shards rewinding into place, gold gears floating, purple storm clouds outside.',
                style: 'Dieselpunk matte painting',
              },
              {
                id: 'scene-3-path-b',
                label: 'Summon the Pharos',
                summary: 'Invoke an ancient spirit to relight the beacon.',
                prompt:
                  'Mythic spirit of light emerging from a beacon lens, swirling constellations and crashing waves, heroic silhouettes.',
                style: 'Mythic realism',
              },
            ],
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
        type: 'World',
        title: 'Temporal Accord',
        summary: 'Magic allowed only under strict timekeeping guilds.',
      },
    ],
    chapters: [
      {
        id: 'chapter-3',
        title: 'Rebellion Sparks',
        synopsis: 'Students defy the accord during solstice.',
        order: 1,
        scenes: [
          {
            id: 'scene-4',
            title: 'Rooftop Confrontation',
            premise: 'Debate whether to freeze or rewind time.',
            status: 'ready',
            paths: [
              {
                id: 'scene-4-path-a',
                label: 'Slip Between Seconds',
                summary: 'Phase through guards frozen mid-action.',
                prompt:
                  'Temporal vault corridor with frozen guards mid-motion, protagonists weaving between time fractures, neon magenta highlights.',
                style: 'Retro-futurist art deco',
              },
              {
                id: 'scene-4-path-b',
                label: 'Storm the Chrono-Gate',
                summary: 'Overload the gate with rebellious chronomancers.',
                prompt:
                  'Grand clockwork gate exploding with golden sparks, rebels casting time sigils, skyline warped by time ripples.',
                style: 'High-energy comic panel',
              },
            ],
          },
        ],
      },
    ],
  },
];

const runs: RunItem[] = [
  {
    id: 'run-1',
    story: 'Haunted Shore',
    createdBy: 'guest_2001',
    seed: 'shore-seed-44',
    visibility: 'public',
    beats: 16,
    policyFlags: 0,
  },
  {
    id: 'run-2',
    story: 'Chronomancer Uprising',
    createdBy: 'producer_liam',
    seed: 'chrono-9',
    visibility: 'private',
    beats: 12,
    policyFlags: 2,
  },
];

const rooms: RoomItem[] = [
  {
    id: 'room-1',
    story: 'Haunted Shore',
    mode: 'party',
    status: 'vote_open',
    members: 18,
    voteWindowMs: 25000,
  },
  {
    id: 'room-2',
    story: 'Chronomancer Uprising',
    mode: 'duo',
    status: 'playing',
    members: 2,
    voteWindowMs: 15000,
  },
];

const voices: VoiceItem[] = [
  {
    id: 'voice-1',
    provider: 'ElevenLabs',
    voiceId: 'captain-edda-v1',
    license: 'Commercial (CC-BY consent)',
    defaultForStory: 'Haunted Shore',
  },
  {
    id: 'voice-2',
    provider: 'OpenAI',
    voiceId: 'nova-temporal',
    license: 'Internal test only',
    defaultForStory: undefined,
  },
];

const policyVersions: PolicyVersion[] = [
  {
    id: 'policy-v3',
    rating: 'PG-13',
    disallowed: ['Explicit gore', 'Gratuitous torture'],
    softFilters: ['Mask profanity', 'Implication-only for violence'],
    updatedAt: 'Updated 2h ago by Maya',
  },
  {
    id: 'policy-v2',
    rating: 'PG',
    disallowed: ['Body horror'],
    softFilters: ['Mask profanity'],
    updatedAt: 'Updated 2d ago by Maya',
  },
];

const reports: ReportItem[] = [
  {
    id: 'report-1',
    target: 'Beat #14 (Run R-4213)',
    reason: 'Player said character slur',
    status: 'open',
    submittedBy: 'mod_cass',
  },
  {
    id: 'report-2',
    target: 'Room RM-317',
    reason: 'Off-topic roleplay',
    status: 'reviewing',
    submittedBy: 'guest_179',
  },
];

const analytics: AnalyticsMetric[] = [
  {
    id: 'funnel',
    title: 'Demo Funnel Completion',
    description: 'demo_start → demo_complete',
    value: '64%',
    trend: 'up',
  },
  {
    id: 'engagement',
    title: 'Avg Beats / Session',
    description: 'Last 7 days',
    value: '11.8',
    trend: 'flat',
  },
  {
    id: 'latency',
    title: 'Choice → Audio Latency',
    description: 'P95 for realtime rooms',
    value: '1.2s',
    trend: 'down',
  },
];

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const SectionSubheading = ({ label }: { label: string }) => (
  <Text style={styles.sectionSubheading}>{label}</Text>
);

export default function AdminScreen() {
  const [audioModeIndex, setAudioModeIndex] = useState(0);
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const audioModes = useMemo(() => ['files', 'realtime', 'auto'], []);
  const sceneOptions = useMemo(
    () =>
      stories.flatMap((story) =>
        story.chapters.flatMap((chapter) =>
          chapter.scenes.map((scene) => ({
            id: scene.id,
            scene,
            storyTitle: story.title,
            chapterTitle: chapter.title,
          })),
        ),
      ),
    [],
  );

  const [selectedSceneId, setSelectedSceneId] = useState(sceneOptions[0]?.id ?? '');
  const selectedScene = useMemo(
    () => sceneOptions.find((option) => option.id === selectedSceneId),
    [sceneOptions, selectedSceneId],
  );
  const [selectedPathId, setSelectedPathId] = useState<string>(
    selectedScene?.scene.paths[0]?.id ?? '',
  );
  const [imageAssets, setImageAssets] = useState<Record<string, SceneImageAsset>>({});
  const [activePreviewKey, setActivePreviewKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedScene) {
      setSelectedPathId('');
      return;
    }
    const [firstPath] = selectedScene.scene.paths;
    if (!firstPath) {
      setSelectedPathId('');
      return;
    }
    setSelectedPathId((current) => {
      if (selectedScene.scene.paths.some((path) => path.id === current)) {
        return current;
      }
      return firstPath.id;
    });
  }, [selectedScene]);

  useEffect(() => {
    if (!selectedScene || !selectedPathId) {
      setActivePreviewKey(null);
      return;
    }
    const key = makeSceneKey(selectedScene.scene.id, selectedPathId);
    if (imageAssets[key]) {
      setActivePreviewKey(key);
    } else {
      setActivePreviewKey((current) => (current && imageAssets[current] ? current : null));
    }
  }, [selectedScene, selectedPathId, imageAssets]);

  const handleSceneChipPress = useCallback((sceneId: string) => {
    setSelectedSceneId(sceneId);
    setImageError(null);
  }, []);

  const handlePathPress = useCallback(
    (pathId: string) => {
      if (!selectedScene) {
        return;
      }
      setSelectedPathId(pathId);
      const key = makeSceneKey(selectedScene.scene.id, pathId);
      setActivePreviewKey(imageAssets[key] ? key : null);
      setImageError(null);
    },
    [selectedScene, imageAssets],
  );

  const handleGenerateImage = useCallback(async () => {
    if (!selectedScene || !selectedPathId) {
      return;
    }

    const path = selectedScene.scene.paths.find((item) => item.id === selectedPathId);
    if (!path) {
      return;
    }

    const key = makeSceneKey(selectedScene.scene.id, path.id);
    setLoadingKey(key);
    setImageError(null);

    try {
      const response = await apiFetch<SceneImageResponse>('/v1/scenes/images', {
        method: 'POST',
        body: JSON.stringify({
          scene_id: selectedScene.scene.id,
          scene_title: selectedScene.scene.title,
          path_id: path.id,
          path_label: path.label,
          path_summary: path.summary,
          prompt: path.prompt,
          style: path.style,
        }),
      });

      setImageAssets((prev) => ({
        ...prev,
        [key]: {
          thumbnail: response.thumbnail,
          full: response.full,
          prompt: response.prompt,
          generatedAt: response.generated_at,
        },
      }));
      setActivePreviewKey(key);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Failed to generate art');
    } finally {
      setLoadingKey(null);
    }
  }, [selectedScene, selectedPathId]);

  const currentPath = selectedScene?.scene.paths.find((item) => item.id === selectedPathId);
  const currentKey =
    selectedScene && selectedPathId ? makeSceneKey(selectedScene.scene.id, selectedPathId) : null;
  const previewKey = activePreviewKey ?? currentKey;
  const previewAsset = previewKey ? imageAssets[previewKey] : undefined;
  const isGenerating = currentKey !== null && loadingKey === currentKey;
  const canGenerateImage = Boolean(selectedScene && currentPath);
  const generateLabel = isGenerating
    ? 'Generating...'
    : currentKey && imageAssets[currentKey]
      ? 'Regenerate art'
      : 'Generate art';
  const previewTimeLabel = useMemo(() => {
    if (!previewAsset) {
      return null;
    }
    const parsed = new Date(previewAsset.generatedAt);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toLocaleTimeString();
  }, [previewAsset]);
  const currentAudioMode = audioModes[audioModeIndex];

  const cycleAudioMode = () => {
    setAudioModeIndex((prev) => (prev + 1) % audioModes.length);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ovida Admin Console</Text>
        <Text style={styles.subtitle}>"The story that lives" — operational control center</Text>
      </View>

      <Section title="Environment">
        <View style={styles.envRow}>
          <View style={styles.envItem}>
            <Text style={styles.envLabel}>Audio Mode</Text>
            <TouchableOpacity onPress={cycleAudioMode} style={styles.pillButton}>
              <Text style={styles.pillButtonText}>{currentAudioMode.toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envLabel}>Realtime Enabled</Text>
            <Switch value={realtimeEnabled} onValueChange={setRealtimeEnabled} />
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envLabel}>LLM Model</Text>
            <Text style={styles.envValue}>ovida/chronicle-v3</Text>
          </View>
          <View style={styles.envItem}>
            <Text style={styles.envLabel}>Realtime Model</Text>
            <Text style={styles.envValue}>ovida/audio-realtime-v2</Text>
          </View>
        </View>
      </Section>

      <Section title="Dashboard">
        <SectionSubheading label="At-a-glance" />
        <View style={styles.cardGrid}>
          {dashboardMetrics.map((metric) => (
            <View key={metric.id} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metric.label}</Text>
              <Text style={styles.metricValue}>{metric.value}</Text>
              {metric.description ? (
                <Text style={styles.metricDescription}>{metric.description}</Text>
              ) : null}
            </View>
          ))}
        </View>

        <SectionSubheading label="Recent Activity" />
        <View style={styles.listCard}>
          {activityFeed.map((item, index) => (
            <View
              key={item.id}
              style={[styles.listRow, index === activityFeed.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.listColumn, { flex: 1 }]}>
                <Text style={styles.listPrimary}>{item.message}</Text>
                <Text style={styles.listSecondary}>{item.time}</Text>
              </View>
              <Text style={styles.badge}>{item.type.toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Stories">
        {stories.map((story) => (
          <View key={story.id} style={styles.storyCard}>
            <View style={styles.storyHeader}>
              <Text style={styles.storyTitle}>{story.title}</Text>
              <Text style={styles.storyStatus}>{story.status.toUpperCase()}</Text>
            </View>
            <Text style={styles.storyMeta}>{story.owner} • {story.updatedAt}</Text>

            <SectionSubheading label="Guides" />
            <View style={styles.guideGrid}>
              {story.guides.map((guide) => (
                <View key={guide.id} style={styles.guideCard}>
                  <Text style={styles.guideType}>{guide.type}</Text>
                  <Text style={styles.guideTitle}>{guide.title}</Text>
                  <Text style={styles.guideSummary}>{guide.summary}</Text>
                </View>
              ))}
            </View>

            <SectionSubheading label="Chapters & Scenes" />
            {story.chapters.map((chapter) => (
              <View key={chapter.id} style={styles.chapterCard}>
                <Text style={styles.chapterTitle}>{chapter.order}. {chapter.title}</Text>
                <Text style={styles.chapterSynopsis}>{chapter.synopsis}</Text>
                {chapter.scenes.map((scene) => (
                  <View key={scene.id} style={styles.sceneRow}>
                    <View style={[styles.sceneColumn, { flex: 1 }]}>
                      <Text style={styles.sceneTitle}>{scene.title}</Text>
                      <Text style={styles.scenePremise}>{scene.premise}</Text>
                    </View>
                    <Text style={styles.sceneStatus}>{scene.status.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        ))}
      </Section>

      <Section title="Scene Imagery">
        <View style={styles.sceneImageryCard}>
          <Text style={styles.sceneImageryHeading}>Scenes</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sceneChipScroll}
            contentContainerStyle={styles.sceneChipRow}
          >
            {sceneOptions.map((option) => {
              const isActive = option.id === selectedSceneId;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.sceneChip, isActive && styles.sceneChipActive]}
                  onPress={() => handleSceneChipPress(option.id)}
                >
                  <Text style={styles.sceneChipLabel}>{option.scene.title}</Text>
                  <Text style={styles.sceneChipMeta}>{option.chapterTitle}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {selectedScene ? (
            <>
              <Text style={styles.sceneImageryHeading}>Paths</Text>
              <View style={styles.pathCardGrid}>
                {selectedScene.scene.paths.map((path) => {
                  const key = makeSceneKey(selectedScene.scene.id, path.id);
                  const asset = imageAssets[key];
                  const isActive = selectedPathId === path.id;
                  return (
                    <TouchableOpacity
                      key={path.id}
                      style={[styles.pathCard, isActive && styles.pathCardActive]}
                      onPress={() => handlePathPress(path.id)}
                    >
                      <View style={styles.pathCopy}>
                        <Text style={styles.pathTitle}>{path.label}</Text>
                        <Text style={styles.pathSummary}>{path.summary}</Text>
                      </View>
                      <View
                        style={[styles.pathThumbnail, asset && styles.pathThumbnailReady]}
                      >
                        {asset ? (
                          <Image source={{ uri: asset.thumbnail }} style={styles.pathThumbnailImage} />
                        ) : (
                          <Text style={styles.pathThumbnailLabel}>Awaiting art</Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <Text style={styles.sceneImageryEmpty}>No scenes available.</Text>
          )}

          <View style={styles.generateRow}>
            <TouchableOpacity
              onPress={handleGenerateImage}
              style={[
                styles.generateButton,
                (!canGenerateImage || isGenerating) && styles.generateButtonDisabled,
              ]}
              disabled={!canGenerateImage || isGenerating}
            >
              <Text style={styles.generateButtonText}>{generateLabel}</Text>
            </TouchableOpacity>
            {imageError ? <Text style={styles.generateError}>{imageError}</Text> : null}
          </View>

          {currentPath ? (
            <View style={styles.promptCard}>
              <Text style={styles.promptLabel}>Prompt</Text>
              <Text style={styles.promptValue}>{currentPath.prompt}</Text>
            </View>
          ) : null}

          <View
            style={[styles.previewFrame, previewAsset && styles.previewFrameReady]}
          >
            {previewAsset ? (
              <>
                <Image source={{ uri: previewAsset.full }} style={styles.previewImage} />
                <View style={styles.previewMeta}>
                  <Text style={styles.previewTitle}>{selectedScene?.scene.title}</Text>
                  {previewTimeLabel ? (
                    <Text style={styles.previewTimestamp}>{previewTimeLabel}</Text>
                  ) : null}
                </View>
              </>
            ) : (
              <Text style={styles.previewPlaceholder}>
                Select a path to follow and render art alongside navigation.
              </Text>
            )}
          </View>
        </View>
      </Section>

      <Section title="Runs & Replays">
        <View style={styles.listCard}>
          {runs.map((run, index) => (
            <View
              key={run.id}
              style={[styles.listRow, index === runs.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.listColumn, { flex: 2 }]}>
                <Text style={styles.listPrimary}>{run.story}</Text>
                <Text style={styles.listSecondary}>Seed {run.seed} • {run.beats} beats</Text>
              </View>
              <View style={[styles.listColumn, { flex: 1 }]}>
                <Text style={styles.listSecondary}>Creator: {run.createdBy}</Text>
                <Text style={styles.listSecondary}>Visibility: {run.visibility}</Text>
              </View>
              <Text style={styles.badge}>{run.policyFlags ? `${run.policyFlags} FLAGS` : 'HEALTHY'}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Rooms (Live Co-Play)">
        <View style={styles.listCard}>
          {rooms.map((room, index) => (
            <View
              key={room.id}
              style={[styles.listRow, index === rooms.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.listColumn, { flex: 2 }]}>
                <Text style={styles.listPrimary}>{room.story}</Text>
                <Text style={styles.listSecondary}>Members: {room.members}</Text>
              </View>
              <View style={[styles.listColumn, { flex: 1 }]}>
                <Text style={styles.listSecondary}>Mode: {room.mode}</Text>
                <Text style={styles.listSecondary}>Vote Window: {Math.round(room.voteWindowMs / 1000)}s</Text>
              </View>
              <Text style={styles.badge}>{room.status.replace('_', ' ').toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Voices & Audio">
        <View style={styles.listCard}>
          {voices.map((voice, index) => (
            <View
              key={voice.id}
              style={[styles.listRow, index === voices.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.listColumn, { flex: 2 }]}>
                <Text style={styles.listPrimary}>{voice.voiceId}</Text>
                <Text style={styles.listSecondary}>{voice.provider}</Text>
              </View>
              <View style={[styles.listColumn, { flex: 2 }]}>
                <Text style={styles.listSecondary}>{voice.license}</Text>
                {voice.defaultForStory ? (
                  <Text style={styles.listSecondary}>Default for {voice.defaultForStory}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        <View style={styles.cacheBanner}>
          <Text style={styles.cacheTitle}>TTS Cache</Text>
          <Text style={styles.cacheDescription}>
            Search cache keys or prewarm audio snippets to avoid first-play latency.
          </Text>
        </View>
      </Section>

      <Section title="Guardrails & Policies">
        <View style={styles.listCard}>
          {policyVersions.map((policy, index) => (
            <View
              key={policy.id}
              style={[styles.listRow, index === policyVersions.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.listColumn, { flex: 2 }]}>
                <Text style={styles.listPrimary}>{policy.id}</Text>
                <Text style={styles.listSecondary}>Rating: {policy.rating}</Text>
                <Text style={styles.listSecondary}>Updated: {policy.updatedAt}</Text>
              </View>
              <View style={[styles.listColumn, { flex: 3 }]}>
                <Text style={styles.listSecondary}>Disallowed: {policy.disallowed.join(', ')}</Text>
                <Text style={styles.listSecondary}>Soft Filters: {policy.softFilters.join(', ')}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.policyTestBench}>
          <Text style={styles.policyTestTitle}>Policy Test Bench</Text>
          <Text style={styles.policyTestDescription}>
            Run prompts against the active policy to inspect safety flags and masked output before publishing updates.
          </Text>
        </View>
      </Section>

      <Section title="Feature Flags & Settings">
        <View style={styles.listCard}>
          <View style={styles.listRow}>
            <View style={[styles.listColumn, { flex: 1 }]}>
              <Text style={styles.listPrimary}>Guests per day</Text>
              <Text style={styles.listSecondary}>Current limit: 500</Text>
            </View>
            <View style={[styles.listColumn, { flex: 1 }]}>
              <Text style={styles.listPrimary}>Beats per demo</Text>
              <Text style={styles.listSecondary}>Current limit: 6</Text>
            </View>
            <View style={[styles.listColumn, { flex: 1 }]}>
              <Text style={styles.listPrimary}>Premium Voices</Text>
              <Text style={styles.listSecondary}>Enabled</Text>
            </View>
          </View>
        </View>
      </Section>

      <Section title="Reports & Moderation">
        <View style={styles.listCard}>
          {reports.map((report, index) => (
            <View
              key={report.id}
              style={[styles.listRow, index === reports.length - 1 && styles.listRowLast]}
            >
              <View style={[styles.listColumn, { flex: 2 }]}>
                <Text style={styles.listPrimary}>{report.target}</Text>
                <Text style={styles.listSecondary}>{report.reason}</Text>
              </View>
              <View style={[styles.listColumn, { flex: 1 }]}>
                <Text style={styles.listSecondary}>Submitted by {report.submittedBy}</Text>
              </View>
              <Text style={styles.badge}>{report.status.toUpperCase()}</Text>
            </View>
          ))}
        </View>
        <View style={styles.auditLogBanner}>
          <Text style={styles.auditLogTitle}>Audit Log</Text>
          <Text style={styles.auditLogDescription}>
            Track every moderation and policy action for compliance review.
          </Text>
        </View>
      </Section>

      <Section title="Analytics">
        <View style={styles.cardGrid}>
          {analytics.map((metric) => (
            <View key={metric.id} style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>{metric.title}</Text>
              <Text style={styles.analyticsValue}>{metric.value}</Text>
              <Text style={styles.analyticsDescription}>{metric.description}</Text>
              <Text style={styles.analyticsTrend}>
                Trend: {metric.trend === 'up' ? '▲ Improving' : metric.trend === 'down' ? '▼ Declining' : '━ Stable'}
              </Text>
            </View>
          ))}
        </View>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#4b5563',
    marginTop: 4,
  },
  section: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#111827',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    color: '#111827',
  },
  sectionSubheading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  envRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  envItem: {
    flexBasis: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  envLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    color: '#6b7280',
    marginBottom: 4,
  },
  envValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  pillButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#111827',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  pillButtonText: {
    color: '#f9fafb',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flexBasis: '47%',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  metricLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 8,
    color: '#111827',
  },
  metricDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  listCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
  },
  listPrimary: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  listSecondary: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1f2937',
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  storyCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  storyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  storyStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065f46',
  },
  storyMeta: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  guideGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  guideCard: {
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderColor: '#e5e7eb',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  guideType: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  guideTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  guideSummary: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 4,
  },
  chapterCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderColor: '#e5e7eb',
    borderWidth: StyleSheet.hairlineWidth,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  chapterSynopsis: {
    fontSize: 13,
    color: '#4b5563',
    marginTop: 4,
    marginBottom: 12,
  },
  sceneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopColor: '#f3f4f6',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    marginTop: 10,
  },
  sceneTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  scenePremise: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  sceneStatus: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563eb',
  },
  sceneColumn: {
    marginRight: 16,
  },
  cacheBanner: {
    marginTop: 12,
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
  },
  cacheTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  cacheDescription: {
    fontSize: 13,
    color: '#d1d5db',
    marginTop: 4,
  },
  policyTestBench: {
    marginTop: 12,
    backgroundColor: '#ede9fe',
    borderRadius: 12,
    padding: 16,
  },
  policyTestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4338ca',
  },
  policyTestDescription: {
    fontSize: 13,
    color: '#3730a3',
    marginTop: 4,
  },
  auditLogBanner: {
    marginTop: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
  },
  auditLogTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
  },
  auditLogDescription: {
    fontSize: 13,
    color: '#78350f',
    marginTop: 4,
  },
  analyticsCard: {
    flexBasis: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderColor: '#e5e7eb',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  analyticsValue: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 8,
    color: '#111827',
  },
  analyticsDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  analyticsTrend: {
    fontSize: 12,
    color: '#2563eb',
    marginTop: 4,
    fontWeight: '600',
  },
  listRowLast: {
    borderBottomWidth: 0,
  },
  listColumn: {
    marginRight: 16,
  },
  sceneImageryCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 16,
    padding: 16,
  },
  sceneImageryHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sceneChipScroll: {
    marginHorizontal: -4,
  },
  sceneChipRow: {
    paddingVertical: 4,
  },
  sceneChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  sceneChipActive: {
    backgroundColor: '#2563eb',
  },
  sceneChipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  sceneChipMeta: {
    fontSize: 11,
    color: '#1f2937',
    opacity: 0.7,
  },
  sceneImageryEmpty: {
    fontSize: 14,
    color: '#6b7280',
  },
  pathCardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  pathCard: {
    flexBasis: '48%',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pathCardActive: {
    borderColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  pathCopy: {
    flex: 1,
    marginRight: 12,
  },
  pathTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  pathSummary: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  pathThumbnail: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  pathThumbnailReady: {
    borderColor: '#2563eb',
  },
  pathThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  pathThumbnailLabel: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  generateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  generateButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  generateButtonDisabled: {
    backgroundColor: '#a5b4fc',
  },
  generateButtonText: {
    color: '#f9fafb',
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  generateError: {
    fontSize: 12,
    color: '#dc2626',
    marginLeft: 12,
  },
  promptCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e7eb',
  },
  promptLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  promptValue: {
    fontSize: 13,
    color: '#1f2937',
    marginTop: 6,
  },
  previewFrame: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    padding: 12,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    marginTop: 16,
  },
  previewFrameReady: {
    backgroundColor: '#ffffff',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  previewMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  previewTimestamp: {
    fontSize: 12,
    color: '#6b7280',
  },
  previewPlaceholder: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

