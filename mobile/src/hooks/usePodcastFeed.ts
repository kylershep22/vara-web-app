/**
 * usePodcastFeed
 * Fetches and caches The Resilient Brain podcast RSS feed from Captivate.
 * Episodes auto-update when new ones are published.
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

export function usePodcastFeed(): {
  show: PodcastShow | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeed = async (skipCache = false) => {
    if (!skipCache) {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            setShow(parsed.data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Cache miss
      }
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

      setShow(showData);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return { show, loading, error, refresh: () => fetchFeed(true) };
}
