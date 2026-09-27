/**
 * LearnLibrary — the six states, the chips, and the retry.
 *
 * THE SIX STATES ARE THE POINT OF THIS SUITE. Each one is a different answer to
 * "there are no episodes on screen, why", and getting them confused is what
 * would have shipped copy telling a user with episodes on their device that
 * they had none. State 6 in particular — connectivity UNKNOWN — exists as its
 * own case precisely so that a failed connectivity check cannot be read as
 * evidence of being offline.
 */

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const mockUsePodcastFeed = jest.fn();
jest.mock('../../../hooks/usePodcastFeed', () => ({
  usePodcastFeed: () => mockUsePodcastFeed(),
}));

jest.mock('../../../hooks', () => ({
  useMasterclasses: () => ({ masterclasses: [], loading: false }),
  useMasterclassProgress: () => ({ progress: [], loading: false }),
}));

const mockPlayTrack = jest.fn();
const mockAudio = {
  playTrack: mockPlayTrack,
  currentTrack: null as { title: string } | null,
  isPlaying: false,
};
jest.mock('../../../context/AudioPlayerContext', () => ({
  useAudioPlayer: () => mockAudio,
}));

import React from 'react';
import { Alert, Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import * as Network from 'expo-network';

import { LearnLibrary } from '../LearnLibrary';
import type { PodcastEpisode, PodcastShow } from '../../../hooks/usePodcastFeed';

const episode = (id: string, title: string): PodcastEpisode => ({
  id,
  title,
  description: '',
  descriptionHtml: '',
  audioUrl: `https://example.test/${id}.mp3`,
  duration: '21 min',
  durationSeconds: 1260,
  publishedAt: '2026-09-01T00:00:00.000Z',
  episodeNumber: 1,
  imageUrl: '',
});

const show = (episodes: PodcastEpisode[]): PodcastShow => ({
  title: 'The Resilient Brain',
  description: '',
  imageUrl: '',
  episodes,
});

const EPISODES = [episode('e1', 'Sleep and the brain'), episode('e2', 'Attention')];

/**
 * The hook's return, with the shape the component destructures.
 *
 * `show` is annotated nullable rather than inferred: half these tests pass
 * `show: null`, and an inferred `PodcastShow` makes every one of them a type
 * error that jest would never see, because Babel strips types without checking
 * them.
 */
interface Feed {
  show: PodcastShow | null;
  loading: boolean;
  error: Error | null;
  fromCache: boolean;
  refresh: jest.Mock;
}

const baseFeed = (): Feed => ({
  show: show(EPISODES),
  loading: false,
  error: null,
  fromCache: false,
  refresh: jest.fn(),
});

const feed = (over: Partial<Feed> = {}): Feed => ({ ...baseFeed(), ...over });

const asNetwork = Network.getNetworkStateAsync as jest.Mock;

/** Connectivity: resolves online, resolves offline, or rejects (=> unknown). */
const online = () => asNetwork.mockResolvedValue({ isConnected: true, isInternetReachable: true });
const offline = () => asNetwork.mockResolvedValue({ isConnected: false, isInternetReachable: false });
const unknown = () => asNetwork.mockRejectedValue(new Error('no answer'));

beforeEach(() => {
  jest.clearAllMocks();
  mockAudio.currentTrack = null;
  mockAudio.isPlaying = false;
  online();
});

describe('LearnLibrary — state 1: online, feed loads', () => {
  it('renders the episodes and no informational line', async () => {
    mockUsePodcastFeed.mockReturnValue(feed());

    const { getByTestId, queryByTestId, getByText } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-list')).toBeTruthy());
    expect(getByText('Sleep and the brain')).toBeTruthy();
    expect(queryByTestId('learn-podcast-notice')).toBeNull();
    expect(queryByTestId('learn-podcast-error')).toBeNull();
    expect(queryByTestId('learn-podcast-offline-empty')).toBeNull();
  });

  it('shows no informational line for a FRESH cache hit while online', async () => {
    // fromCache is true here and there is no error: a within-TTL cache read is
    // ordinary operation, not something to apologise for.
    mockUsePodcastFeed.mockReturnValue(feed({ fromCache: true }));

    const { getByTestId, queryByTestId } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-list')).toBeTruthy());
    expect(queryByTestId('learn-podcast-notice')).toBeNull();
  });
});

describe('LearnLibrary — state 2: offline, no usable cache', () => {
  it('renders the 14.2 empty state with no retry', async () => {
    offline();
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, error: new Error('network') }));

    const { getByTestId, getByText, queryByTestId } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-offline-empty')).toBeTruthy());
    expect(getByText("Episodes aren't available")).toBeTruthy();
    expect(getByText("You're offline, so we can't load them right now.")).toBeTruthy();
    // 14.2 empty state, not 14.4 error: no CTA, because a tap cannot fix being
    // offline.
    expect(queryByTestId('learn-podcast-retry')).toBeNull();
    expect(queryByTestId('learn-podcast-error')).toBeNull();
  });
});

