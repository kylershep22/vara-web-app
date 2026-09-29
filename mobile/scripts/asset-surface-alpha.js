/**
 * Surface-opacity measurement for the immersive Today ground. NOT SHIPPED:
 * this file lives in scripts/ and is never bundled.
 *
 * WHY IT EXISTS. Standards 10.2 says the immersive surface card is White at a
 * token opacity, and that the opacity is not a taste decision: it must clear
 * the composite-luminance floor for the text the surface carries, "measured as
 * composite luminance at the darkest region the card can scroll over". R1's
 * Ruling 3 moved that measurement to R3, against the shipped asset.
 *
 * THE FLOORS (standards 10.2): Soft Charcoal body 0.392, Evergreen Teal body
 * 0.576, Evergreen Teal at 18pt Medium or larger 0.368. They are not averaged
 * across rows; a surface carrying teal body text is held to 0.576.
 *
 * THE METHOD.
 *   1. Composite White over each pixel at alpha a, per channel, in the
 *      8-bit sRGB-ENCODED space: v = a * 255 + (1 - a) * c. That is how iOS
 *      blends a translucent view by default. No rounding to 8 bits.
 *   2. WCAG 2.x relative luminance of the composite.
 *   3. Mean luminance over every w x w window in the frame (a box low-pass at
 *      glyph scale), via a summed-area table. The minimum over all windows is
 *      the governing value: the layer is fixed and every surface scrolls
 *      across the whole viewport, so the darkest window ANYWHERE is what some
 *      surface will eventually sit on. Not the region behind a card at rest.
 *   4. The smallest alpha at which that minimum clears the floor, by
 *      bisection. Composite luminance rises monotonically with alpha, so the
 *      bisection is exact to its tolerance.
 *
 * THE COMPUTATION IS SEPARATE FROM THE DECODE, on the warm-fraction script's
 * shape: the exported functions take an RGBA buffer and touch no file and no
 * WASM, so jest tests them without the decoder. The decoder, @jsquash/webp, is
 * ESM-only and comes in by dynamic import() inside main().
 *
 * Usage:  node scripts/asset-surface-alpha.js
 *         node scripts/asset-surface-alpha.js path/to/other.webp
 */

/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_ASSET = path.join(ROOT, 'assets', 'images', 'todayBackground.webp');

/** Standards 10.2's composite-luminance floors. */
const FLOORS = {
  charcoalBody: 0.392,
  tealBody: 0.576,
  tealLarge: 0.368,
};

/** WCAG 2.x sRGB channel linearisation, input 0..1. */
function linearize(v) {
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/**
 * Per-channel linear value of White composited at `alpha` over each 8-bit
 * input. The composite depends only on the input byte, so 256 entries cover
 * every pixel.
 */
function compositeLut(alpha) {
  const lut = new Float64Array(256);
  for (let c = 0; c < 256; c++) {
    lut[c] = linearize((alpha * 255 + (1 - alpha) * c) / 255);
  }
  return lut;
}

/**
 * The darkest `win` x `win` window, by mean composite luminance, with White at
 * `alpha` over the frame. Returns the mean and the window's top-left pixel.
 * Pure: no file, no decode, no WASM.
 */
function minWindowLuminance(data, width, height, win, alpha) {
  if (data.length !== width * height * 4) {
    throw new Error(`buffer is ${data.length} bytes, expected ${width * height * 4}`);
  }
  if (!(win >= 1 && win <= width && win <= height)) {
    throw new Error(`window ${win} does not fit ${width} x ${height}`);
  }
  const lut = compositeLut(alpha);
  // Summed-area table, one row and column of padding.
  const W = width + 1;
  const sat = new Float64Array(W * (height + 1));
  for (let y = 0; y < height; y++) {
    let rowSum = 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      rowSum += 0.2126 * lut[data[i]] + 0.7152 * lut[data[i + 1]] + 0.0722 * lut[data[i + 2]];
      sat[(y + 1) * W + (x + 1)] = sat[y * W + (x + 1)] + rowSum;
    }
  }
  const area = win * win;
  let min = Infinity;
  let minX = 0;
  let minY = 0;
  for (let y = 0; y + win <= height; y++) {
    for (let x = 0; x + win <= width; x++) {
      const s =
        sat[(y + win) * W + (x + win)] -
        sat[y * W + (x + win)] -
        sat[(y + win) * W + x] +
        sat[y * W + x];
      const mean = s / area;
      if (mean < min) {
        min = mean;
        minX = x;
        minY = y;
      }
    }
  }
  return { luminance: min, x: minX, y: minY };
}

/**
 * The smallest alpha, to `tolerance`, at which the darkest `win` window clears
 * `floor`. Rounded UP to the tolerance, so the reported value always clears.
 * Also returns where the darkest window sits AT that alpha.
 */
function requiredAlpha(data, width, height, win, floor, tolerance = 0.001) {
  let lo = 0;
  let hi = 1;
  if (minWindowLuminance(data, width, height, win, 0).luminance >= floor) {
    return { alpha: 0, ...minWindowLuminance(data, width, height, win, 0) };
  }
  while (hi - lo > tolerance / 4) {
    const mid = (lo + hi) / 2;
    if (minWindowLuminance(data, width, height, win, mid).luminance >= floor) hi = mid;
    else lo = mid;
  }
  const alpha = Math.min(1, Math.ceil(hi / tolerance) * tolerance);
  return { alpha: Number(alpha.toFixed(6)), ...minWindowLuminance(data, width, height, win, alpha) };
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
  const { data, width, height } = image;

  console.log(`asset       ${path.relative(ROOT, assetPath).split(path.sep).join('/')}`);
  console.log(`sha256      ${sha256}`);
  console.log(`git blob    ${gitBlob}`);
  console.log(`decoded     ${width} x ${height}`);
  console.log('method      White composited in 8-bit sRGB-encoded space, WCAG luminance, box mean over w x w px, min over whole frame');
  const raw = minWindowLuminance(data, width, height, 1, 0);
  console.log(`raw darkest pixel luminance ${raw.luminance.toFixed(4)} at (${raw.x}, ${raw.y})`);
  console.log('');
  console.log('window px   floor          alpha   darkest window (x, y) top-left, px   luminance at alpha');
  for (const win of [12, 24, 48, 96, 144]) {
    for (const [name, floor] of Object.entries(FLOORS)) {
      const r = requiredAlpha(data, width, height, win, floor);
      console.log(
        `${String(win).padEnd(11)} ${`${name} ${floor}`.padEnd(14)} ${r.alpha.toFixed(3)}   (${r.x}, ${r.y})`.padEnd(70) +
          ` ${r.luminance.toFixed(4)}`
      );
    }
  }
}

module.exports = { FLOORS, linearize, compositeLut, minWindowLuminance, requiredAlpha };

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
