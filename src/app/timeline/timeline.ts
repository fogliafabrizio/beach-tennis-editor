import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { VideoClip } from '../../shared/models/video-clip';
import { LibraryService } from '../../shared/services/library.service';
import { PlayerService } from '../../shared/services/player.service';
import { formatDuration } from '../../shared/utils/format-duration';
import { getEffectiveDuration } from '../../shared/utils/get-effective-duration';
import { basename } from '../../shared/utils/basename';

interface TimelineBlock {
  readonly clip: VideoClip;
  readonly widthPct: number;
  readonly label: string;
  readonly durationLabel: string;
}

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.html',
  styleUrl: './timeline.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Timeline {
  private readonly library = inject(LibraryService);
  private readonly player = inject(PlayerService);

  protected readonly activeClipId = this.player.activeClipId;

  private readonly totalMs = computed(() =>
    this.library.clips().reduce((acc, c) => acc + getEffectiveDuration(c), 0)
  );

  protected readonly blocks = computed<readonly TimelineBlock[]>(() => {
    const total = this.totalMs();
    if (total <= 0) return [];
    return this.library.clips().map((clip) => {
      const duration = getEffectiveDuration(clip);
      return {
        clip,
        widthPct: (duration / total) * 100,
        label: basename(clip.filePath),
        durationLabel: formatDuration(duration),
      };
    });
  });

  protected readonly playheadPct = computed(() => {
    const clip = this.player.activeClip();
    if (!clip) return 0;
    const duration = getEffectiveDuration(clip);
    if (duration <= 0) return 0;
    const ratio = this.player.currentTimeMs() / duration;
    return Math.max(0, Math.min(100, ratio * 100));
  });

  protected onSelect(clipId: string): void {
    this.player.setActiveClip(clipId);
  }
}
