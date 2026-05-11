import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
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
  readonly index: number;
}

interface RulerTick {
  readonly ms: number;
  readonly pct: number;
  readonly label: string;
}

interface TrimDrag {
  readonly blockId: string;
  readonly side: 'start' | 'end';
  readonly startX: number;
  readonly initialMs: number;
  readonly durationMs: number;
  readonly blockWidthPx: number;
}

const ZOOM_MIN = 1;
const ZOOM_MAX = 20;
const ZOOM_STEP = 0.5;

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
  protected readonly zoomLevel = signal(1);
  protected readonly dragOverIndex = signal(-1);
  private dragIndex = -1;
  private activeTrim: TrimDrag | null = null;

  private readonly totalMs = computed(() =>
    this.library.clips().reduce((acc, c) => acc + getEffectiveDuration(c), 0)
  );

  protected readonly blocks = computed<readonly TimelineBlock[]>(() => {
    const total = this.totalMs();
    if (total <= 0) return [];
    return this.library.clips().map((clip, index) => {
      const duration = getEffectiveDuration(clip);
      return {
        clip,
        widthPct: (duration / total) * 100,
        label: basename(clip.filePath),
        durationLabel: formatDuration(duration),
        index,
      };
    });
  });

  protected readonly playheadPct = computed(() => {
    const clip = this.player.activeClip();
    if (!clip) return 0;
    const duration = getEffectiveDuration(clip);
    if (duration <= 0) return 0;
    const relativeMs = Math.max(0, this.player.currentTimeMs() - clip.trimStartMs);
    return Math.max(0, Math.min(100, (relativeMs / duration) * 100));
  });

  protected readonly rulerTicks = computed<readonly RulerTick[]>(() => {
    const total = this.totalMs();
    if (total <= 0) return [];
    const zoom = this.zoomLevel();
    const visibleMs = total / zoom;
    const targetTicks = 8;
    const rawInterval = visibleMs / targetTicks;
    const interval = this.snapInterval(rawInterval);
    const ticks: RulerTick[] = [];
    for (let ms = 0; ms <= total; ms += interval) {
      ticks.push({ ms, pct: (ms / total) * 100, label: formatDuration(ms) });
    }
    return ticks;
  });

  private snapInterval(ms: number): number {
    const candidates = [500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000, 300000, 600000];
    return candidates.find((c) => c >= ms) ?? candidates[candidates.length - 1];
  }

  protected onSelect(clipId: string): void {
    this.player.setActiveClip(clipId);
  }

  protected zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(ZOOM_MAX, +(z + ZOOM_STEP).toFixed(1)));
  }

  protected zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(ZOOM_MIN, +(z - ZOOM_STEP).toFixed(1)));
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  // --- Drag-to-reorder ---

  protected onDragStart(event: DragEvent, index: number): void {
    this.dragIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this.dragOverIndex.set(index);
  }

  protected onDrop(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.dragIndex >= 0 && this.dragIndex !== index) {
      this.library.reorderClips(this.dragIndex, index);
    }
    this.dragIndex = -1;
    this.dragOverIndex.set(-1);
  }

  protected onDragEnd(): void {
    this.dragIndex = -1;
    this.dragOverIndex.set(-1);
  }

  protected onDragLeave(): void {
    this.dragOverIndex.set(-1);
  }

  // --- Trim handles ---

  protected onTrimHandleMouseDown(
    event: MouseEvent,
    block: TimelineBlock,
    side: 'start' | 'end'
  ): void {
    event.stopPropagation();
    event.preventDefault();

    const blockEl = (event.currentTarget as HTMLElement).closest('.timeline__block') as HTMLElement;
    const blockWidthPx = blockEl?.offsetWidth ?? 1;
    const initialMs = side === 'start' ? block.clip.trimStartMs : block.clip.trimEndMs;

    this.activeTrim = {
      blockId: block.clip.id,
      side,
      startX: event.clientX,
      initialMs,
      durationMs: block.clip.durationMs,
      blockWidthPx,
    };

    const onMove = (e: MouseEvent): void => this.handleTrimMove(e);
    const onUp = (): void => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      this.activeTrim = null;
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  private handleTrimMove(event: MouseEvent): void {
    if (!this.activeTrim) return;
    const { blockId, side, startX, initialMs, durationMs, blockWidthPx } = this.activeTrim;
    const deltaX = event.clientX - startX;
    const msPerPx = durationMs / blockWidthPx;
    const newMs = Math.round(initialMs + deltaX * msPerPx);
    this.library.updateClipTrim(blockId, side, newMs);
  }
}
