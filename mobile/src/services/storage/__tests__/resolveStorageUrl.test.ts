// Mocks must be declared before importing the module under test.

jest.mock('../../../config/firebase', () => ({
  storage: { __mock: 'storage' },
}));

const mockGetDownloadURL = jest.fn();
const mockRef = jest.fn((_storage: unknown, path: string) => ({
  fullPath: path,
}));

jest.mock('firebase/storage', () => ({
  ref: (storage: unknown, path: string) => mockRef(storage, path),
  getDownloadURL: (storageRef: unknown) => mockGetDownloadURL(storageRef),
}));

import {
  resolveStorageUrl,
  _clearStorageUrlCacheForTesting,
  _getStorageUrlCacheSizeForTesting,
} from '../resolveStorageUrl';

describe('resolveStorageUrl', () => {
  beforeEach(() => {
    _clearStorageUrlCacheForTesting();
    mockGetDownloadURL.mockReset();
    mockRef.mockClear();
  });

  it('resolves a download URL for the exact path given, with no prefix added', async () => {
    mockGetDownloadURL.mockResolvedValueOnce('https://example/clip.mp4');

    const url = await resolveStorageUrl('focus-video/video-player-test-1.mp4');

    expect(mockRef).toHaveBeenCalledWith(
      { __mock: 'storage' },
      'focus-video/video-player-test-1.mp4'
    );
    expect(url).toBe('https://example/clip.mp4');
  });

  it('caches per path — a repeat call does not re-resolve', async () => {
    mockGetDownloadURL.mockResolvedValueOnce('https://example/clip.mp4');

    await resolveStorageUrl('focus-video/a.mp4');
    await resolveStorageUrl('focus-video/a.mp4');

    expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
    expect(_getStorageUrlCacheSizeForTesting()).toBe(1);
  });

  it('caches distinct paths independently', async () => {
    mockGetDownloadURL
      .mockResolvedValueOnce('https://example/a')
      .mockResolvedValueOnce('https://example/b');

    await resolveStorageUrl('focus-video/a.mp4');
    await resolveStorageUrl('protocolAudio/nsdr/b.mp3');
    await resolveStorageUrl('focus-video/a.mp4');

    expect(mockGetDownloadURL).toHaveBeenCalledTimes(2);
    expect(_getStorageUrlCacheSizeForTesting()).toBe(2);
  });

  it('throws the caller-supplied user-facing message on failure', async () => {
    mockGetDownloadURL.mockRejectedValueOnce(new Error('storage/object-not-found'));

    await expect(
      resolveStorageUrl('focus-video/missing.mp4', "Couldn't load this video.")
    ).rejects.toThrow("Couldn't load this video.");
  });

  it('does not cache a failed resolution', async () => {
    mockGetDownloadURL.mockRejectedValueOnce(new Error('network'));
    await expect(resolveStorageUrl('focus-video/a.mp4', 'nope')).rejects.toThrow();

    expect(_getStorageUrlCacheSizeForTesting()).toBe(0);

    mockGetDownloadURL.mockResolvedValueOnce('https://example/a');
    await expect(resolveStorageUrl('focus-video/a.mp4', 'nope')).resolves.toBe(
      'https://example/a'
    );
  });
});
