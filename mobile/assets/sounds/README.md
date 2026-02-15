# Ambient Sound Assets

This directory should contain the following audio files for the Focus page ambient sound feature:

## Required Files

| Filename | Description | Duration | Format |
|----------|-------------|----------|--------|
| `soft-rain.mp3` | Gentle rain sounds | 60-90 sec | MP3, loopable |
| `forest.mp3` | Forest ambiance with birds | 60-90 sec | MP3, loopable |
| `ocean-waves.mp3` | Calm ocean waves | 60-90 sec | MP3, loopable |
| `white-noise.mp3` | White noise | 60-90 sec | MP3, loopable |

## Requirements

- Files must be designed for seamless looping (no clicks or pops at loop points)
- Maximum 40% perceived volume (the app will play at 40% of system volume)
- Royalty-free or properly licensed for commercial use
- Optimized file size (aim for under 2MB each)

## Integration

Once files are added, update `src/hooks/useAmbientSound.ts` to reference the actual require statements:

```typescript
const SOUND_FILES: Record<string, any> = {
  'soft-rain': require('../../assets/sounds/soft-rain.mp3'),
  'forest': require('../../assets/sounds/forest.mp3'),
  'ocean-waves': require('../../assets/sounds/ocean-waves.mp3'),
  'white-noise': require('../../assets/sounds/white-noise.mp3'),
};
```
