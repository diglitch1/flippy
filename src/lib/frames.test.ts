import { describe, expect, it } from 'vitest';
import { buildSequence } from './frames';
import type { Frame } from '../types';

function frames(n: number): Frame[] {
  return Array.from({ length: n }, (_, i) => ({
    index: i + 1,
    time: i,
    jpeg: new Uint8Array([i]),
    width: 10,
    height: 10,
  }));
}

describe('buildSequence', () => {
  it('returns the frames unchanged (renumbered) without boomerang', () => {
    const seq = buildSequence(frames(4), false);
    expect(seq.map((f) => f.index)).toEqual([1, 2, 3, 4]);
    expect(seq.map((f) => f.jpeg[0])).toEqual([0, 1, 2, 3]);
  });

  it('appends the reversed middle for a there-and-back loop', () => {
    const seq = buildSequence(frames(4), true);
    // forward 0,1,2,3 then reversed middle 2,1
    expect(seq.map((f) => f.jpeg[0])).toEqual([0, 1, 2, 3, 2, 1]);
    expect(seq.map((f) => f.index)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('does not duplicate the single frame edge case', () => {
    expect(buildSequence(frames(1), true).map((f) => f.jpeg[0])).toEqual([0]);
  });
});
