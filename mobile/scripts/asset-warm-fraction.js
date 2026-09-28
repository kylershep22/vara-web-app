/**
 * Warm-fraction measurement of the Today background asset. NOT SHIPPED: this
 * file lives in scripts/ and is never bundled.
 *
 * WHY IT EXISTS. R1's Ruling 3 (journey roadmap, `docs/Vara_Journey_Architecture_Roadmap_v3.md`
 * :1387-1393) made this measurement part of the asset deliverable and said the
 * script is the deliverable, run once on the shipped asset. Standards 8.1 puts
 * warm pigment inside the artwork against the 4.2 accent ceiling. The asset
 * must be accepted on this measurement before any alpha or luminance work on
 * Today's surfaces begins.
 *
 * IT REPORTS FIGURES AND NO VERDICT. The 4.2 band is applied in the evidence
 * record, and 2.2's one-warm-point rule is a human compositional judgment that
 * no figure here can stand in for.
 *
 * THE DEFINITION, from Ruling 3: hue 20 to 55 degrees, saturation at or above
 * 0.25, lightness 0.25 to 0.85. The roadmap does not name a colour space or say
 * whether the bounds are inclusive, so both are decided here and pinned in
 * scripts/__tests__/asset-warm-fraction.test.ts:
 *
 *   - COLOUR SPACE. HSL computed directly on the decoded 8-bit sRGB-encoded
 *     channel values, with no linearisation, using the standard hexcone
 *     conversion (CSS Color 4's rgbToHsl). HSL is defined on gamma-encoded RGB,
 *     and this asset is a simple lossy VP8 WebP with no VP8X chunk and so no
 *     ICC profile: its values are sRGB by default.
 *   - INCLUSIVITY. Every bound is INCLUSIVE. Saturation says "at or above", and
 *     the two "X to Y" ranges are read the same way. Against a ceiling,
 *     inclusive errs toward counting a pixel as warm, never toward hiding one.
 *     No 8-bit pixel lands exactly on lightness 0.25 or 0.85 (they need a
 *     channel sum of 127.5 and 433.5), so those two bounds are pinned on the
 *     classifier, and the nearest real pixels either side are pinned as well.
 *
 * THE CORRIDOR. Standards 8.1: nothing load-bearing in the top or bottom 9%;
 * the middle 82% is the guaranteed frame. Resolved as whole rows:
 * start = floor(height * 9 / 100), end = height - start (exclusive). Flooring
 * keeps the corridor at least 82% of the frame; for 2796 rows it is rows 251
 * to 2544 inclusive, 2294 rows.
 *
 * THE COMPUTATION IS SEPARATE FROM THE DECODE. `warmFractions` takes a pixel
 * buffer and touches no file and no WASM, so jest tests it without loading the
 * decoder. The decoder, @jsquash/webp, is ESM-only; this file stays CommonJS
 * so jest can require it, and the decoder comes in through a dynamic import()
 * inside main(), which only runs from the command line.
 *
 * Usage:  node scripts/asset-warm-fraction.js
 *         node scripts/asset-warm-fraction.js path/to/other.webp
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ASSET = path.join(ROOT, 'assets', 'images', 'todayBackground.webp');

const HUE_MIN = 20;
const HUE_MAX = 55;
const SATURATION_MIN = 0.25;
const LIGHTNESS_MIN = 0.25;
const LIGHTNESS_MAX = 0.85;

/** Ruling 3's threshold, every bound inclusive. Hue in degrees, s and l in 0..1. */
function isWarmHsl(h, s, l) {
  return (
    h >= HUE_MIN &&
    h <= HUE_MAX &&
    s >= SATURATION_MIN &&
    l >= LIGHTNESS_MIN &&
    l <= LIGHTNESS_MAX
  );
}

/**
 * Hexcone HSL from 8-bit sRGB-encoded channels. Multiplications come before
 * divisions so a pixel sitting exactly on hue 20 or 55 computes exactly, and
 * saturation is a ratio of integers for the same reason.
 */
function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 510;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (255 - Math.abs(max + min - 255));
  let h;
  if (max === r) {
    h = (60 * (g - b)) / d;
    if (h < 0) h += 360;
  } else if (max === g) {
    h = (60 * (b - r)) / d + 120;
  } else {
    h = (60 * (r - g)) / d + 240;
  }
  return { h, s, l };
}

/** The 82% corridor as whole rows: [start, end), end exclusive. */
function corridorRows(height) {
  const start = Math.floor((height * 9) / 100);
  return { start, end: height - start };
}

/**
 * The two fractions. `data` is RGBA, 4 bytes per pixel, row-major; alpha is
 * ignored (the asset has none and decodes at 255). `rowStart` is inclusive and
 * `rowEnd` exclusive. Pure: no file, no decode, no WASM.
 */
function warmFractions(data, width, height, rowStart, rowEnd) {
  if (data.length !== width * height * 4) {
    throw new Error(`buffer is ${data.length} bytes, expected ${width * height * 4}`);
  }
  if (!(rowStart >= 0 && rowStart < rowEnd && rowEnd <= height)) {
    throw new Error(`corridor [${rowStart}, ${rowEnd}) is not inside 0..${height}`);
  }
  let warmWhole = 0;
  let warmCorridor = 0;
  for (let y = 0; y < height; y++) {
    const inCorridor = y >= rowStart && y < rowEnd;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
      if (isWarmHsl(h, s, l)) {
        warmWhole++;
        if (inCorridor) warmCorridor++;
      }
    }
  }
  return {
    whole: warmWhole / (width * height),
    corridor: warmCorridor / (width * (rowEnd - rowStart)),
  };
}

async function main() {
  const assetPath = path.resolve(process.argv[2] || DEFAULT_ASSET);
  const bytes = fs.readFileSync(assetPath);

  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  const gitBlob = crypto
    .createHash('sha1')
    .update(`blob ${bytes.length}\0`)
    .update(bytes)
    .digest('hex');

  const { default: decode, init } = await import('@jsquash/webp/decode.js');
  const wasmPath = require.resolve('@jsquash/webp/codec/dec/webp_dec.wasm');
  await init(await WebAssembly.compile(fs.readFileSync(wasmPath)));
  const image = await decode(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));

  const { start, end } = corridorRows(image.height);
  const { whole, corridor } = warmFractions(image.data, image.width, image.height, start, end);
  const pct = (f) => `${(f * 100).toFixed(2)}%`;

  console.log(`asset       ${path.relative(ROOT, assetPath).split(path.sep).join('/')}`);
  console.log(`sha256      ${sha256}`);
  console.log(`git blob    ${gitBlob}`);
  console.log(`bytes       ${bytes.length}`);
  console.log(`decoded     ${image.width} x ${image.height}, ${image.data.length / (image.width * image.height)} channels (RGBA)`);
  console.log(`definition  hue ${HUE_MIN}-${HUE_MAX} deg, saturation >= ${SATURATION_MIN}, lightness ${LIGHTNESS_MIN}-${LIGHTNESS_MAX}, all bounds inclusive`);
  console.log('colour      hexcone HSL on 8-bit sRGB-encoded values, no linearisation');
  console.log(`corridor    rows ${start} to ${end - 1} inclusive (${end - start} of ${image.height})`);
  console.log(`warm, whole frame   ${pct(whole)}`);
  console.log(`warm, 82% corridor  ${pct(corridor)}`);
}

module.exports = { warmFractions, corridorRows, rgbToHsl, isWarmHsl };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
