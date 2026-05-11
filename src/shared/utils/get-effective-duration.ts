import type { VideoClip } from '../models/video-clip';

export function getEffectiveDuration(clip: VideoClip): number {
  return clip.trimEndMs - clip.trimStartMs;
}
