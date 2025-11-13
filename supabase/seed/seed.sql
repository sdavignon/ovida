-- sample guests for demo content
insert into public.guests (id)
values
  ('00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000002'),
  ('00000000-0000-0000-0000-000000000003')
on conflict (id) do nothing;

-- policy versions powering admin policy panel
insert into public.policy_versions (id, rating_label, disallowed_topics, soft_filters, summary, published_at)
values
  (
    'policy-4',
    'T for Teen',
    array['Explicit violence', 'Sexual content', 'Slurs'],
    array['Body horror', 'Existential dread'],
    'Teen-friendly moderation tuned for public showcase rooms.',
    now() - interval '4 hours'
  ),
  (
    'policy-3',
    'PG-13',
    array['Explicit violence', 'Strong profanity'],
    array['Religious themes'],
    'Showcase-ready policy balancing tone and accessibility.',
    now() - interval '2 days'
  )
on conflict (id) do update
  set rating_label = excluded.rating_label,
      disallowed_topics = excluded.disallowed_topics,
      soft_filters = excluded.soft_filters,
      summary = excluded.summary,
      published_at = excluded.published_at;

-- story catalogue
insert into public.stories (id, title, canon_version, policy_version, owner_name, status, summary)
values
  (
    'haunted-shore',
    'Haunted Shore',
    'v4',
    'policy-4',
    'Jess (Producer)',
    'published',
    'Fogbound salvage crews chase phantasms along the Mistbound Coast.'
  ),
  (
    'chronomancer-uprising',
    'Chronomancer Uprising',
    'v1',
    'policy-3',
    'Liam (Producer)',
    'draft',
    'Temporal rebels seize the Clockwork Citadel and fracture timelines.'
  )
on conflict (id) do update
  set title = excluded.title,
      canon_version = excluded.canon_version,
      policy_version = excluded.policy_version,
      owner_name = excluded.owner_name,
      status = excluded.status,
      summary = excluded.summary;

-- story guides
insert into public.story_guides (id, story_id, guide_type, title, summary, sort_order)
values
  ('guide-haunted-captain-edda', 'haunted-shore', 'Character', 'Captain Edda', 'Gruff salvager with secrets; gravelly voice, kind-hearted center.', 1),
  ('guide-haunted-mistbound-coast', 'haunted-shore', 'World', 'Mistbound Coast', 'Fog conceals phantasms and salt-corroded clockwork tech.', 2),
  ('guide-haunted-pg13-style', 'haunted-shore', 'Style', 'PG-13 Slow Burn', 'Lean pacing, suppressed gore, sustained tension.', 3),
  ('guide-chrono-archivist-nyla', 'chronomancer-uprising', 'Character', 'Archivist Nyla', 'Time-locked archivist trading memories for favours.', 1)
on conflict (id) do update
  set story_id = excluded.story_id,
      guide_type = excluded.guide_type,
      title = excluded.title,
      summary = excluded.summary,
      sort_order = excluded.sort_order;

-- chapters
insert into public.story_chapters (id, story_id, chapter_order, title, synopsis)
values
  ('chapter-haunted-1', 'haunted-shore', 1, 'Arrival at Low Tide', 'The crew reaches the abandoned docks and senses echoes.'),
  ('chapter-haunted-2', 'haunted-shore', 2, 'Signals in the Storm', 'A beacon lures the crew deeper into the fog.'),
  ('chapter-chrono-1', 'chronomancer-uprising', 1, 'Clockwork Citadel', 'Rebel chronomancers seize the capital tower.')
on conflict (id) do update
  set story_id = excluded.story_id,
      chapter_order = excluded.chapter_order,
      title = excluded.title,
      synopsis = excluded.synopsis;

-- scenes
insert into public.story_scenes (id, chapter_id, scene_order, title, premise, status)
values
  ('scene-haunted-boarding-wreck', 'chapter-haunted-1', 1, 'Boarding the Wreck', 'Explore the shipwreck and uncover the first haunt.', 'published'),
  ('scene-haunted-echoes-hold', 'chapter-haunted-1', 2, 'Echoes in the Hold', 'Negotiate with lingering spirits to earn safe passage.', 'ready'),
  ('scene-haunted-broken-beacon', 'chapter-haunted-2', 1, 'The Broken Beacon', 'Repairing the beacon reveals a paradoxical signal.', 'draft'),
  ('scene-chrono-breach-vault', 'chapter-chrono-1', 1, 'Breach the Vault', 'Bend temporal locks to reach the archives.', 'draft')
on conflict (id) do update
  set chapter_id = excluded.chapter_id,
      scene_order = excluded.scene_order,
      title = excluded.title,
      premise = excluded.premise,
      status = excluded.status;

-- voice inventory
insert into public.voices (id, provider, voice_handle, license, default_story_id, tags, is_active)
values
  ('voice-mistwarden', 'ElevenLabs', 'MistWarden', 'Streaming + Replay', 'haunted-shore', array['default', 'showcase'], true),
  ('voice-chronoadept', 'PlayHT', 'ChronoAdept', 'Streaming only', 'chronomancer-uprising', array['beta'], true),
  ('voice-oracle-delta', 'MetaVoice', 'Oracle-Δ', 'Streaming + Commercial', null, array['premium'], true)
