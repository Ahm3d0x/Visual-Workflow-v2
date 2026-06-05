const RELOAD_WINDOW_MS = 5 * 60 * 1000;

export function isChunkLoadError(reason: unknown): boolean {
  if (!reason) {
    return false;
  }

  const error = reason instanceof Error ? reason : undefined;
  const name = error?.name ?? "";
  const message = error?.message ?? String(reason);

  return (
    name === "ChunkLoadError" ||
    /ChunkLoadError/i.test(message) ||
    /Failed to load chunk/i.test(message) ||
    /Loading chunk \S+ failed/i.test(message)
  );
}

export function recoverFromChunkLoadError(reason: unknown): boolean {
  if (!isChunkLoadError(reason) || typeof window === "undefined") {
    return false;
  }

  const key = `skima:chunk-reload:${window.location.pathname}`;
  const lastReloadAt = Number(window.sessionStorage.getItem(key) ?? 0);

  if (Date.now() - lastReloadAt < RELOAD_WINDOW_MS) {
    return false;
  }

  window.sessionStorage.setItem(key, String(Date.now()));
  window.location.reload();
  return true;
}
