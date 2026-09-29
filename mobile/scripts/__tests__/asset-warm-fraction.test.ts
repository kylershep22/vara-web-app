// The warm-fraction calculation, over buffers built by hand.
//
// THE PURE FUNCTION ONLY. Nothing here decodes, reads the asset or loads the
// WASM decoder: `warmFractions` takes a buffer, and the decode lives in the
// script's main(), which never runs under jest. The asset's own figures are the
// script's command-line output, not something this file asserts.
//
// EACH BOUNDARY TEST PAIRS A PIXEL ON THE EDGE WITH ONE JUST OUTSIDE IT. The
// on-edge pixel alone would pass for a classifier with no bound at all; the
// pair is what pins where the edge is and that it is inclusive.

import {
  warmFractions,
  corridorRows,
  rgbToHsl,
  isWarmHsl,
} from '../asset-warm-fraction';

type Rgb = [number, number, number];

const WARM: Rgb = [230, 160, 100]; // h 27.7, s 0.72, l 0.65
const COOL: Rgb = [100, 140, 160]; // h 200

/** An RGBA buffer, one row per entry of `rows`, each row filled with one colour. */
function bufferOf(width: number, rows: Rgb[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * rows.length * 4);
  rows.forEach((rgb, y) => {
    for (let x = 0; x < width; x++) {
      data.set([...rgb, 255], (y * width + x) * 4);
    }
  });
  return data;
}

/** One-row buffer of the given pixels; whole frame is the corridor. */
function fractionOf(pixels: Rgb[]): number {
  const data = new Uint8ClampedArray(pixels.length * 4);
  pixels.forEach((rgb, i) => data.set([...rgb, 255], i * 4));
  return warmFractions(data, pixels.length, 1, 0, 1).whole;
}

describe('warmFractions', () => {
  test('an all-warm buffer is 1.0 in both figures', () => {
    const r = warmFractions(bufferOf(4, [WARM, WARM, WARM, WARM]), 4, 4, 1, 3);
    expect(r).toEqual({ whole: 1, corridor: 1 });
  });

  test('an all-non-warm buffer is 0.0 in both figures', () => {
    const r = warmFractions(bufferOf(4, [COOL, COOL, COOL, COOL]), 4, 4, 1, 3);
    expect(r).toEqual({ whole: 0, corridor: 0 });
  });

  test('a half-warm buffer is 0.5', () => {
    expect(fractionOf([WARM, COOL, WARM, COOL])).toBe(0.5);
  });

  test('hue 20 is warm, inclusive; 19.2 is not', () => {
    expect(rgbToHsl(200, 150, 125).h).toBe(20);
    expect(fractionOf([[200, 150, 125], [200, 149, 125]])).toBe(0.5);
  });

  test('hue 55 is warm, inclusive; 55.5 is not', () => {
    expect(rgbToHsl(170, 160, 50).h).toBe(55);
    expect(fractionOf([[170, 160, 50], [170, 161, 50]])).toBe(0.5);
  });

  test('saturation 0.25 is warm, inclusive; 0.245 is not', () => {
    expect(rgbToHsl(150, 120, 90).s).toBe(0.25);
    expect(fractionOf([[150, 120, 90], [150, 120, 91]])).toBe(0.5);
  });

  test('lightness 0.25 is warm, inclusive; the nearest 8-bit pixels either side split', () => {
    // No 8-bit pixel sits exactly on 0.25 (it needs a channel sum of 127.5), so
    // the bound itself is pinned on the classifier and the real pixels at sums
    // 128 (0.251) and 127 (0.249) are pinned on the buffer.
    expect(isWarmHsl(30, 0.5, 0.25)).toBe(true);
    expect(fractionOf([[90, 64, 38], [90, 64, 37]])).toBe(0.5);
  });

  test('lightness 0.85 is warm, inclusive; the nearest 8-bit pixels either side split', () => {
    // Same reason: 0.85 needs a channel sum of 433.5. Sums 433 (0.849) and
    // 434 (0.851) are the real pixels either side.
    expect(isWarmHsl(30, 0.5, 0.85)).toBe(true);
    expect(fractionOf([[255, 216, 178], [255, 217, 179]])).toBe(0.5);
  });

  test('warm rows only just outside the corridor: whole above zero, corridor exactly zero', () => {
    // Ten rows, corridor [1, 9). Warm sits on row 0 and row 9, the rows
    // touching each edge, so a crop that is one row wide at either end counts
    // a warm row and this goes red.
    const rows: Rgb[] = [WARM, COOL, COOL, COOL, COOL, COOL, COOL, COOL, COOL, WARM];
    const r = warmFractions(bufferOf(3, rows), 3, 10, 1, 9);
    expect(r.whole).toBe(0.2);
    expect(r.corridor).toBe(0);
  });
});

describe('corridorRows', () => {
  test('the shipped frame height resolves to rows 251 to 2544 inclusive', () => {
    expect(corridorRows(2796)).toEqual({ start: 251, end: 2545 });
  });
});