on conflict (id) do update
  set provider = excluded.provider,
      voice_handle = excluded.voice_handle,
      license = excluded.license,
      default_story_id = excluded.default_story_id,
      tags = excluded.tags,
      is_active = excluded.is_active;

-- demo runs to populate activity feed
insert into public.runs (id, story_id, guest_id, seed, model_version, policy_version, canon_version, visibility, checksum, created_at)
values
  ('44444444-4444-4444-4444-444444444444', 'haunted-shore', '00000000-0000-0000-0000-000000000001', 4213, 'narrative-v1', 'policy-4', 'v4', 'public', 'checksum-haunted', now() - interval '15 minutes'),
  ('55555555-5555-5555-5555-555555555555', 'chronomancer-uprising', '00000000-0000-0000-0000-000000000002', 9921, 'narrative-v1', 'policy-3', 'v1', 'public', 'checksum-chrono', now() - interval '1 day')
on conflict (id) do nothing;

-- room roster
insert into public.rooms (id, story_id, run_id, host_guest_id, mode, quorum, vote_window_ms, status, admin_label, member_estimate, last_activity_at)
values
  ('11111111-1111-1111-1111-111111111111', 'haunted-shore', '44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000001', 'party', 36, 12000, 'vote_open', 'RM-317', 48, now() - interval '2 minutes'),
  ('22222222-2222-2222-2222-222222222222', 'chronomancer-uprising', '55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000002', 'global', 180, 8000, 'playing', 'RM-992', 212, now() - interval '10 minutes'),
  ('33333333-3333-3333-3333-333333333333', 'haunted-shore', null, '00000000-0000-0000-0000-000000000003', 'duo', 2, 15000, 'paused', 'RM-101', 2, now() - interval '25 minutes')
on conflict (id) do update
  set story_id = excluded.story_id,
      run_id = excluded.run_id,
      host_guest_id = excluded.host_guest_id,
      mode = excluded.mode,
      quorum = excluded.quorum,
      vote_window_ms = excluded.vote_window_ms,
      status = excluded.status,
      admin_label = excluded.admin_label,
      member_estimate = excluded.member_estimate,
      last_activity_at = excluded.last_activity_at;

-- policy flags tied to guardrails
insert into public.policy_flags (id, run_id, event_idx, rule_id, flag_severity, description, status, created_at)
values
  (
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    12,
    'language.profanity',
    'warn',
    'Flagged beat on Haunted Shore — profanity masked by policy v2.',
    'open',
    now() - interval '10 minutes'
  )
on conflict (id) do nothing;

-- user reports
insert into public.reports (id, target_type, target_id, reason, status, submitted_by_guest, created_at)
values
  (
    '77777777-7777-7777-7777-777777777777',
    'room',
    'RM-317',
    'Off-topic roleplay',
    'reviewing',
    '00000000-0000-0000-0000-000000000003',
    now() - interval '18 minutes'
  ),
  (
    '88888888-8888-8888-8888-888888888888',
    'run',
    '44444444-4444-4444-4444-444444444444',
    'Lore inconsistency',
    'open',
    '00000000-0000-0000-0000-000000000002',
    now() - interval '1 hour'
  )
on conflict (id) do update
  set target_type = excluded.target_type,
      target_id = excluded.target_id,
      reason = excluded.reason,
      status = excluded.status,
      submitted_by_guest = excluded.submitted_by_guest,
      created_at = excluded.created_at;

-- dashboard metrics
insert into public.admin_metrics (metric_id, category, label, value, description, trend, display_order)
values
  ('metric-active-rooms', 'dashboard', 'Active Rooms', '12', 'Live rooms in the last hour', 'up', 1),
  ('metric-vote-participation', 'dashboard', 'Vote Participation', '78%', 'Last 24 hours', 'down', 2),
  ('metric-tts-cache', 'dashboard', 'TTS Cache Hit', '91%', 'Rolling 24 hour window', 'flat', 3),
  ('metric-audio-latency', 'dashboard', 'Choice → Audio Latency', '1.6s', 'P95 across all rooms', 'down', 4),
  ('metric-policy-flags', 'dashboard', 'Policy Flags', '3', 'Awaiting moderator review', 'up', 5)
on conflict (metric_id) do update
  set category = excluded.category,
      label = excluded.label,
      value = excluded.value,
      description = excluded.description,
      trend = excluded.trend,
      display_order = excluded.display_order;

-- analytics metrics
insert into public.admin_metrics (metric_id, category, label, value, description, trend, display_order)
values
  ('metric-avg-beat-rating', 'analytics', 'Average Beat Rating', '4.6 / 5', 'Guest thumbs-up / thumbs-down ratio (24h).', 'up', 1),
  ('metric-policy-interventions', 'analytics', 'Policy Interventions', '17', 'Auto-moderated beats this week.', 'flat', 2),
  ('metric-audio-latency-median', 'analytics', 'Audio Render Latency', '1.8s', 'Median seconds from vote close to playback.', 'down', 3)
on conflict (metric_id) do update
  set category = excluded.category,
      label = excluded.label,
      value = excluded.value,
      description = excluded.description,
      trend = excluded.trend,
      display_order = excluded.display_order;
