// Raises a window event after every successful change to local data, so sync
// (push soon after) and rewards (check for new points) can react to it.

export const DATA_CHANGED = 'fingent-data-changed';

type WatchedFetch = typeof window.fetch & { __fingentWatch?: boolean };

/** Wraps whatever fetch is current; the phone API replaces fetch at unlock, so this runs after it. */
export function watchChanges() {
  const current = window.fetch as WatchedFetch;
  if (current.__fingentWatch) return;
  const watched = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const response = await current(input, init);
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url, window.location.origin);
    const method = (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase();
    if (method !== 'GET' && response.ok && url.origin === window.location.origin && url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/system/')) {
      window.dispatchEvent(new CustomEvent(DATA_CHANGED, { detail: { path: url.pathname } }));
    }
    return response;
  }) as WatchedFetch;
  watched.__fingentWatch = true;
  window.fetch = watched;
}
