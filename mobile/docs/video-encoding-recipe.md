# Video Encoding Recipe

**Status:** spec for all Focus explainer video content
**Applies to:** anything uploaded to `focus-video/` in Firebase Storage
**Last updated:** 2026-07-25

---

## The recipe

```bash
ffmpeg -i input.mp4 \
  -c:v libx264 -profile:v high -crf 23 \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  -vf scale=-2:1080 \
  output.mp4
```

**Target: 15–30 MB for a 1–2 minute clip.** If the output is materially larger,
something is wrong with the source or the settings — re-check before uploading.

### What each flag is doing

| Flag | Why |
|---|---|
| `-c:v libx264` | H.264. Hardware-decoded on every iOS and Android device the app supports. |
| `-profile:v high` | High profile — better compression at the same quality. Universally supported on modern hardware. |
| `-crf 23` | Quality-targeted encoding. Lower = better/larger; 18 is near-lossless, 28 is visibly soft. 23 is the sweet spot for talking-head explainer content. |
| `-c:a aac -b:a 128k` | AAC audio at 128 kbps. Plenty for voice; stereo music would justify 192k. |
| `-movflags +faststart` | **Mandatory.** Moves the `moov` atom to the front of the file. See below. |
| `-vf scale=-2:1080` | Scales to 1080p tall, preserving aspect ratio. `-2` keeps the width even, which H.264 requires. |

### `+faststart` is the one non-negotiable flag

An MP4 stores its index — the `moov` atom — either at the front of the file or
at the end. By default `ffmpeg` writes it at the **end**, because it doesn't
know the final size until it finishes.

A player streaming progressively cannot decode a single frame until it has read
`moov`. With `moov` at the end, the player must range-request the tail of the
file before playback can begin. That works — Firebase Storage supports range
requests, and both AVPlayer and ExoPlayer will do it — but it adds a round trip
before the first frame, and on a slow connection it is the difference between
"starts immediately" and "spins for several seconds."

`+faststart` does a second pass that relocates `moov` to the front. Verify with:

```bash
ffprobe -v trace -i output.mp4 2>&1 | grep -o -m1 "type:'moov'"
```

or check the top-level box order directly — `moov` must appear before `mdat`.

---

## Current test content violates this recipe

The two clips used to build the player were checked on 2026-07-25 by reading
the first 64 KB of each object and parsing the top-level MP4 box order:

| File | Size | Box order | faststart |
|---|---|---|---|
| `focus-video/video-player-test-1.mp4` (landscape) | 124.95 MB | `ftyp → uuid → free → mdat` | **No** |
| `focus-video/video-player-test-2.mp4` (portrait) | 241.86 MB | `ftyp → uuid → free → mdat` | **No** |

`moov` appears in neither file's header, so it sits after `mdat` at the end.

Both problems compound:

1. **No faststart** — the player must fetch the tail before the first frame.
2. **~10x oversized** — 125 MB and 242 MB against a 15–30 MB target. The `uuid`
   box right after `ftyp` suggests these came straight off a camera or editor
   with metadata intact and little or no compression pass.

**Consequence for the device walk:** slow first frame and visible buffering on
these clips is *expected* and is not a defect in the player. Do not spend effort
optimising playback against this content. Re-encode to the recipe first, then
judge the player.

---

## Re-encoding the existing test files

```bash
ffmpeg -i video-player-test-1.mp4 -c:v libx264 -profile:v high -crf 23 \
  -c:a aac -b:a 128k -movflags +faststart -vf scale=-2:1080 \
  video-player-test-1-v2.mp4
```

Upload the result to `focus-video/` **under a new filename** — never overwrite
in place. Two reasons:

- Resolved download URLs are cached in memory for the JS bundle lifetime
  (`resolveStorageUrl`), so a same-name replacement can serve a stale URL.
- Firebase rotates an object's download token on re-upload, which silently
  invalidates any URL already handed out.

Versioned filenames (`focus_explainer_v1.mp4`, `_v2`, …) are the convention
already used by `protocolAudio/` for exactly this reason.

---

## Aspect ratio

The player uses `contentFit="contain"` inline, so **any** aspect ratio renders
correctly — landscape letterboxes, portrait pillarboxes, neither stretches nor
crops. The two test clips are deliberately one of each to prove this.

Content does not have to be 16:9. But prefer **landscape 16:9** for explainer
content: it fills more of the frame in the inline player and matches what the
native fullscreen presentation expects.

---

## Storage path and rules

Content lives under `focus-video/` in Firebase Storage, governed by
`storage.rules`:

```
match /focus-video/{allPaths=**} {
  allow read: if isSignedIn();
  allow write: if isAdmin() && isVideoType() && underVideoSizeLimit();
}
```

- **Read** — any signed-in member. Never public.
- **Write** — admin claim only. In practice content is uploaded through the
  Firebase Console, which bypasses rules entirely.

### The write ceiling should come down

`underVideoSizeLimit()` is currently **500 MB**, raised solely to accommodate
the oversized test files. Once real content follows this recipe, drop it —
**50 MB is a generous ceiling** for a properly encoded 1–2 minute clip, and a
tighter limit turns "someone uploaded an unencoded file" into an immediate,
obvious failure rather than a silent 200 MB download for every viewer.

---

## Checklist before uploading content

- [ ] Encoded with the recipe above
- [ ] Output is 15–30 MB for a 1–2 minute clip
- [ ] `moov` verified before `mdat` (faststart)
- [ ] Filename is versioned, not a reuse of an existing name
- [ ] Uploaded to `focus-video/`
- [ ] Plays in the app from a cold start on cellular, not just wifi