describe('LearnLibrary — state 3: offline, cache available at any age', () => {
  it('renders the episodes with the offline line above them', async () => {
    offline();
    mockUsePodcastFeed.mockReturnValue(feed({ fromCache: true, error: new Error('network') }));

    const { getByTestId, getByText } = render(<LearnLibrary />);

    await waitFor(() =>
      expect(getByText("You're offline. Showing episodes saved earlier.")).toBeTruthy()
    );
    // The content is NOT replaced. That is the whole cache fix.
    expect(getByTestId('learn-podcast-list')).toBeTruthy();
    expect(getByText('Sleep and the brain')).toBeTruthy();
    expect(getByText('Attention')).toBeTruthy();
  });

  it('shows the offline line even with no error, which is a fresh cache read while offline', async () => {
    offline();
    mockUsePodcastFeed.mockReturnValue(feed({ fromCache: true, error: null }));

    const { getByText } = render(<LearnLibrary />);

    await waitFor(() =>
      expect(getByText("You're offline. Showing episodes saved earlier.")).toBeTruthy()
    );
  });
});

describe('LearnLibrary — state 4: feed failed, no cache', () => {
  it('renders the 14.4 error with a retry', async () => {
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, error: new Error('500') }));

    const { getByTestId, getByText, queryByTestId } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-error')).toBeTruthy());
    expect(getByText('Episodes didn’t load')).toBeTruthy();
    expect(getByText("We couldn't reach the feed right now.")).toBeTruthy();
    expect(getByTestId('learn-podcast-retry')).toBeTruthy();
    // Online failure must NOT borrow the offline wording.
    expect(queryByTestId('learn-podcast-offline-empty')).toBeNull();
  });
});

describe('LearnLibrary — state 5: feed failed, cache available', () => {
  it('keeps the episodes and explains the stale content without a full error state', async () => {
    mockUsePodcastFeed.mockReturnValue(feed({ fromCache: true, error: new Error('500') }));

    const { getByTestId, getByText, queryByTestId } = render(<LearnLibrary />);

    await waitFor(() =>
      expect(getByText("Showing saved episodes. We couldn't refresh the feed.")).toBeTruthy()
    );
    expect(getByTestId('learn-podcast-list')).toBeTruthy();
    expect(getByText('Sleep and the brain')).toBeTruthy();
    // Explicitly: available content is never replaced by the error surface.
    expect(queryByTestId('learn-podcast-error')).toBeNull();
  });
});

describe('LearnLibrary — state 6: connectivity unknown and the feed failed', () => {
  it('falls back to the generic failure state, never the offline copy', async () => {
    unknown();
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, error: new Error('network') }));

    const { getByTestId, queryByTestId, queryByText } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-error')).toBeTruthy());
    expect(queryByTestId('learn-podcast-offline-empty')).toBeNull();
    // The offline-specific sentence must not appear on an unproven diagnosis.
    expect(queryByText("You're offline, so we can't load them right now.")).toBeNull();
  });

  it('does not use the offline line over cached content either', async () => {
    unknown();
    mockUsePodcastFeed.mockReturnValue(feed({ fromCache: true, error: new Error('network') }));

    const { getByText, queryByText } = render(<LearnLibrary />);

    await waitFor(() =>
      expect(getByText("Showing saved episodes. We couldn't refresh the feed.")).toBeTruthy()
    );
    expect(queryByText("You're offline. Showing episodes saved earlier.")).toBeNull();
  });

  it('a network state that answers neither way is unknown, not offline', async () => {
    // Not a rejection — a resolved object with nothing decisive in it.
    asNetwork.mockResolvedValue({ isConnected: undefined, isInternetReachable: null });
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, error: new Error('network') }));

    const { getByTestId, queryByTestId } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-error')).toBeTruthy());
    expect(queryByTestId('learn-podcast-offline-empty')).toBeNull();
  });
});

describe('LearnLibrary — the retry', () => {
  it('calls the hook’s refresh, which is the TTL-bypassing refetch', async () => {
    const refresh = jest.fn();
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, error: new Error('500'), refresh }));

    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-podcast-retry')).toBeTruthy());

    fireEvent.press(getByTestId('learn-podcast-retry'));

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('re-reads connectivity as well, because that is what decides state 2 vs state 4', async () => {
    const refresh = jest.fn();
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, error: new Error('500'), refresh }));

    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(asNetwork).toHaveBeenCalledTimes(1));

    fireEvent.press(getByTestId('learn-podcast-retry'));

    await waitFor(() => expect(asNetwork).toHaveBeenCalledTimes(2));
  });
});

