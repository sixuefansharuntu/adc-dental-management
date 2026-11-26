// Forward cancellation using the older AbortController API supported by mobile WebViews.
export function requestAbort(timeoutMs: number, upstream?: AbortSignal) {
  const controller = new AbortController();
  const abort = () => controller.abort(upstream?.reason);
  if (upstream?.aborted) abort();
  else upstream?.addEventListener('abort', abort, { once: true });

  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer);
      upstream?.removeEventListener('abort', abort);
    },
  };
}
