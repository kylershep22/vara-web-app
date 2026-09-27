/**
 * usePodcastFeed
 * Fetches and caches The Resilient Brain podcast RSS feed from Captivate.
 * Episodes auto-update when new ones are published.
 *
 * THE TTL GOVERNS REFRESH ELIGIBILITY, NOT WHETHER CACHED EPISODES MAY BE
 * SHOWN. That distinction is the whole of the LEARN-REHOUSE cache fix and it
 * was a real shipped defect, not a nicety.
 *
 * Before the fix, a cache older than `CACHE_TTL_MS` was read, found stale, and
 * then DISCARDED - the code fell through to the network and, if that failed,
 * left `show` at null. So a device with every episode saved locally rendered
 * exactly like a device with nothing saved, because both arrive at `show ===
 * null` and nothing downstream can tell them apart. The empty state that was
 * about to ship on the Learn tab would have told that user "there aren't any
 * episodes saved here yet" while the episodes sat in AsyncStorage.
 *
 * Now: the TTL still decides whether we bother hitting the network, and that is
 * all it decides. Usable cached episodes are preserved and served whenever the
 * refresh cannot complete - offline, feed down, or a response that parses to
 * nothing. `fromCache` tells the caller which it is looking at so the surface
 * can say so out loud rather than silently presenting stale content as live.
 *
 * AND AN UNSUCCESSFUL OR INVALID RESPONSE NEVER OVERWRITES GOOD CACHE. The
 * write is in the success path only, and "success" now requires at least one
 * episode: a 200 that parses to zero episodes is a feed problem, not an empty
 * show, and treating it as data would erase the user's copy on the way past.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as rssParser from 'react-native-rss-parser';

const FEED_URL = 'https://feeds.captivate.fm/the-resilient-brain/';
const CACHE_KEY = '@vara_podcast_feed';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  descriptionHtml: string;
  audioUrl: string;
  duration: string;
  durationSeconds: number;
  publishedAt: string;
  episodeNumber: number | null;
  imageUrl: string;
}

export interface PodcastShow {
  title: string;
  description: string;
  imageUrl: string;
  episodes: PodcastEpisode[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatDuration(durationStr: string): string {
  const seconds = parseDuration(durationStr);
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

interface CachedFeed {
  data: PodcastShow;
  timestamp: number;
}

/**
 * The cached payload, but only when it is actually USABLE.
 *
 * "Usable" is deliberately stricter than "present": it must parse, carry a
 * numeric timestamp, and hold at least one episode. A payload that fails any of
 * those is treated as absent rather than served, because the whole point of the
 * fallback is to show the user something real. Age is NOT part of the test -
 * that is the caller's business, and conflating the two is the defect this
 * function exists to keep fixed.
 */
async function readUsableCache(): Promise<CachedFeed | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.timestamp !== 'number') return null;

    const data = parsed.data as PodcastShow | undefined;
    if (!data || !Array.isArray(data.episodes) || data.episodes.length === 0) {
      return null;
    }

    return { data, timestamp: parsed.timestamp };
  } catch {
    // Unreadable or unparseable cache is the same as no cache.
    return null;
  }
}

export function usePodcastFeed(): {
  show: PodcastShow | null;
  loading: boolean;
  error: Error | null;
  /** True when `show` came from the cache rather than from this session's fetch. */
  fromCache: boolean;
  refresh: () => Promise<void>;
} {
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const fetchFeed = async (skipCache = false) => {
    // READ ALWAYS, INCLUDING ON A MANUAL REFRESH. The cache is no longer only a
    // fast path - it is the fallback for every way the network can fail, and a
    // refresh is one of those ways. Reading it only under `!skipCache` is what
    // left "Try again" able to blank the screen it was meant to repair.
    const cached = await readUsableCache();

    // THE ONLY THING THE TTL DECIDES: whether to go to the network at all.
    if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setShow(cached.data);
      setFromCache(true);
      setError(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(FEED_URL);
      const xml = await response.text();
      const feed = await rssParser.parse(xml);

      const episodes: PodcastEpisode[] = feed.items.map((item: any) => {
        const enclosure = item.enclosures?.[0];
        const itunesDuration = item.itunes?.duration || '';
        const episodeNum = item.itunes?.episode ? parseInt(item.itunes.episode, 10) : null;
        const rawDescription = item.content || item.description || '';

        return {
          id: item.id || item.links?.[0]?.url || item.title,
          title: (item.title || '').replace(/^\d+\.\s*/, ''),
          description: stripHtml(rawDescription),
          descriptionHtml: rawDescription,
          audioUrl: enclosure?.url || '',
          duration: formatDuration(itunesDuration),
          durationSeconds: parseDuration(itunesDuration),
          publishedAt: item.published || '',
          episodeNumber: episodeNum,
          imageUrl: item.itunes?.image || feed.image?.url || '',
        };
      }).filter((ep: PodcastEpisode) => ep.audioUrl);

      const showData: PodcastShow = {
        title: feed.title || 'The Resilient Brain',
        description: stripHtml(feed.description || ''),
        imageUrl: feed.image?.url || feed.itunes?.image || '',
        episodes,
      };

      // A 200 THAT PARSES TO NOTHING IS A FEED PROBLEM, NOT AN EMPTY SHOW.
      // Writing it would erase a good cache on the way past, and rendering it
      // would tell the user the show has no episodes. Fall back instead, and
      // surface it as an error so the caller can offer a retry.
      if (episodes.length === 0) {
        if (cached) {
          setShow(cached.data);
          setFromCache(true);
        }
        setError(new Error('Podcast feed returned no episodes'));
        return;
      }

      setShow(showData);
      setFromCache(false);
      setError(null);

      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: showData,
          timestamp: Date.now(),
        }));
      } catch {
        // Non-critical
      }
    } catch (err) {
      console.error('Error fetching podcast feed:', err);
      setError(err as Error);

      // PRESERVE AND DISPLAY, REGARDLESS OF AGE. The refresh failing is not a
      // reason to take away episodes the device already has.
      if (cached) {
        setShow(cached.data);
        setFromCache(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return { show, loading, error, fromCache, refresh: () => fetchFeed(true) };
}
