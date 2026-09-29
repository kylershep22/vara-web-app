// The surface-opacity calculation, over buffers built by hand.
//
// THE PURE FUNCTIONS ONLY. Nothing here decodes the asset or loads the WASM
// decoder; the asset's own figures are the script's command-line output.
//
// THE ANCHOR IS A CLOSED FORM. Over pure black, White at alpha `a` composites
// to an encoded value of exactly `a`, so the alpha that clears a floor is the
// inverse of WCAG's linearisation: 1.055 * floor^(1/2.4) - 0.055. A test that
// only checked "more alpha is lighter" would pass on a wrong transfer curve.

import {
  FLOORS,
  linearize,
  minWindowLuminance,
  requiredAlpha,
} from '../asset-surface-alpha';

type Rgb = [number, number, number];

function solid(width: number, height: number, rgb: Rgb): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) data.set([...rgb, 255], i * 4);
  return data;
}

function paint(data: Uint8ClampedArray, width: number, x: number, y: number, rgb: Rgb) {
  data.set([...rgb, 255], (y * width + x) * 4);
}

describe('linearize', () => {
  test('is WCAG 2.x sRGB: both ends and the segment join', () => {
    expect(linearize(0)).toBe(0);
    expect(linearize(1)).toBeCloseTo(1, 12);
    expect(linearize(0.04045)).toBeCloseTo(0.04045 / 12.92, 12);
  });
});

describe('requiredAlpha', () => {
  test('over pure black, matches the closed-form inverse for each floor', () => {
    const data = solid(4, 4, [0, 0, 0]);
    for (const floor of Object.values(FLOORS)) {
      const expected = 1.055 * Math.pow(floor, 1 / 2.4) - 0.055;
      const r = requiredAlpha(data, 4, 4, 2, floor);
      // Rounded UP to 0.001, so it never undershoots and overshoots by < 0.001.
      expect(r.alpha).toBeGreaterThanOrEqual(expected);
      expect(r.alpha - expected).toBeLessThan(0.001);
      expect(r.luminance).toBeGreaterThanOrEqual(floor);
    }
  });

  test('over pure white, needs no alpha at all', () => {
    expect(requiredAlpha(solid(3, 3, [255, 255, 255]), 3, 3, 1, FLOORS.tealBody).alpha).toBe(0);
  });

  test('is set by the darkest window, and reports where it is', () => {
    // A white frame with one black 2x2 block at (5, 6). The frame's alpha is
    // the black block's alpha, and the reported window is the block.
    const data = solid(10, 10, [255, 255, 255]);
    for (const [x, y] of [[5, 6], [6, 6], [5, 7], [6, 7]]) paint(data, 10, x, y, [0, 0, 0]);
    const r = requiredAlpha(data, 10, 10, 2, FLOORS.tealBody);
    expect({ x: r.x, y: r.y }).toEqual({ x: 5, y: 6 });
    expect(r.alpha).toBeCloseTo(requiredAlpha(solid(2, 2, [0, 0, 0]), 2, 2, 2, FLOORS.tealBody).alpha, 3);
  });
});

describe('minWindowLuminance', () => {
  test('averages over the window: one black pixel in a white 3x3 reads 8/9', () => {
    const data = solid(3, 3, [255, 255, 255]);
    paint(data, 3, 1, 1, [0, 0, 0]);
    expect(minWindowLuminance(data, 3, 3, 3, 0).luminance).toBeCloseTo(8 / 9, 12);
    // And at window 1 the same pixel is the minimum, unaveraged.
    expect(minWindowLuminance(data, 3, 3, 1, 0)).toEqual({ luminance: 0, x: 1, y: 1 });
  });
});
