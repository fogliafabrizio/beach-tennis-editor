import { Injectable, computed, effect, inject, signal, type Signal } from '@angular/core';
import type { VideoClip } from '../models/video-clip';
import { LibraryService } from './library.service';

export interface SeekRequest {
  readonly ms: number;
  readonly nonce: number;
}

@Injectable({ providedIn: 'root' })
export class PlayerService {
  private readonly library = inject(LibraryService);

  private readonly activeClipIdSignal = signal<string | null>(null);
  private readonly currentTimeMsSignal = signal(0);
  private readonly isPlayingSignal = signal(false);
  private readonly seekRequestSignal = signal<SeekRequest | null>(null);
  private seekNonce = 0;

  readonly activeClipId: Signal<string | null> = this.activeClipIdSignal.asReadonly();
  readonly currentTimeMs: Signal<number> = this.currentTimeMsSignal.asReadonly();
  readonly isPlaying: Signal<boolean> = this.isPlayingSignal.asReadonly();
  readonly seekRequest: Signal<SeekRequest | null> = this.seekRequestSignal.asReadonly();

  readonly activeClip = computed<VideoClip | null>(() => {
    const id = this.activeClipIdSignal();
    if (id === null) return null;
    return this.library.clips().find((c) => c.id === id) ?? null;
  });

  constructor() {
    effect(() => {
      const clips = this.library.clips();
      const currentId = this.activeClipIdSignal();
      const stillExists = currentId !== null && clips.some((c) => c.id === currentId);
      if (stillExists) return;
      const next = clips[0]?.id ?? null;
      this.activeClipIdSignal.set(next);
      this.currentTimeMsSignal.set(0);
      this.isPlayingSignal.set(false);
    });
  }

  setActiveClip(id: string): void {
    if (this.activeClipIdSignal() === id) return;
    this.activeClipIdSignal.set(id);
    this.currentTimeMsSignal.set(0);
    this.isPlayingSignal.set(false);
  }

  setCurrentTimeMs(ms: number): void {
    this.currentTimeMsSignal.set(ms);
  }

  setIsPlaying(value: boolean): void {
    this.isPlayingSignal.set(value);
  }

  requestSeek(ms: number): void {
    this.seekNonce += 1;
    this.seekRequestSignal.set({ ms, nonce: this.seekNonce });
    this.currentTimeMsSignal.set(ms);
  }
}
