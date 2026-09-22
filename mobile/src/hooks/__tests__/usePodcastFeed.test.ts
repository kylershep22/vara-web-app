/**
 * usePodcastFeed — the cache fallback (LEARN-REHOUSE).
 *
 * WHAT THESE PIN, AND WHY IT IS NOT A FRESHNESS NICETY. Before the fix, a cache
 * older than the one-hour TTL was read, found stale, and DISCARDED: the code
 * fell through to the network and, on failure, left `show` at null. A device
 * holding every episode rendered identically to a device holding none, because
 * both end at `show === null` and nothing downstream can tell them apart.
 *
 * The rule now: THE TTL GOVERNS REFRESH ELIGIBILITY, NOT DISPLAY ELIGIBILITY.
 *
 * Each test below fails against the pre-fix hook, which is the only reason they
 * are worth having.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor } from '@testing-library/react-native';

import { usePodcastFeed, PodcastShow } from '../usePodcastFeed';

// The mock is reached through this handle rather than by importing the module.
// `react-native-rss-parser` ships no types, so importing it here would add a
// second TS7016 to the baseline for a reference this file does not need. The
// `mock` prefix is what lets jest's hoisted factory close over it.
//
// THE FACTORY MUST CALL `mockParse` LAZILY, NOT HAND IT OVER. `jest.mock` is
// hoisted above this declaration AND above the ES imports, so the factory runs
// while `mockParse` is still uninitialised: returning `{ parse: mockParse }`
// exports `undefined`, `rssParser.parse(xml)` throws a TypeError inside the
// hook's try block, and every test silently takes the cache-fallback path.
// THAT IS NOT A LOUD FAILURE - the tests that expect the fallback still pass,
// for entirely the wrong reason. Wrapping the call defers the lookup to
// call time, by which point the binding is real.
const mockParse = jest.fn();
jest.mock('react-native-rss-parser', () => ({
  parse: (...args: unknown[]) => mockParse(...args),
}));

const CACHE_KEY = '@vara_podcast_feed';
const HOUR = 60 * 60 * 1000;

const cachedShow: PodcastShow = {
  title: 'The Resilient Brain',
  description: 'cached',
  imageUrl: '',
  episodes: [
    {
      id: 'cached-1',
      title: 'A cached episode',
      description: '',
      descriptionHtml: '',
      audioUrl: 'https://example.test/cached.mp3',
      duration: '20 min',
      durationSeconds: 1200,
      publishedAt: '2026-08-01T00:00:00.000Z',
      episodeNumber: 1,
      imageUrl: '',
    },
  ],
};

/** A parsed feed the hook will accept as live data. */
const liveFeed = {
  title: 'The Resilient Brain',
  description: 'live',
  image: { url: '' },
  items: [
    {
      id: 'live-1',
      title: 'A live episode',
      description: 'desc',
      enclosures: [{ url: 'https://example.test/live.mp3' }],
      itunes: { duration: '00:22:00', episode: '2' },
      published: '2026-09-15T00:00:00.000Z',
    },
  ],
};

async function seedCache(ageMs: number, data: unknown = cachedShow) {
  await AsyncStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data, timestamp: Date.now() - ageMs })
  );
}

const readCache = async () => {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  return raw ? JSON.parse(raw) : null;
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  global.fetch = jest.fn();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  (console.error as jest.Mock).mockRestore?.();
});

describe('usePodcastFeed — a stale cache is SERVED, not discarded', () => {
  it('serves a two-hour-old cache when the network fails', async () => {
    await seedCache(2 * HOUR);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePodcastFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    // THE ASSERTION THE OLD HOOK FAILS: it left this null.
    expect(result.current.show?.episodes).toHaveLength(1);
    expect(result.current.show?.episodes[0].title).toBe('A cached episode');
    expect(result.current.fromCache).toBe(true);
    // The error is still reported, so the surface can say the refresh failed.
    expect(result.current.error).toBeTruthy();
  });

  it('serves a cache far beyond the TTL — age is not a display test', async () => {
    await seedCache(30 * 24 * HOUR); // thirty days
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePodcastFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.show?.episodes[0].title).toBe('A cached episode');
    expect(result.current.fromCache).toBe(true);
  });

  it('serves a fresh cache WITHOUT going to the network at all', async () => {
    await seedCache(10 * 60 * 1000); // ten minutes
    (global.fetch as jest.Mock).mockRejectedValue(new Error('should not be called'));

    const { result } = renderHook(() => usePodcastFeed());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.fromCache).toBe(true);
    expect(result.current.error).toBeNull();
  });
});

