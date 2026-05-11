import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { buildBtMediaUrl } from '../../shared/utils/bt-media-url';
import { formatDuration } from '../../shared/utils/format-duration';
import { getEffectiveDuration } from '../../shared/utils/get-effective-duration';
import { PlayerService } from '../../shared/services/player.service';

@Component({
  selector: 'app-video-player',
  imports: [ButtonModule, SliderModule, FormsModule],
  templateUrl: './video-player.html',
  styleUrl: './video-player.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoPlayer {
  protected readonly player = inject(PlayerService);

  private readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');

  protected readonly activeClip = this.player.activeClip;
  protected readonly isPlaying = this.player.isPlaying;

  protected readonly src = computed(() => {
    const clip = this.activeClip();
    return clip ? buildBtMediaUrl(clip.filePath) : '';
  });

  protected readonly durationMs = computed(() => {
    const clip = this.activeClip();
    return clip ? getEffectiveDuration(clip) : 0;
  });

  protected readonly currentTimeLabel = computed(() => formatDuration(this.player.currentTimeMs()));
  protected readonly durationLabel = computed(() => formatDuration(this.durationMs()));

  constructor() {
    effect(() => {
      const req = this.player.seekRequest();
      if (req === null) return;
      const el = this.videoEl()?.nativeElement;
      if (!el) return;
      el.currentTime = req.ms / 1000;
    });
  }

  protected onTimeUpdate(event: Event): void {
    const el = event.target as HTMLVideoElement;
    this.player.setCurrentTimeMs(Math.round(el.currentTime * 1000));
  }

  protected onPlay(): void {
    this.player.setIsPlaying(true);
  }

  protected onPause(): void {
    this.player.setIsPlaying(false);
  }

  protected onEnded(): void {
    this.player.setIsPlaying(false);
  }

  protected async togglePlay(): Promise<void> {
    const el = this.videoEl()?.nativeElement;
    if (!el) return;
    if (el.paused) {
      try {
        await el.play();
      } catch (err) {
        console.error('[VideoPlayer] play() rejected', err, {
          src: el.currentSrc,
          readyState: el.readyState,
          networkState: el.networkState,
          error: el.error,
        });
      }
    } else {
      el.pause();
    }
  }

  protected onSeek(value: number | number[] | undefined): void {
    if (typeof value !== 'number') return;
    this.player.requestSeek(value);
  }
}
