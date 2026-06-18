'use client';

import Link from 'next/link';
import { type ChangeEvent, useMemo, useState } from 'react';
import {
  API_CATEGORY_DEFINITIONS,
  type ApiCategory,
  type ApiTestDefinition,
} from '@/lib/api-endpoints';
import { apiOrigin } from '@/lib/config';
import styles from './page.module.css';

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

const getDefaultHeaders = (test: ApiTestDefinition) =>
  test.defaultHeaders ?? (test.allowBody === false || test.method === 'GET' ? {} : { 'Content-Type': 'application/json' });

const getDefaultState = (test: ApiTestDefinition): RequestState => {
  const headers = getDefaultHeaders(test);
  return {
    path: test.path,
    body: test.defaultBody ?? '',
    headers: Object.keys(headers).length ? JSON.stringify(headers, null, 2) : '',
    status: 'idle',
  };
};

const createInitialState = () => {
  const defaults: Record<string, RequestState> = {};
  API_CATEGORY_DEFINITIONS.forEach((category) => {
    category.tests.forEach((test) => {
      defaults[test.id] = getDefaultState(test);
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

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => resolve(String(reader.result ?? '')));
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read file')));
    reader.readAsDataURL(file);
  });

const formatFileLabel = (file?: File | null) => {
  if (!file) return 'No file selected';
  const sizeMb = file.size / 1024 / 1024;
  return `${file.name} · ${sizeMb.toFixed(sizeMb >= 10 ? 1 : 2)} MB`;
};

type FfmpegToolStatus = 'idle' | 'loading' | 'success' | 'error';

type FfmpegToolState = {
  sourceFile?: File | null;
  sourceDataUrl?: string;
  logoFile?: File | null;
  logoDataUrl?: string;
  audioFile?: File | null;
  audioDataUrl?: string;
  videoApiKey: string;
  jobId: string;
  status: FfmpegToolStatus;
  message: string;
  result: string;
  log: string;
  downloadUrl?: string;
  outputFormat: 'mp4' | 'mov' | 'mkv';
  overlayText: string;
  fontFile: string;
};

const getInitialFfmpegToolState = (): FfmpegToolState => ({
  videoApiKey: '',
  jobId: '',
  status: 'idle',
  message: 'Upload a source video, optionally add logo/audio assets, then run a render.',
  result: '',
  log: '',
  outputFormat: 'mp4',
  overlayText: 'OVIDA TEST RENDER',
  fontFile: '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
});

export default function ApiTestToolsPage() {
  const [origins, setOrigins] = useState<Record<ApiCategory, string>>({
    internal: apiOrigin,
    external: defaultExternalOrigin,
  });
  const [requests, setRequests] = useState<Record<string, RequestState>>(() => createInitialState());
  const [ffmpegTool, setFfmpegTool] = useState<FfmpegToolState>(() => getInitialFfmpegToolState());

  const allTests = useMemo(
    () =>
      API_CATEGORY_DEFINITIONS.reduce<Record<string, ApiTestDefinition>>((accumulator, category) => {
        category.tests.forEach((test) => {
          accumulator[test.id] = test;
        });
        return accumulator;
      }, {}),
    [],
  );

  const resetTest = (testId: string) => {
    const test = allTests[testId];
    if (!test) return;
    setRequests((prev) => ({
      ...prev,
      [testId]: getDefaultState(test),
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


  const buildExternalApiUrl = (path: string) => {
    const origin = origins.external?.trim().replace(/\/+$/, '');
    if (!origin) {
      throw new Error('Set the External API Origin before running the ffmpeg tool.');
    }
    return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const updateFfmpegFile = async (
    field: 'source' | 'logo' | 'audio',
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setFfmpegTool((prev) => ({
        ...prev,
        [`${field}File`]: null,
        [`${field}DataUrl`]: undefined,
      }));
      return;
    }

    setFfmpegTool((prev) => ({
      ...prev,
      status: 'loading',
      message: `Reading ${file.name}…`,
    }));

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setFfmpegTool((prev) => ({
        ...prev,
        [`${field}File`]: file,
        [`${field}DataUrl`]: dataUrl,
        status: 'idle',
        message: `${file.name} is ready for the ffmpeg API request.`,
      }));
    } catch (error) {
      setFfmpegTool((prev) => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to read selected file.',
      }));
    }
  };

  const uploadFfmpegAsset = async (file: File, apiKey: string) => {
    const body = new FormData();
    body.append('file', file);

    const response = await fetch(buildExternalApiUrl('/api/v1/uploads'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body,
    });
    const text = await response.text();
    let parsed: { url?: string; message?: string } | null = null;
    try {
      parsed = text.trim() ? JSON.parse(text) as { url?: string; message?: string } : null;
    } catch {
      parsed = null;
    }
    if (!response.ok || !parsed?.url) {
      throw new Error(parsed?.message ?? (text.trim() || `Upload failed: ${response.status} ${response.statusText}`));
    }
    return parsed.url;
  };

  const fetchFfmpegLog = async (jobId: string, apiKey: string) => {
    const response = await fetch(buildExternalApiUrl(`/api/v1/jobs/${jobId}/log`), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = await response.text();
    if (!response.ok) {
      return text.trim() ? formatResponseBody(text) : `${response.status} ${response.statusText}`;
    }
    return text.trim() || '∅ Log is empty';
  };

  const checkFfmpegStatus = async (jobId = ffmpegTool.jobId, apiKey = ffmpegTool.videoApiKey) => {
    const trimmedJobId = jobId.trim();
    const trimmedApiKey = apiKey.trim();
    if (!trimmedJobId || !trimmedApiKey) {
      setFfmpegTool((prev) => ({
        ...prev,
        status: 'error',
        message: 'Provide both a job ID and VIDEO_API_KEY before checking status.',
      }));
      return null;
    }

    setFfmpegTool((prev) => ({ ...prev, status: 'loading', message: `Checking ${trimmedJobId}…` }));

    try {
      const response = await fetch(buildExternalApiUrl(`/api/v1/jobs/${trimmedJobId}`), {
        headers: { Authorization: `Bearer ${trimmedApiKey}` },
      });
      const text = await response.text();
      const formatted = formatResponseBody(text);
      let parsed: { status?: string; download_url?: string | null; error?: string | null } | null = null;
      try {
        parsed = text.trim() ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      const log = await fetchFfmpegLog(trimmedJobId, trimmedApiKey);
      const succeeded = response.ok && parsed?.status !== 'failed';
      setFfmpegTool((prev) => ({
        ...prev,
        jobId: trimmedJobId,
        status: succeeded ? 'success' : 'error',
        message: response.ok
          ? `Job ${trimmedJobId} is ${parsed?.status ?? 'unknown'}.`
          : `Status request failed: ${response.status} ${response.statusText}`,
        result: formatted,
        log,
        downloadUrl: parsed?.download_url ?? prev.downloadUrl,
      }));
      return parsed;
    } catch (error) {
      setFfmpegTool((prev) => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to check ffmpeg job status.',
      }));
      return null;
    }
  };

  const pollFfmpegJob = async (jobId: string, apiKey: string) => {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, attempt === 0 ? 1000 : 2000));
      const status = await checkFfmpegStatus(jobId, apiKey);
      if (status?.status === 'completed' || status?.status === 'failed') {
        return;
      }
    }
    setFfmpegTool((prev) => ({
      ...prev,
      status: 'success',
      message: 'Polling timed out after 60 seconds. Use Check status/log to continue watching the job.',
    }));
  };

  const runFfmpegTool = async () => {
    const apiKey = ffmpegTool.videoApiKey.trim();
    if (!apiKey) {
      setFfmpegTool((prev) => ({ ...prev, status: 'error', message: 'Enter a VIDEO_API_KEY before running.' }));
      return;
    }
    if (!ffmpegTool.sourceFile) {
      setFfmpegTool((prev) => ({ ...prev, status: 'error', message: 'Upload a source video before running.' }));
      return;
    }

    setFfmpegTool((prev) => ({
      ...prev,
      status: 'loading',
      message: 'Uploading ffmpeg assets…',
      result: '',
      log: '',
      downloadUrl: undefined,
    }));

    let sourceUrl: string;
    let logoUrl: string | undefined;
    let audioUrl: string | undefined;
    try {
      sourceUrl = await uploadFfmpegAsset(ffmpegTool.sourceFile, apiKey);
      logoUrl = ffmpegTool.logoFile ? await uploadFfmpegAsset(ffmpegTool.logoFile, apiKey) : undefined;
      audioUrl = ffmpegTool.audioFile ? await uploadFfmpegAsset(ffmpegTool.audioFile, apiKey) : undefined;
    } catch (error) {
      setFfmpegTool((prev) => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to upload ffmpeg assets.',
      }));
      return;
    }

    const payload = {
      source_url: sourceUrl,
      overlays: [
        {
          type: 'text',
          text: ffmpegTool.overlayText,
          fontfile: ffmpegTool.fontFile,
          fontsize: 48,
          fontcolor: 'white',
          x: '(w-text_w)/2',
          y: 'h-96',
          start: 0,
          end: 4,
          shadow: true,
        },
        ...(logoUrl
          ? [
              {
                type: 'logo',
                asset_url: logoUrl,
                x: 'main_w-overlay_w-32',
                y: 'main_h-overlay_h-32',
                start: 0,
                end: 6,
                fade_in: 0.25,
                fade_out: 0.25,
                scale: '0.25',
              },
            ]
          : []),
      ],
      output_format: ffmpegTool.outputFormat,
      ...(audioUrl ? { audio_url: audioUrl } : {}),
    };

    setFfmpegTool((prev) => ({
      ...prev,
      status: 'loading',
      message: 'Submitting ffmpeg render job…',
      result: JSON.stringify(payload, null, 2),
      log: '',
      downloadUrl: undefined,
    }));

    try {
      const response = await fetch(buildExternalApiUrl('/api/v1/jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const formatted = formatResponseBody(text);
      const parsed = text.trim() ? JSON.parse(text) as { job_id?: string } : null;
      if (!response.ok || !parsed?.job_id) {
        setFfmpegTool((prev) => ({
          ...prev,
          status: 'error',
          message: `Create job failed: ${response.status} ${response.statusText}`,
          result: formatted,
        }));
        return;
      }

      setFfmpegTool((prev) => ({
        ...prev,
        status: 'success',
        message: `Created ${parsed.job_id}. Polling status and ffmpeg log…`,
        jobId: parsed.job_id!,
        result: formatted,
      }));
      await pollFfmpegJob(parsed.job_id, apiKey);
    } catch (error) {
      setFfmpegTool((prev) => ({
        ...prev,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to run ffmpeg API test.',
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


      <section id="ffmpeg-api-tool" className={styles.ffmpegSection}>
        <div className={styles.ffmpegHeader}>
          <div>
            <p className={styles.eyebrow}>ffmpeg workflow</p>
            <h2>Upload Assets & Run Video Job</h2>
            <p>
              Upload local test assets to real URLs, submit them to the ffmpeg API, poll for results,
              and fetch the archived render log without leaving the admin test page.
            </p>
          </div>
          {ffmpegTool.downloadUrl ? (
            <a className={styles.downloadLink} href={ffmpegTool.downloadUrl} target="_blank" rel="noreferrer">
              Open rendered video ↗
            </a>
          ) : null}
        </div>

        <div className={styles.ffmpegGrid}>
          <label className={styles.fileField}>
            <span>Source video</span>
            <input type="file" accept="video/mp4,video/quicktime,video/x-matroska" onChange={(event) => updateFfmpegFile('source', event)} />
            <small>{formatFileLabel(ffmpegTool.sourceFile)}</small>
          </label>
          <label className={styles.fileField}>
            <span>Logo overlay</span>
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => updateFfmpegFile('logo', event)} />
            <small>{formatFileLabel(ffmpegTool.logoFile)}</small>
          </label>
          <label className={styles.fileField}>
            <span>Replacement audio</span>
            <input type="file" accept="audio/mpeg,audio/wav,audio/x-wav" onChange={(event) => updateFfmpegFile('audio', event)} />
            <small>{formatFileLabel(ffmpegTool.audioFile)}</small>
          </label>
        </div>

        <div className={styles.ffmpegControls}>
          <label className={styles.compactField}>
            <span>VIDEO_API_KEY</span>
            <input
              type="password"
              value={ffmpegTool.videoApiKey}
              onChange={(event) => setFfmpegTool((prev) => ({ ...prev, videoApiKey: event.target.value }))}
              placeholder="Bearer token value"
            />
          </label>
          <label className={styles.compactField}>
            <span>Job ID</span>
            <input
              value={ffmpegTool.jobId}
              onChange={(event) => setFfmpegTool((prev) => ({ ...prev, jobId: event.target.value }))}
              placeholder="job_..."
            />
          </label>
          <label className={styles.compactField}>
            <span>Output</span>
            <select
              value={ffmpegTool.outputFormat}
              onChange={(event) =>
                setFfmpegTool((prev) => ({ ...prev, outputFormat: event.target.value as FfmpegToolState['outputFormat'] }))
              }
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="mkv">MKV</option>
            </select>
          </label>
          <label className={styles.compactField}>
            <span>Text overlay</span>
            <input
              value={ffmpegTool.overlayText}
              onChange={(event) => setFfmpegTool((prev) => ({ ...prev, overlayText: event.target.value }))}
            />
          </label>
          <label className={styles.compactField}>
            <span>Font file on API host</span>
            <input
              value={ffmpegTool.fontFile}
              onChange={(event) => setFfmpegTool((prev) => ({ ...prev, fontFile: event.target.value }))}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button type="button" onClick={runFfmpegTool} disabled={ffmpegTool.status === 'loading'}>
            {ffmpegTool.status === 'loading' ? 'Running…' : 'Upload & Run ffmpeg Job'}
          </button>
          <button type="button" className={styles.resetButton} onClick={() => checkFfmpegStatus()} disabled={ffmpegTool.status === 'loading'}>
            Check status/log
          </button>
          <button type="button" className={styles.resetButton} onClick={() => setFfmpegTool(getInitialFfmpegToolState())}>
            Reset ffmpeg tool
          </button>
        </div>

        <div className={styles.result} data-status={ffmpegTool.status}>
          <p className={styles.resultStatus}>{ffmpegTool.message}</p>
          <div className={styles.ffmpegResults}>
            <div>
              <h3>Job result</h3>
              <pre className={styles.responseBody}>{ffmpegTool.result || 'Create or check a job to see status JSON.'}</pre>
            </div>
            <div>
              <h3>ffmpeg log</h3>
              <pre className={styles.responseBody}>{ffmpegTool.log || 'Log output appears after the API archives or exposes it.'}</pre>
            </div>
          </div>
        </div>
      </section>

      {API_CATEGORY_DEFINITIONS.map((category) => (
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
                <article key={test.id} id={test.id} className={styles.testCard}>
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
                          placeholder={'{\n  "key": "value"\n}'}
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
                        placeholder={'{\n  "Authorization": "Bearer ..."\n}'}
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
                      Reset to defaults
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
