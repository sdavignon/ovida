const DEFAULT_RUN_ID = 'demo';

type RunIdParam = string | string[] | null | undefined;

export function resolveRunId(value: RunIdParam): string {
  if (Array.isArray(value)) {
    return value[0] ?? DEFAULT_RUN_ID;
  }
  return value?.trim() ? value : DEFAULT_RUN_ID;
}

export { DEFAULT_RUN_ID };
