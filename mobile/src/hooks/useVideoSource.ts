// Resolves a Firebase Storage path to a streamable video URL.
//
// Thin wrapper over the shared resolveStorageUrl so video reuses the audio
// fetch-and-cache path rather than duplicating it. Content-agnostic: it takes
// whatever full storage path it is given and knows nothing about any specific
// video or folder.

import { useCallback, useEffect, useRef, useState } from 'react';

import { resolveStorageUrl } from '../services/storage/resolveStorageUrl';

const LOAD_ERROR_MESSAGE =
  "Couldn't load this video. Check your connection and try again.";

export interface VideoSourceState {
  /** Streamable download URL, or null until resolved. */
  url: string | null;
  loading: boolean;
  /** User-facing message; null when there is no error. */
  error: string | null;
  /** Re-attempt resolution after a failure. */
  retry: () => void;
}

export function useVideoSource(storagePath: string | null): VideoSourceState {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Guards against a resolution that completes after the path changed or the
  // component unmounted writing stale state.
  const activePathRef = useRef<string | null>(null);

  useEffect(() => {
    activePathRef.current = storagePath;

    if (!storagePath) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    resolveStorageUrl(storagePath, LOAD_ERROR_MESSAGE)
      .then((resolved) => {
        if (cancelled || activePathRef.current !== storagePath) return;
        setUrl(resolved);
        setLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled || activePathRef.current !== storagePath) return;
        setUrl(null);
        setError(e.message || LOAD_ERROR_MESSAGE);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [storagePath, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { url, loading, error, retry };
}
