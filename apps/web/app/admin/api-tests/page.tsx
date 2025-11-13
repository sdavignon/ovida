'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { apiOrigin } from '@/lib/config';
import styles from './page.module.css';

type ApiCategory = 'internal' | 'external';

type ApiTestDefinition = {
  id: string;
  label: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  description: string;
  category: ApiCategory;
  defaultBody?: string;
  defaultHeaders?: Record<string, string>;
  allowBody?: boolean;
  notice?: string;
};

type ApiCategoryDefinition = {
  id: ApiCategory;
  label: string;
  description: string;
  tests: ApiTestDefinition[];
};

type RequestStatus = 'idle' | 'loading' | 'success' | 'error';

type RequestState = {
  path: string;
  body: string;
  headers: string;
  status: RequestStatus;
  statusCode?: number;
  durationMs?: number;
  responseBody?: string;
  error?: string;
};

const defaultExternalOrigin =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_EXTERNAL_API_ORIGIN
    ? process.env.NEXT_PUBLIC_EXTERNAL_API_ORIGIN
    : apiOrigin;

const CATEGORY_DEFINITIONS: ApiCategoryDefinition[] = [
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

const createInitialState = () => {
  const defaults: Record<string, RequestState> = {};
  CATEGORY_DEFINITIONS.forEach((category) => {
    category.tests.forEach((test) => {
      const headers = test.defaultHeaders ?? (test.allowBody === false || test.method === 'GET'
        ? {}
        : { 'Content-Type': 'application/json' });
      defaults[test.id] = {
        path: test.path,
        body: test.defaultBody ?? '',
        headers: Object.keys(headers).length ? JSON.stringify(headers, null, 2) : '',
        status: 'idle',
      };
    });
  });
  return defaults;
};

const formatResponseBody = (payload: string) => {
  const trimmed = payload.trim();
  if (!trimmed) {
    return '∅ No response body';
  }
  try {
    return JSON.stringify(JSON.parse(trimmed), null, 2);
  } catch {
    return payload;
  }
};

const methodLabel = (method: ApiTestDefinition['method']) => method.toUpperCase();

export default function ApiTestToolsPage() {
  const [origins, setOrigins] = useState<Record<ApiCategory, string>>({
    internal: apiOrigin,
    external: defaultExternalOrigin,
  });
  const [requests, setRequests] = useState<Record<string, RequestState>>(() => createInitialState());

  const allTests = useMemo(() => {
    const accumulator: Record<string, ApiTestDefinition> = {};
    CATEGORY_DEFINITIONS.forEach((category) => {
      category.tests.forEach((test) => {
        accumulator[test.id] = test;
      });
    });
    return accumulator;
  }, []);

  const resetTest = (testId: string) => {
    const test = allTests[testId];
    if (!test) return;
    setRequests((prev) => ({
      ...prev,
      [testId]: createInitialState()[testId],
    }));
  };

  const sendRequest = async (test: ApiTestDefinition) => {
    const current = requests[test.id];
    if (!current) return;

    const origin = origins[test.category]?.trim();
    const pathInput = current.path.trim();

    const useAbsoluteUrl = /^https?:\/\//i.test(pathInput);
    if (!useAbsoluteUrl && (!origin || origin.length === 0)) {
      setRequests((prev) => ({
        ...prev,
        [test.id]: {
          ...prev[test.id],
          status: 'error',
          error: 'Set a base origin or provide an absolute URL.',
        },
      }));
      return;
    }

    let headerRecord: Record<string, string> = {};
    if (current.headers.trim().length > 0) {
      try {
        const parsed = JSON.parse(current.headers) as Record<string, unknown>;
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          throw new Error('Headers must be a JSON object');
        }
        headerRecord = Object.fromEntries(
          Object.entries(parsed).map(([key, value]) => [key, String(value)]),
        );
      } catch (error) {
        setRequests((prev) => ({
          ...prev,
          [test.id]: {
            ...prev[test.id],
            status: 'error',
            error: error instanceof Error ? error.message : 'Unable to parse headers JSON.',
          },
        }));
        return;
      }
    }

    const hasBody =
      (test.allowBody ?? test.method !== 'GET') && current.body.trim().length > 0;

    if (hasBody) {
      const hasContentType = Object.keys(headerRecord).some(
        (key) => key.toLowerCase() === 'content-type',
      );
      if (!hasContentType) {
        headerRecord['Content-Type'] = 'application/json';
      }
    }

    const sanitizedOrigin = origin?.replace(/\/+$/, '');
    const sanitizedPath = useAbsoluteUrl
      ? pathInput
      : `${sanitizedOrigin}${pathInput.startsWith('/') ? pathInput : `/${pathInput}`}`;

    setRequests((prev) => ({
      ...prev,
      [test.id]: {
        ...prev[test.id],
        status: 'loading',
        error: undefined,
        responseBody: undefined,
        statusCode: undefined,
        durationMs: undefined,
      },
    }));

    const start = performance.now();

    try {
      const response = await fetch(sanitizedPath, {
        method: test.method,
        headers: Object.keys(headerRecord).length ? headerRecord : undefined,
        body: hasBody ? current.body : undefined,
      });
      const duration = performance.now() - start;
      const text = await response.text();

      setRequests((prev) => ({
        ...prev,
        [test.id]: {
          ...prev[test.id],
          status: response.ok ? 'success' : 'error',
          statusCode: response.status,
          durationMs: duration,
          responseBody: formatResponseBody(text),
          error: response.ok ? undefined : `${response.status} ${response.statusText}`,
        },
      }));
    } catch (error) {
      const duration = performance.now() - start;
      setRequests((prev) => ({
        ...prev,
        [test.id]: {
          ...prev[test.id],
          status: 'error',
          statusCode: undefined,
          durationMs: duration,
          responseBody: undefined,
          error: error instanceof Error ? error.message : 'Request failed',
        },
      }));
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Diagnostics</p>
          <h1>API Test Tools</h1>
          <p className={styles.intro}>
            Exercise the application APIs with default payloads. Adjust the request details, send calls
            against internal services or public endpoints, and inspect the live responses.
          </p>
        </div>
        <Link className={styles.backLink} href="/admin">
          ← Back to Admin
        </Link>
      </header>

      <section className={styles.originSection}>
        <h2>Environment Targets</h2>
        <p className={styles.originCopy}>
          Define the base origins for the internal microservices cluster and the external partner API.
          Paths can also be overridden per request.
        </p>
        <div className={styles.originGrid}>
          {(['internal', 'external'] as ApiCategory[]).map((category) => (
            <label key={category} className={styles.originField}>
              <span>{category === 'internal' ? 'Internal API Origin' : 'External API Origin'}</span>
              <input
                value={origins[category]}
                onChange={(event) =>
                  setOrigins((prev) => ({ ...prev, [category]: event.target.value }))
                }
                placeholder="https://api.example.com"
              />
              <small>
                {category === 'internal'
                  ? 'Defaults to NEXT_PUBLIC_API_ORIGIN.'
                  : 'Set to partner-facing domain if different from the internal origin.'}
              </small>
            </label>
          ))}
        </div>
      </section>

      {CATEGORY_DEFINITIONS.map((category) => (
        <section key={category.id} className={styles.categorySection}>
          <header className={styles.categoryHeader}>
            <div>
              <h2>{category.label}</h2>
              <p>{category.description}</p>
            </div>
            <span className={styles.originSummary}>
              Target:{' '}
              {origins[category.id] && origins[category.id].trim().length > 0
                ? origins[category.id]
                : '— not set —'}
            </span>
          </header>

          <div className={styles.testGrid}>
            {category.tests.map((test) => {
              const state = requests[test.id];
              const allowBody = test.allowBody ?? test.method !== 'GET';

              return (
                <article key={test.id} className={styles.testCard}>
                  <div className={styles.testHeader}>
                    <span className={styles.methodBadge} data-method={test.method}>
                      {methodLabel(test.method)}
                    </span>
                    <input
                      className={styles.pathInput}
                      value={state?.path ?? test.path}
                      onChange={(event) =>
                        setRequests((prev) => ({
                          ...prev,
                          [test.id]: {
                            ...prev[test.id],
                            path: event.target.value,
                          },
                        }))
                      }
                    />
                  </div>
                  <h3>{test.label}</h3>
                  <p className={styles.description}>{test.description}</p>
                  {test.notice ? <p className={styles.notice}>{test.notice}</p> : null}

                  {allowBody ? (
                    <label className={styles.field}>
                      <span>Request Body</span>
                      <textarea
                        rows={8}
                        value={state?.body ?? ''}
                        onChange={(event) =>
                          setRequests((prev) => ({
                            ...prev,
                            [test.id]: {
                              ...prev[test.id],
                              body: event.target.value,
                            },
                          }))
                        }
                        placeholder={`{\n  "key": "value"\n}`}
                      />
                    </label>
                  ) : (
                    <div className={styles.noBody}>Body not required for this request.</div>
                  )}

                  <label className={styles.field}>
                    <span>Headers (JSON)</span>
                    <textarea
                      rows={4}
                      value={state?.headers ?? ''}
                      onChange={(event) =>
                        setRequests((prev) => ({
                          ...prev,
                          [test.id]: {
                            ...prev[test.id],
                            headers: event.target.value,
                          },
                        }))
                      }
                      placeholder={`{\n  "Authorization": "Bearer ..."\n}`}
                    />
                  </label>

                  <div className={styles.actions}>
                    <button
                      type="button"
                      onClick={() => sendRequest(test)}
                      disabled={state?.status === 'loading'}
                    >
                      {state?.status === 'loading' ? 'Sending…' : 'Send Request'}
                    </button>
                    <button type="button" className={styles.resetButton} onClick={() => resetTest(test.id)}>
                      Reset
                    </button>
                  </div>

                  <div
                    className={styles.result}
                    data-status={state?.status ?? 'idle'}
                  >
                    {state?.statusCode !== undefined ? (
                      <p className={styles.resultStatus}>
                        Status {state.statusCode}
                        {typeof state.durationMs === 'number'
                          ? ` · ${Math.round(state.durationMs)} ms`
                          : null}
                      </p>
                    ) : (
                      <p className={styles.resultStatus}>No response yet</p>
                    )}
                    {state?.error ? <p className={styles.error}>{state.error}</p> : null}
                    {state?.responseBody ? (
                      <pre className={styles.responseBody}>{state.responseBody}</pre>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
