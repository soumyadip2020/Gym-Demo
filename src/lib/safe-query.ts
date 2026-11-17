import type { QueryClient } from "@tanstack/react-query";

/**
 * Wraps a `useServerFn` call used inside TanStack Query (`useQuery` / `prefetchQuery`).
 *
 * In `@tanstack/react-start`, `useServerFn` catches `redirect(...)` responses,
 * calls `router.navigate(...)`, and resolves to `undefined`.
 * TanStack Query v5 forbids returning `undefined` from a `queryFn`.
 * Converting `undefined` to `null` (and clearing stale `["me"]` cache) prevents
 * "Query data cannot be undefined" crashes and redirect bounce loops.
 */
export function safeMemberQuery<T>(
  fn: () => Promise<T>,
  qc?: QueryClient,
): () => Promise<T | null> {
  return async () => {
    const res = await fn();
    if (res === undefined) {
      qc?.setQueryData(["me"], { user: null });
      return null;
    }
    return res;
  };
}
