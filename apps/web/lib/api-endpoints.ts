export type ApiCategory = 'internal' | 'external';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiProbeMethod = ApiMethod | 'HEAD' | 'OPTIONS';

export type ApiTestDefinition = {
  id: string;
  label: string;
  method: ApiMethod;
  path: string;
  description: string;
  category: ApiCategory;
  defaultBody?: string;
  defaultHeaders?: Record<string, string>;
  allowBody?: boolean;
  notice?: string;
  probeMethod?: ApiProbeMethod;
};

export type ApiCategoryDefinition = {
  id: ApiCategory;
  label: string;
  description: string;
  tests: ApiTestDefinition[];
};

export const API_CATEGORY_DEFINITIONS: ApiCategoryDefinition[] = [
  {
    id: 'internal',
    label: 'Internal APIs',
    description: 'Endpoints that power the operator console, guardrails, and story management.',
    tests: [
      {
        id: 'internal-runs-create',
        label: 'Create Run',
        method: 'POST',
        path: '/v1/runs',
        description: 'Create a new run stub for a story.',
        category: 'internal',
        defaultBody: JSON.stringify(
          {
            story_id: 'haunted-shore',
            seed: 1729,
          },
          null,
          2,
        ),
      },
      {
        id: 'internal-runs-next',
        label: 'Advance Run Beat',
        method: 'POST',
        path: '/v1/runs/00000000-0000-0000-0000-000000000000/next?index=0',
        description: 'Generate the next beat for an existing run.',
        category: 'internal',
        allowBody: false,
        notice: 'Replace the run ID with a valid UUID. The optional index query overrides the next beat pointer.',
      },
      {
        id: 'internal-runs-replay',
        label: 'Fetch Run Replay',
        method: 'GET',
        path: '/v1/runs/00000000-0000-0000-0000-000000000000/replay',
        description: 'Fetch and sign a replay payload for a completed run.',
        category: 'internal',
        allowBody: false,
        notice: 'Replace the run ID with a valid identifier.',
      },
      {
        id: 'internal-stories-list',
        label: 'List Stories',
        method: 'GET',
        path: '/v1/stories',
        description: 'List narrative stories stored in Supabase.',
        category: 'internal',
        allowBody: false,
      },
      {
        id: 'internal-scenes-image',
        label: 'Generate Scene Imagery',
        method: 'POST',
        path: '/v1/scenes/images',
        description: 'Request concept art for a scene path via the OpenAI image service.',
        category: 'internal',
        defaultBody: JSON.stringify(
          {
            scene_id: 'scene-1',
            scene_title: 'Boarding the Wreck',
            path_id: 'scene-1-path-a',
            path_label: "Captain's Quarters",
            path_summary: 'Investigate the sealed captain door amid storm lanterns.',
            prompt:
              "A weathered salvage crew pries open a captain's cabin on a wrecked ship, fog rolling in, spectral ropes swaying, teal and amber lighting.",
            style: 'Oil painting with volumetric light',
          },
          null,
          2,
        ),
        notice: 'Requires OPENAI_API_KEY configured on the API service.',
      },
      {
        id: 'internal-rooms-create',
        label: 'Create Room',
        method: 'POST',
        path: '/v1/rooms',
        description: 'Provision a co-play room linked to a story or run.',
        category: 'internal',
        defaultBody: JSON.stringify(
          {
            story_id: 'haunted-shore',
            mode: 'party',
          },
          null,
          2,
        ),
      },
      {
        id: 'internal-auth-session',
        label: 'Inspect Supabase Session',
        method: 'GET',
        path: '/v1/auth/session',
        description: 'Validate the Supabase session using the sb-access-token cookie/header.',
        category: 'internal',
        allowBody: false,
        notice:
          'Include an sb-access-token header or cookie when testing real sessions. Without a token, the response returns nulls.',
      },
    ],
  },
  {
    id: 'external',
    label: 'External APIs',
    description: 'Endpoints exercised by guests, partners, or automation outside the console.',
    tests: [
      {
        id: 'external-demo-start',
        label: 'Start Demo',
        method: 'POST',
        path: '/v1/demos/start',
        description: 'Begin the 3-beat Haunted Shore demo flow.',
        category: 'external',
        allowBody: false,
        notice: 'No body required. Returns guest and run identifiers for follow-up calls.',
      },
      {
        id: 'external-demo-next',
        label: 'Advance Demo',
        method: 'POST',
        path: '/v1/demos/next',
        description: 'Advance to the next beat in the guest demo session.',
        category: 'external',
        defaultBody: JSON.stringify(
          {
            guest_id: 'replace-with-guest-id-from-start',
          },
          null,
          2,
        ),
        notice: 'Use the guest_id returned from the demo start response.',
      },
      {
        id: 'external-demo-complete',
        label: 'Complete Demo',
        method: 'POST',
        path: '/v1/demos/complete',
        description: 'Clear demo state and surface CTA destinations.',
        category: 'external',
        defaultBody: JSON.stringify(
          {
            guest_id: 'replace-with-guest-id-from-start',
          },
          null,
          2,
        ),
      },
      {
        id: 'external-video-create',
        label: 'Create Video Job',
        method: 'POST',
        path: '/api/v1/jobs',
        description: 'Submit a branded video render using overlay instructions.',
        category: 'external',
        defaultBody: JSON.stringify(
          {
            source_url: 'https://cdn.example.com/ovida-demo.mp4',
            overlays: [
              {
                type: 'text',
                text: 'OVIDA PRESENTS',
                fontfile: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
                fontsize: 64,
                fontcolor: 'white',
                x: '(w-text_w)/2',
                y: '50',
                start: 0,
                end: 5,
                shadow: true,
              },
              {
                type: 'logo',
                asset_url: 'https://cdn.example.com/brand/mark.png',
                x: 'main_w-180',
                y: 'main_h-140',
                start: 1.5,
                end: 8.5,
                fade_in: 0.3,
                fade_out: 0.6,
                scale: '0.35',
              },
            ],
            output_format: 'mp4',
            callback_url: 'https://example.com/webhooks/video',
          },
          null,
          2,
        ),
        defaultHeaders: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer <VIDEO_API_KEY>',
        },
        notice: 'Requires a valid VIDEO_API_KEY configured on the API origin.',
        probeMethod: 'OPTIONS',
      },
      {
        id: 'external-video-status',
        label: 'Check Video Job Status',
        method: 'GET',
        path: '/api/v1/jobs/job_12345',
        description: 'Poll the processing status for a video render job.',
        category: 'external',
        allowBody: false,
        defaultHeaders: {
          Authorization: 'Bearer <VIDEO_API_KEY>',
        },
        notice: 'Replace job_12345 with the identifier returned from the create job request.',
      },
      {
        id: 'external-video-download',
        label: 'Download Video Output',
        method: 'GET',
        path: '/api/v1/jobs/job_12345/download',
        description: 'Retrieve the rendered asset once the job completes.',
        category: 'external',
        allowBody: false,
        defaultHeaders: {
          Authorization: 'Bearer <VIDEO_API_KEY>',
        },
        notice: 'Successful jobs redirect to the generated asset URL.',
      },
    ],
  },
];