describe('usePodcastFeed — a failed refresh does not overwrite good cache', () => {
  it('leaves the cached payload untouched when the fetch throws', async () => {
    await seedCache(2 * HOUR);
    const before = await readCache();
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(await readCache()).toEqual(before);
  });

  it('treats a 200 that parses to zero episodes as a feed failure, not an empty show', async () => {
    await seedCache(2 * HOUR);
    const before = await readCache();
    (global.fetch as jest.Mock).mockResolvedValue({ text: async () => '<rss/>' });
    mockParse.mockResolvedValue({ title: 'The Resilient Brain', items: [], image: {} });

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // The cache survives the empty response...
    expect(await readCache()).toEqual(before);
    // ...and is what the user sees, rather than "this show has no episodes".
    expect(result.current.show?.episodes[0].title).toBe('A cached episode');
    expect(result.current.fromCache).toBe(true);
    expect(result.current.error).toBeTruthy();
  });

  it('reports an error rather than an empty show when there is no cache either', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ text: async () => '<rss/>' });
    mockParse.mockResolvedValue({ title: 'The Resilient Brain', items: [], image: {} });

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.show).toBeNull();
    expect(result.current.error).toBeTruthy();
    // Nothing empty was written for a later session to serve as "the cache".
    expect(await readCache()).toBeNull();
  });
});

describe('usePodcastFeed — a successful refresh DOES replace the cache', () => {
  it('writes the live feed over a stale cache and reports it as live', async () => {
    await seedCache(2 * HOUR);
    (global.fetch as jest.Mock).mockResolvedValue({ text: async () => '<rss/>' });
    mockParse.mockResolvedValue(liveFeed);

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.show?.episodes[0].title).toBe('A live episode');
    expect(result.current.fromCache).toBe(false);
    expect(result.current.error).toBeNull();

    const after = await readCache();
    expect(after.data.episodes[0].title).toBe('A live episode');
  });
});

describe('usePodcastFeed — refresh() bypasses the TTL', () => {
  it('goes to the network even when the cache is fresh', async () => {
    await seedCache(10 * 60 * 1000); // fresh: the mount will NOT fetch
    (global.fetch as jest.Mock).mockResolvedValue({ text: async () => '<rss/>' });
    mockParse.mockResolvedValue(liveFeed);

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(global.fetch).not.toHaveBeenCalled();

    await result.current.refresh();

    // THE POINT: a within-TTL cache does not short-circuit a manual retry.
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.show?.episodes[0].title).toBe('A live episode'));
    expect(result.current.fromCache).toBe(false);
  });

  it('still falls back to the cache when the manual refetch fails', async () => {
    await seedCache(10 * 60 * 1000);
    (global.fetch as jest.Mock).mockResolvedValue({ text: async () => '<rss/>' });
    mockParse.mockResolvedValue(liveFeed);

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    (global.fetch as jest.Mock).mockRejectedValue(new Error('still down'));
    await result.current.refresh();

    // "Try again" must never be able to blank the screen it was meant to repair.
    await waitFor(() => expect(result.current.error).toBeTruthy());
    expect(result.current.show?.episodes).toHaveLength(1);
    expect(result.current.fromCache).toBe(true);
  });
});

describe('usePodcastFeed — an unusable cache is treated as absent', () => {
  it('ignores a cached payload holding zero episodes', async () => {
    await seedCache(2 * HOUR, { ...cachedShow, episodes: [] });
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // An empty cache is not content to fall back on; this is state 2 or 4, and
    // the surface must not claim to be "showing episodes saved earlier".
    expect(result.current.show).toBeNull();
    expect(result.current.fromCache).toBe(false);
  });

  it('ignores an unparseable cache', async () => {
    await AsyncStorage.setItem(CACHE_KEY, 'not json');
    (global.fetch as jest.Mock).mockRejectedValue(new Error('offline'));

    const { result } = renderHook(() => usePodcastFeed());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.show).toBeNull();
    expect(result.current.fromCache).toBe(false);
  });
});
