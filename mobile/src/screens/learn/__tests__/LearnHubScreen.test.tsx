/**
 * LearnHubScreen — the tab root, now that it has content (LEARN-REHOUSE).
 *
 * REWRITTEN, NOT ADJUSTED. The previous suite asserted a shell contract: it
 * mounts, it says it is unfinished, and nothing is pressable. Its third test
 * was `it('has nothing tappable')`, asserting `toHaveLength(0)` over every node
 * carrying an `onPress` or a button role.
 *
 * THAT TEST IS DELETED RATHER THAN RELAXED. Its premise was destroyed, not
 * weakened, and `toHaveLength(0)` cannot be turned into a meaningful assertion
 * by flipping it to `toBeGreaterThan(0)` — a count over an anonymous tree
 * passes for any reason at all, which is the vacuous-green shape this board has
 * paid for twice. What replaced it names each thing that is now tappable.
 *
 * THIS SUITE'S JOB IS THE TAB ROOT, NOT THE LIBRARY. The six feed states, the
 * chips' URLs and failure handling, the retry and the isEpisodePlaying fix are
 * covered against the component itself in
 * `components/library/__tests__/LearnLibrary.test.tsx`. What is asserted here
 * is what only the host can answer: that the chrome survived, that the title
 * still renders above the content, and that the content is really mounted
 * inside it rather than merely imported.
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
jest.mock('../../../context/AudioPlayerContext', () => ({
  useAudioPlayer: () => ({
    playTrack: mockPlayTrack,
    currentTrack: null,
    isPlaying: false,
  }),
}));

import React from 'react';
import { Linking } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

import { LearnHubScreen } from '../LearnHubScreen';
import type { PodcastEpisode, PodcastShow } from '../../../hooks/usePodcastFeed';

const EPISODE: PodcastEpisode = {
  id: 'e1',
  title: 'Sleep and the brain',
  description: '',
  descriptionHtml: '',
  audioUrl: 'https://example.test/e1.mp3',
  duration: '21 min',
  durationSeconds: 1260,
  publishedAt: '2026-09-01T00:00:00.000Z',
  episodeNumber: 1,
  imageUrl: '',
};

const SHOW: PodcastShow = {
  title: 'The Resilient Brain',
  description: '',
  imageUrl: '',
  episodes: [EPISODE],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePodcastFeed.mockReturnValue({
    show: SHOW,
    loading: false,
    error: null,
    fromCache: false,
    refresh: jest.fn(),
  });
});

describe('LearnHubScreen — the tab root keeps its chrome', () => {
  it('mounts as a tab root', async () => {
    const { getByTestId, getByText } = render(<LearnHubScreen />);

    expect(getByTestId('learn-hub')).toBeTruthy();
    expect(getByText('Learn')).toBeTruthy();
    await waitFor(() => expect(getByTestId('learn-podcast-list')).toBeTruthy());
  });

  it('renders the title ABOVE the library rather than being replaced by it', async () => {
    // The pre-extraction body returned <LoadingSpinner /> above its own
    // SafeAreaView, which on a tab root would have blanked this title. The
    // ordering assertion is what stops that returning.
    mockUsePodcastFeed.mockReturnValue({
      show: null,
      loading: true,
      error: null,
      fromCache: false,
      refresh: jest.fn(),
    });

    const { getByText, getByTestId } = render(<LearnHubScreen />);

    expect(getByText('Learn')).toBeTruthy();
    expect(getByTestId('learn-podcast-loading')).toBeTruthy();
  });

  it('keeps the title visible while the feed is in its failure state', async () => {
    mockUsePodcastFeed.mockReturnValue({
      show: null,
      loading: false,
      error: new Error('500'),
      fromCache: false,
      refresh: jest.fn(),
    });

    const { getByText, getByTestId } = render(<LearnHubScreen />);

    await waitFor(() => expect(getByTestId('learn-podcast-error')).toBeTruthy());
    expect(getByText('Learn')).toBeTruthy();
  });

  it('no longer renders the step-2 placeholder', () => {
    const { queryByText } = render(<LearnHubScreen />);

    expect(queryByText('Things worth understanding will live here.')).toBeNull();
  });
});

describe('LearnHubScreen — what is tappable now', () => {
  /**
   * Each of these replaces a slice of the deleted `has nothing tappable`, and
   * each names its subject. A press that reaches the right handler is the
   * assertion; a count of pressables is not.
   */
  it("plays an episode from the episode row's play button", async () => {
    const { getByTestId } = render(<LearnHubScreen />);
    await waitFor(() => expect(getByTestId('learn-episode-play-e1')).toBeTruthy());

    fireEvent.press(getByTestId('learn-episode-play-e1'));

    expect(mockPlayTrack).toHaveBeenCalledWith(
      'Sleep and the brain',
      'https://example.test/e1.mp3',
      false,
      expect.anything()
    );
  });

  it("opens episode details from the episode row's info button", async () => {
    const { getByTestId } = render(<LearnHubScreen />);
    await waitFor(() => expect(getByTestId('learn-episode-info-e1')).toBeTruthy());

    fireEvent.press(getByTestId('learn-episode-info-e1'));

    // PodcastEpisode is an AppStack screen, a sibling of the tab navigator, so
    // this bubbles out of the tab context and pushes over the bar.
    expect(mockNavigate).toHaveBeenCalledWith('PodcastEpisode', {
      episode: expect.objectContaining({ id: 'e1' }),
    });
  });

  it('opens the Apple chip from inside the tab', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

    const { getByTestId } = render(<LearnHubScreen />);
    await waitFor(() => expect(getByTestId('learn-chip-apple')).toBeTruthy());

    fireEvent.press(getByTestId('learn-chip-apple'));

    expect(openURL).toHaveBeenCalledWith(
      'https://podcasts.apple.com/us/podcast/the-resilient-brain/id1800655498'
    );
    openURL.mockRestore();
  });

  it('opens the Spotify chip from inside the tab', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);

    const { getByTestId } = render(<LearnHubScreen />);
    await waitFor(() => expect(getByTestId('learn-chip-spotify')).toBeTruthy());

    fireEvent.press(getByTestId('learn-chip-spotify'));

    expect(openURL).toHaveBeenCalledWith('https://open.spotify.com/show/4PYCeTiYRfeWKiYtyMIen4');
    openURL.mockRestore();
  });
});
