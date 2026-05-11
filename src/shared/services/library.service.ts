import { Injectable, computed, inject, signal, type Signal } from '@angular/core';
import type { VideoClip } from '../models/video-clip';
import { readVideoMetadata } from '../utils/read-video-metadata';
import { uuid } from '../utils/uuid';
import { ElectronService } from './electron.service';

const CLIP_COLORS = [
  '#4A9EFF',
  '#FF6B6B',
  '#51CF66',
  '#FFD43B',
  '#CC5DE8',
  '#FF922B',
  '#20C997',
  '#74C0FC',
] as const;

@Injectable({ providedIn: 'root' })
export class LibraryService {
  private readonly electron = inject(ElectronService);

  private readonly clipsSignal = signal<readonly VideoClip[]>([]);
  private readonly importingSignal = signal(false);

  readonly clips: Signal<readonly VideoClip[]> = this.clipsSignal.asReadonly();
  readonly isImporting: Signal<boolean> = this.importingSignal.asReadonly();
  readonly isEmpty = computed(() => this.clipsSignal().length === 0);

  async importFromDialog(): Promise<void> {
    if (this.importingSignal()) return;
    const paths = await this.electron.openDialog();
    if (paths.length === 0) return;
    await this.addClipsFromPaths(paths);
  }

  async addClipsFromPaths(paths: readonly string[]): Promise<void> {
    this.importingSignal.set(true);
    try {
      const baseIndex = this.clipsSignal().length;
      const newClips = await Promise.all(
        paths.map(async (filePath, i) => {
          const { durationMs, width, height } = await readVideoMetadata(filePath);
          const clip: VideoClip = {
            id: uuid(),
            filePath,
            durationMs,
            trimStartMs: 0,
            trimEndMs: durationMs,
            orderIndex: baseIndex + i,
            color: CLIP_COLORS[(baseIndex + i) % CLIP_COLORS.length],
            width,
            height,
          };
          return clip;
        })
      );
      this.clipsSignal.update((prev) => [...prev, ...newClips]);
    } finally {
      this.importingSignal.set(false);
    }
  }

  loadClips(clips: readonly VideoClip[]): void {
    this.clipsSignal.set([...clips]);
  }

  removeClip(id: string): void {
    this.clipsSignal.update((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, i) => (c.orderIndex === i ? c : { ...c, orderIndex: i }))
    );
  }

  reorderClips(fromIndex: number, toIndex: number): void {
    this.clipsSignal.update((prev) => {
      const clips = [...prev];
      const [moved] = clips.splice(fromIndex, 1);
      clips.splice(toIndex, 0, moved);
      return clips.map((c, i) => (c.orderIndex === i ? c : { ...c, orderIndex: i }));
    });
  }

  updateClipTrim(id: string, side: 'start' | 'end', ms: number): void {
    this.clipsSignal.update((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        if (side === 'start') {
          const newStart = Math.max(0, Math.min(ms, c.trimEndMs - 1000));
          return { ...c, trimStartMs: newStart };
        } else {
          const newEnd = Math.max(c.trimStartMs + 1000, Math.min(ms, c.durationMs));
          return { ...c, trimEndMs: newEnd };
        }
      })
    );
  }

  splitClip(id: string, atRelativeMs: number): { firstId: string; secondId: string } | null {
    let outcome: { firstId: string; secondId: string } | null = null;
    this.clipsSignal.update((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx === -1) return prev;
      const clip = prev[idx];
      const effectiveDuration = clip.trimEndMs - clip.trimStartMs;
      if (atRelativeMs < 100 || atRelativeMs > effectiveDuration - 100) return prev;
      const splitAbsMs = clip.trimStartMs + atRelativeMs;
      const firstHalf: VideoClip = { ...clip, trimEndMs: splitAbsMs };
      const secondHalf: VideoClip = { ...clip, id: uuid(), trimStartMs: splitAbsMs };
      outcome = { firstId: firstHalf.id, secondId: secondHalf.id };
      const next = [...prev];
      next.splice(idx, 1, firstHalf, secondHalf);
      return next.map((c, i) => (c.orderIndex === i ? c : { ...c, orderIndex: i }));
    });
    return outcome;
  }

  clear(): void {
    this.clipsSignal.set([]);
  }
}