describe('LearnLibrary — the platform chips', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  });

  afterEach(() => {
    openURL.mockRestore();
  });

  it('opens the in-tree Apple URL', async () => {
    mockUsePodcastFeed.mockReturnValue(feed());
    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-chip-apple')).toBeTruthy());

    fireEvent.press(getByTestId('learn-chip-apple'));

    expect(openURL).toHaveBeenCalledWith(
      'https://podcasts.apple.com/us/podcast/the-resilient-brain/id1882167234'
    );
  });

  it('opens the in-tree Spotify URL', async () => {
    mockUsePodcastFeed.mockReturnValue(feed());
    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-chip-spotify')).toBeTruthy());

    fireEvent.press(getByTestId('learn-chip-spotify'));

    expect(openURL).toHaveBeenCalledWith(
      'https://open.spotify.com/show/2Q22r7SDIHkN0cvy1zmH4F'
    );
  });

  it('alerts rather than rejecting when the link cannot be opened', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    openURL.mockRejectedValue(new Error('no handler'));
    mockUsePodcastFeed.mockReturnValue(feed());

    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-chip-apple')).toBeTruthy());

    fireEvent.press(getByTestId('learn-chip-apple'));

    await waitFor(() =>
      expect(alert).toHaveBeenCalledWith(
        'Unavailable',
        'Could not open the link. Please try again later.'
      )
    );
    alert.mockRestore();
  });

  it('carries a screen-reader label naming the action and that it leaves the app', async () => {
    mockUsePodcastFeed.mockReturnValue(feed());
    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-chip-apple')).toBeTruthy());

    const apple = getByTestId('learn-chip-apple');
    const spotify = getByTestId('learn-chip-spotify');

    expect(apple.props.accessibilityRole).toBe('button');
    expect(apple.props.accessibilityLabel).toBe('Listen on Apple Podcasts. Opens outside the app.');
    expect(spotify.props.accessibilityRole).toBe('button');
    expect(spotify.props.accessibilityLabel).toBe('Listen on Spotify. Opens outside the app.');
  });
});

describe('LearnLibrary — the isEpisodePlaying fix', () => {
  /**
   * THE DEFECT THIS PINS. The comparison was `currentTrack === episode.title`,
   * an object against a string, so it was ALWAYS false. Every assertion below
   * fails against the old expression, which is the only reason they are worth
   * having: the "playing" label is the observable proof.
   */
  it('marks the playing episode when the current track title matches', async () => {
    mockAudio.currentTrack = { title: 'Sleep and the brain' };
    mockAudio.isPlaying = true;
    mockUsePodcastFeed.mockReturnValue(feed());

    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-episode-play-e1')).toBeTruthy());

    expect(getByTestId('learn-episode-play-e1').props.accessibilityLabel).toBe('Now playing');
    expect(getByTestId('learn-episode-play-e2').props.accessibilityLabel).toBe('Play episode');
  });

  it('marks nothing when audio is paused, even with a matching track', async () => {
    mockAudio.currentTrack = { title: 'Sleep and the brain' };
    mockAudio.isPlaying = false;
    mockUsePodcastFeed.mockReturnValue(feed());

    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-episode-play-e1')).toBeTruthy());

    expect(getByTestId('learn-episode-play-e1').props.accessibilityLabel).toBe('Play episode');
  });

  it('marks nothing when there is no current track', async () => {
    mockAudio.currentTrack = null;
    mockAudio.isPlaying = true;
    mockUsePodcastFeed.mockReturnValue(feed());

    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-episode-play-e1')).toBeTruthy());

    expect(getByTestId('learn-episode-play-e1').props.accessibilityLabel).toBe('Play episode');
  });
});

describe('LearnLibrary — episode actions', () => {
  it('plays an episode from its play button', async () => {
    mockUsePodcastFeed.mockReturnValue(feed());
    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-episode-play-e1')).toBeTruthy());

    fireEvent.press(getByTestId('learn-episode-play-e1'));

    expect(mockPlayTrack).toHaveBeenCalledWith(
      'Sleep and the brain',
      'https://example.test/e1.mp3',
      false,
      expect.anything()
    );
  });

  it('pushes PodcastEpisode from the info button', async () => {
    mockUsePodcastFeed.mockReturnValue(feed());
    const { getByTestId } = render(<LearnLibrary />);
    await waitFor(() => expect(getByTestId('learn-episode-info-e2')).toBeTruthy());

    fireEvent.press(getByTestId('learn-episode-info-e2'));

    expect(mockNavigate).toHaveBeenCalledWith('PodcastEpisode', {
      episode: expect.objectContaining({ id: 'e2' }),
    });
  });
});

describe('LearnLibrary — loading', () => {
  it('renders loading in place rather than replacing the surface', async () => {
    mockUsePodcastFeed.mockReturnValue(feed({ show: null, loading: true }));

    const { getByTestId, queryByTestId } = render(<LearnLibrary />);

    expect(getByTestId('learn-podcast-loading')).toBeTruthy();
    // Neither failure surface may appear while the answer is still arriving.
    expect(queryByTestId('learn-podcast-error')).toBeNull();
    expect(queryByTestId('learn-podcast-offline-empty')).toBeNull();
  });

  it('keeps existing episodes on screen while a refresh is in flight', async () => {
    mockUsePodcastFeed.mockReturnValue(feed({ loading: true, fromCache: true }));

    const { getByTestId, queryByTestId } = render(<LearnLibrary />);

    await waitFor(() => expect(getByTestId('learn-podcast-list')).toBeTruthy());
    expect(queryByTestId('learn-podcast-loading')).toBeNull();
  });
});
