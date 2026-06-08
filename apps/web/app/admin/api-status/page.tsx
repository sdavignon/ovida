'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthGuard } from '@/components/auth-guard';
import {
  API_CATEGORY_DEFINITIONS,
  type ApiCategory,
  type ApiProbeMethod,
  type ApiTestDefinition,
} from '@/lib/api-endpoints';
import { apiOrigin } from '@/lib/config';
import styles from './page.module.css';

type EndpointState = 'idle' | 'checking' | 'online' | 'degraded' | 'offline';

type EndpointStatus = {
  state: EndpointState;
  statusCode?: number;
  durationMs?: number;
  message?: string;
  checkedAt?: number;
};

const defaultExternalOrigin =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_EXTERNAL_API_ORIGIN
    ? process.env.NEXT_PUBLIC_EXTERNAL_API_ORIGIN
    : apiOrigin;

const pathWithSlash = (path: string) => (path.startsWith('/') ? path : `/${path}`);

const probeMethodFor = (test: ApiTestDefinition): ApiProbeMethod =>
  test.probeMethod ?? (test.method === 'GET' ? 'GET' : 'OPTIONS');

export default function ApiStatusPage() {
  const [origins, setOrigins] = useState<Record<ApiCategory, string>>({
    internal: apiOrigin,
    external: defaultExternalOrigin,
  });
  const [statuses, setStatuses] = useState<Record<string, EndpointStatus>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);

  const endpoints = useMemo(() => API_CATEGORY_DEFINITIONS, []);

  const updateStatus = useCallback((testId: string, update: Partial<EndpointStatus>) => {
    setStatuses((prev) => {
      const current = prev[testId] ?? { state: 'idle' as EndpointState };
      return {
        ...prev,
        [testId]: {
          ...current,
          ...update,
        },
      };
    });
  }, []);

  const resolveOrigin = useCallback(
    (category: ApiCategory) => {
      const fallback = category === 'external' ? defaultExternalOrigin : apiOrigin;
      const configured = origins[category]?.trim();
      const chosen = configured && configured.length > 0 ? configured : fallback;
      return chosen.endsWith('/') ? chosen.slice(0, -1) : chosen;
    },
    [origins],
  );

  const checkEndpoint = useCallback(
    async (test: ApiTestDefinition) => {
      const base = resolveOrigin(test.category);
      const target = `${base}${pathWithSlash(test.path)}`;
      const method = probeMethodFor(test);

      updateStatus(test.id, {
        state: 'checking',
        statusCode: undefined,
        durationMs: undefined,
        message: undefined,
      });

      const headers = test.defaultHeaders ?? {};
      const start = performance.now();

      try {
        const response = await fetch(target, {
          method,
          headers: Object.keys(headers).length ? headers : undefined,
          cache: 'no-store',
        });
        const duration = performance.now() - start;
        const statusText = response.statusText || 'Response received';
        const bodyText = await response.text();
        const status: EndpointStatus = {
          state: response.ok ? 'online' : response.status < 500 ? 'degraded' : 'offline',
          statusCode: response.status,
          durationMs: duration,
          message: response.ok ? statusText : bodyText || statusText,
          checkedAt: Date.now(),
        };

        updateStatus(test.id, status);
      } catch (error) {
        const duration = performance.now() - start;
        updateStatus(test.id, {
          state: 'offline',
          durationMs: duration,
          message: error instanceof Error ? error.message : 'Request failed',
          checkedAt: Date.now(),
        });
      }
    },
    [resolveOrigin, updateStatus],
  );

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all(endpoints.flatMap((category) => category.tests.map((test) => checkEndpoint(test))));
    setIsRefreshing(false);
  }, [checkEndpoint, endpoints]);

  useEffect(() => {
    refreshAll();
  }, [origins, refreshAll]);

  const summary = useMemo(() => {
    const values = Object.values(statuses);
    const online = values.filter((item) => item.state === 'online').length;
    const degraded = values.filter((item) => item.state === 'degraded').length;
    const offline = values.filter((item) => item.state === 'offline').length;
    const checking = values.filter((item) => item.state === 'checking').length;
    return { online, degraded, offline, checking, total: values.length };
  }, [statuses]);

  return (
    <AuthGuard requireAdmin>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Diagnostics</p>
            <h1>API Endpoint Status</h1>
            <p className={styles.intro}>
              Review live responses for every internal and external endpoint. Probe methods use safe GET/OPTIONS
              requests and report latency, codes, and any error payloads.
            </p>
            <div className={styles.headerActions}>
              <button type="button" onClick={refreshAll} disabled={isRefreshing}>
                {isRefreshing ? 'Checking…' : 'Check all endpoints'}
              </button>
              <Link href="/admin/api-tests">Open API test tools</Link>
            </div>
            <div className={styles.summary}>
              <span data-state="online">Online: {summary.online}</span>
              <span data-state="degraded">Warnings: {summary.degraded}</span>
              <span data-state="offline">Offline: {summary.offline}</span>
              <span data-state="checking">Checking: {summary.checking}</span>
              <span>Total tracked: {summary.total}</span>
            </div>
          </div>
          <Link className={styles.backLink} href="/admin">
            ← Back to Admin
          </Link>
        </header>

        <section className={styles.originSection}>
          <h2>Origins</h2>
          <p className={styles.originCopy}>
            Set the base domains for each category. The status checks automatically re-run when you change an origin.
          </p>
          <div className={styles.originGrid}>
            {(['internal', 'external'] as ApiCategory[]).map((category) => (
              <label key={category} className={styles.originField}>
                <span>{category === 'internal' ? 'Internal API Origin' : 'External API Origin'}</span>
                <input
                  value={origins[category]}
                  onChange={(event) => setOrigins((prev) => ({ ...prev, [category]: event.target.value }))}
                  placeholder="https://api.example.com"
                />
                <small>
                  {category === 'internal'
                    ? 'Defaults to NEXT_PUBLIC_API_ORIGIN.'
                    : 'Defaults to NEXT_PUBLIC_EXTERNAL_API_ORIGIN or API origin.'}
                </small>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.statusGrid}>
          {endpoints.map((category) => (
            <article key={category.id} className={styles.categoryCard}>
              <header>
                <div>
                  <p className={styles.eyebrow}>Category</p>
                  <h2>{category.label}</h2>
                  <p className={styles.categoryCopy}>{category.description}</p>
                </div>
                <button type="button" onClick={() => category.tests.forEach((test) => checkEndpoint(test))}>
                  Re-run category
                </button>
              </header>

              <div className={styles.endpointList}>
                {category.tests.map((test) => {
                  const status = statuses[test.id] ?? { state: 'idle' };
                  const probeMethod = probeMethodFor(test);

                  return (
                    <div key={test.id} className={styles.endpointRow}>
                      <div className={styles.endpointHeader}>
                        <span className={styles.methodBadge} data-method={probeMethod}>
                          {probeMethod}
                        </span>
                        <div className={styles.endpointMeta}>
                          <p className={styles.endpointLabel}>{test.label}</p>
                          <p className={styles.endpointPath}>{pathWithSlash(test.path)}</p>
                          <p className={styles.endpointDescription}>{test.description}</p>
                        </div>
                        <div className={styles.statusPill} data-state={status.state}>
                          {status.state === 'checking'
                            ? 'Checking…'
                            : status.state === 'online'
                              ? 'Online'
                              : status.state === 'degraded'
                                ? 'Warning'
                                : status.state === 'offline'
                                  ? 'Offline'
                                  : 'Idle'}
                        </div>
                      </div>

                      <div className={styles.endpointDetails}>
                        <div className={styles.detailBlock}>
                          <span>Status code</span>
                          <strong>{status.statusCode ?? '—'}</strong>
                        </div>
                        <div className={styles.detailBlock}>
                          <span>Latency</span>
                          <strong>
                            {status.durationMs !== undefined ? `${Math.round(status.durationMs)} ms` : '—'}
                          </strong>
                        </div>
                        <div className={styles.detailBlock}>
                          <span>Last checked</span>
                          <strong>
                            {status.checkedAt
                              ? new Date(status.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </strong>
                        </div>
                        <div className={styles.detailBlock}>
                          <span>Message</span>
                          <p className={styles.message}>{status.message ?? 'Awaiting check'}</p>
                        </div>
                        <div className={styles.detailActions}>
                          <button type="button" onClick={() => checkEndpoint(test)} disabled={status.state === 'checking'}>
                            {status.state === 'checking' ? 'Checking…' : 'Refresh endpoint'}
                          </button>
                          <Link href={`/admin/api-tests#${test.id}`}>Test with defaults</Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ))}
        </section>
      </div>
    </AuthGuard>
  );
}
