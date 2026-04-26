// Mocks must be declared before importing the module under test.

// Replace the resolved storage instance with a truthy stub so the loader
// passes its null-check. The actual storage value isn't used — every
// Storage SDK call goes through the firebase/storage mock below.
jest.mock('../../../config/firebase', () => ({
  storage: { __mock: 'storage' },
}));

const mockGetDownloadURL = jest.fn();
const mockRef = jest.fn(
  (_storage: unknown, path: string) => ({ fullPath: path })
);

jest.mock('firebase/storage', () => ({
  ref: (storage: unknown, path: string) => mockRef(storage, path),
  getDownloadURL: (storageRef: unknown) => mockGetDownloadURL(storageRef),
}));

const mockSoundCreate = jest.fn();
const mockSoundUnload = jest.fn();

jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(async (...args: unknown[]) => {
        await mockSoundCreate(...args);
        return {
          sound: {
            unloadAsync: mockSoundUnload,
          },
        };
      }),
    },
  },
}));

import {
  _clearProtocolAudioCacheForTesting,
  _getProtocolAudioCacheSizeForTesting,
  loadProtocolAudio,
  prefetchProtocolAudio,
} from '../protocolAudioLoader';

describe('protocolAudioLoader', () => {
  beforeEach(() => {
    _clearProtocolAudioCacheForTesting();
    mockGetDownloadURL.mockReset();
    mockRef.mockClear();
    mockSoundCreate.mockReset();
    mockSoundUnload.mockReset();
  });

  describe('loadProtocolAudio', () => {
    it('resolves a Storage URL and returns a Sound on first call', async () => {
      mockGetDownloadURL.mockResolvedValueOnce(
        'https://firebasestorage.example/nsdr-10.mp3?token=abc'
      );

      const sound = await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');

      expect(mockRef).toHaveBeenCalledWith(
        { __mock: 'storage' },
        'protocolAudio/nsdr/nsdr_10min_v1.mp3'
      );
      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
      expect(sound).toBeDefined();
    });

    it('caches the resolved URL — second call does not re-resolve', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example/url');

      await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');
      await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');

      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
      expect(_getProtocolAudioCacheSizeForTesting()).toBe(1);
    });

    it('caches per audioPath — different paths each resolve once', async () => {
      mockGetDownloadURL
        .mockResolvedValueOnce('https://example/10')
        .mockResolvedValueOnce('https://example/20');

      await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');
      await loadProtocolAudio('nsdr/nsdr_20min_v1.mp3');
      await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');
      await loadProtocolAudio('nsdr/nsdr_20min_v1.mp3');

      expect(mockGetDownloadURL).toHaveBeenCalledTimes(2);
      expect(_getProtocolAudioCacheSizeForTesting()).toBe(2);
    });

    it('throws a user-friendly error when URL resolution fails', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(
        new Error('storage/object-not-found')
      );

      await expect(
        loadProtocolAudio('nsdr/missing.mp3')
      ).rejects.toThrow(/check your connection/i);
    });

    it('throws a user-friendly error when Sound creation fails', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example/url');
      mockSoundCreate.mockRejectedValueOnce(
        new Error('codec not supported')
      );

      await expect(
        loadProtocolAudio('nsdr/nsdr_10min_v1.mp3')
      ).rejects.toThrow(/check your connection/i);
    });
  });

  describe('prefetchProtocolAudio', () => {
    it('resolves URL and warms the cache', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example/url');

      await prefetchProtocolAudio('nsdr/nsdr_10min_v1.mp3');

      expect(_getProtocolAudioCacheSizeForTesting()).toBe(1);
    });

    it('subsequent loadProtocolAudio reuses the prefetched URL', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example/url');

      await prefetchProtocolAudio('nsdr/nsdr_10min_v1.mp3');
      await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');

      expect(mockGetDownloadURL).toHaveBeenCalledTimes(1);
    });

    it('unloads the warming Sound after creation', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example/url');

      await prefetchProtocolAudio('nsdr/nsdr_10min_v1.mp3');

      expect(mockSoundUnload).toHaveBeenCalledTimes(1);
    });

    it('does not throw on URL resolution failure (non-fatal)', async () => {
      mockGetDownloadURL.mockRejectedValueOnce(new Error('network error'));

      await expect(
        prefetchProtocolAudio('nsdr/nsdr_10min_v1.mp3')
      ).resolves.toBeUndefined();
    });

    it('does not throw on Sound creation failure (non-fatal)', async () => {
      mockGetDownloadURL.mockResolvedValueOnce('https://example/url');
      mockSoundCreate.mockRejectedValueOnce(new Error('decode failed'));

      await expect(
        prefetchProtocolAudio('nsdr/nsdr_10min_v1.mp3')
      ).resolves.toBeUndefined();
    });
  });

  describe('storage path construction', () => {
    it('always prefixes with protocolAudio/', async () => {
      mockGetDownloadURL.mockResolvedValue('https://example/url');

      await loadProtocolAudio('nsdr/nsdr_10min_v1.mp3');

      expect(mockRef).toHaveBeenCalledWith(
        { __mock: 'storage' },
        'protocolAudio/nsdr/nsdr_10min_v1.mp3'
      );
    });
  });
});
