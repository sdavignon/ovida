'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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

export default function ApiTestToolsPage() {
  const [origins, setOrigins] = useState<Record<ApiCategory, string>>({
    internal: apiOrigin,
    external: defaultExternalOrigin,
  });
  const [requests, setRequests] = useState<Record<string, RequestState>>(() => createInitialState());

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
