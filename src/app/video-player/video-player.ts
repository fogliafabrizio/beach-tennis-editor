import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  type ElementRef,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SliderModule } from 'primeng/slider';
import { buildBtMediaUrl } from '../../shared/utils/bt-media-url';
import { formatDuration } from '../../shared/utils/format-duration';
import { LibraryService } from '../../shared/services/library.service';
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
  private readonly library = inject(LibraryService);

  private readonly videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');

  protected readonly activeClip = this.player.activeClip;
  protected readonly isPlaying = this.player.isPlaying;

  private readonly isDragging = signal(false);
  protected readonly sliderModelMs = signal(0);
  private readonly pendingSeekMs = signal<number | null>(null);
  private wasPlayingBeforeDrag = false;
  private shouldPlayAfterLoad = false;

  protected readonly src = computed(() => {
    const clip = this.activeClip();
    return clip ? buildBtMediaUrl(clip.filePath) : '';
  });

  private readonly sortedClips = computed(() =>
    [...this.library.clips()].sort((a, b) => a.orderIndex - b.orderIndex),
  );

  protected readonly totalDurationMs = computed(() =>
    this.sortedClips().reduce((sum, c) => sum + (c.trimEndMs - c.trimStartMs), 0),
  );

  protected readonly absolutePositionMs = computed(() => {
    const clip = this.activeClip();
    if (!clip) return 0;
    let offset = 0;
    for (const c of this.sortedClips()) {
      if (c.id === clip.id) break;
      offset += c.trimEndMs - c.trimStartMs;
    }
    return offset + Math.max(0, this.player.currentTimeMs() - clip.trimStartMs);
  });

  protected readonly currentTimeLabel = computed(() => formatDuration(this.absolutePositionMs()));
  protected readonly totalDurationLabel = computed(() => formatDuration(this.totalDurationMs()));

  constructor() {
    effect(() => {
      if (this.isDragging()) return;
      this.sliderModelMs.set(this.absolutePositionMs());
    });
  }

  protected onVideoLoaded(): void {
    const clip = this.activeClip();
    if (!clip) return;
    const el = this.videoEl()?.nativeElement;
    if (!el) return;
    const pending = this.pendingSeekMs();
    const targetMs = pending ?? clip.trimStartMs;
    this.pendingSeekMs.set(null);
    el.currentTime = targetMs / 1000;
    this.player.setCurrentTimeMs(targetMs);
    if (this.shouldPlayAfterLoad) {
      this.shouldPlayAfterLoad = false;
      el.play().catch(() => {
        // play() può fallire se l'elemento non è ancora pronto; l'utente può ripartire manualmente.
      });
    }
  }

  protected onTimeUpdate(event: Event): void {
    if (this.isDragging()) return;
    const el = event.target as HTMLVideoElement;
    const clip = this.activeClip();
    if (!clip) return;
    const absoluteMs = Math.round(el.currentTime * 1000);
    if (absoluteMs >= clip.trimEndMs) {
      // Raggiunto il punto di trim end: pausa al confine. NON rewindare a trimStart,
      // altrimenti il playhead "torna a inizio clip" ogni volta che il video finisce la clip.
      el.pause();
      this.player.setIsPlaying(false);
      this.player.setCurrentTimeMs(clip.trimEndMs);
      return;
    }
    this.player.setCurrentTimeMs(absoluteMs);
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

  // --- Seek bar ---

  protected onSliderPointerDown(): void {
    if (this.isDragging()) return;
    this.beginDrag();
  }

  protected onSliderChange(value: number | number[] | undefined): void {
    if (typeof value !== 'number') return;
    if (!this.isDragging()) this.beginDrag();
    this.sliderModelMs.set(value);
    // Live scrub: aggiorna playhead e <video>.currentTime ad ogni frame del drag
    // così la linea sulla clip segue lo slider e l'utente può ripartire dal punto esatto.
    this.seekToAbsoluteMs(value);
  }

  protected onSliderEnd(value: number | number[] | undefined): void {
    if (typeof value !== 'number') return;
    this.sliderModelMs.set(value);
    this.seekToAbsoluteMs(value);
    this.endDrag();
  }

  @HostListener('document:pointerup')
  @HostListener('document:pointercancel')
  onDocumentPointerUp(): void {
    // Fallback se il rilascio avviene fuori dallo slider (onSlideEnd non scatta).
    if (!this.isDragging()) return;
    this.seekToAbsoluteMs(this.sliderModelMs());
    this.endDrag();
  }

  private beginDrag(): void {
    const el = this.videoEl()?.nativeElement;
    this.wasPlayingBeforeDrag = !!el && !el.paused;
    if (el && !el.paused) {
      el.pause();
    }
    this.isDragging.set(true);
  }

  private endDrag(): void {
    if (!this.isDragging()) return;
    this.isDragging.set(false);
    if (this.wasPlayingBeforeDrag) {
      this.wasPlayingBeforeDrag = false;
      const el = this.videoEl()?.nativeElement;
      if (el) {
        el.play().catch(() => {
          // src potrebbe essere cambiato durante il drag (clip switch). Riproveremo in onVideoLoaded.
          this.shouldPlayAfterLoad = true;
        });
      }
    }
  }

  private seekToAbsoluteMs(absoluteMs: number): void {
    const clips = this.sortedClips();
    let offset = 0;
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const effectiveDuration = clip.trimEndMs - clip.trimStartMs;
      const isLast = i === clips.length - 1;
      if (absoluteMs < offset + effectiveDuration || isLast) {
        const relativeMs = Math.max(0, Math.min(absoluteMs - offset, effectiveDuration));
        const absoluteFileMs = clip.trimStartMs + relativeMs;
        if (clip.id === this.player.activeClipId()) {
          const el = this.videoEl()?.nativeElement;
          if (el && Number.isFinite(el.duration)) {
            el.currentTime = absoluteFileMs / 1000;
          }
          this.player.setCurrentTimeMs(absoluteFileMs);
          // Allineiamo anche pendingSeekMs: se onVideoLoaded scatta in ritardo
          // (es. dopo un switch clip avvenuto prima nello stesso drag) non deve
          // sovrascrivere il seek con una posizione obsoleta.
          this.pendingSeekMs.set(absoluteFileMs);
        } else {
          this.pendingSeekMs.set(absoluteFileMs);
          this.player.setActiveClip(clip.id);
          // setActiveClip resetta currentTimeMs a 0: lo riportiamo subito al valore corretto
          // così il playhead nella nuova clip è già nella posizione giusta prima del reload.
          this.player.setCurrentTimeMs(absoluteFileMs);
        }
        return;
      }
      offset += effectiveDuration;
    }
  }

  // --- Split ---

  protected splitAtCurrentTime(): void {
    const clip = this.activeClip();
    if (!clip) return;
    const el = this.videoEl()?.nativeElement;
    const currentFileMs = this.player.currentTimeMs();
    const relativeMs = currentFileMs - clip.trimStartMs;
    const result = this.library.splitClip(clip.id, relativeMs);
    if (!result) return;

    // Lo split crea due clip che puntano allo stesso filePath: il <video> non ricarica.
    // Attiviamo la seconda metà e riposizioniamo manualmente il playhead sul punto di taglio,
    // altrimenti onTimeUpdate rileverebbe currentTime >= firstHalf.trimEnd e farebbe rewind.
    if (el) {
      el.pause();
    }
    this.player.setActiveClip(result.secondId);
    if (el) {
      el.currentTime = currentFileMs / 1000;
      this.player.setCurrentTimeMs(currentFileMs);
    }
  }

  @HostListener('document:keydown.c', ['$event'])
  onKeyC(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    event.preventDefault();
    this.splitAtCurrentTime();
  }
}
