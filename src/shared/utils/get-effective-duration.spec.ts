import { getEffectiveDuration } from './get-effective-duration';
import type { VideoClip } from '../models/video-clip';

function makeClip(partial: Partial<VideoClip> = {}): VideoClip {
  return {
    id: 'id-1',
    filePath: '/foo/bar.mp4',
    durationMs: 60_000,
    trimStartMs: 0,
    trimEndMs: 60_000,
    orderIndex: 0,
    ...partial,
  };
}

describe('getEffectiveDuration', () => {
  it('returns full duration when not trimmed', () => {
    expect(getEffectiveDuration(makeClip())).toBe(60_000);
  });

  it('subtracts trim from start and end', () => {
    expect(
      getEffectiveDuration(makeClip({ trimStartMs: 1_000, trimEndMs: 5_000 }))
    ).toBe(4_000);
  });
});
