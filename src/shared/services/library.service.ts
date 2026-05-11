import { Injectable, computed, inject, signal, type Signal } from '@angular/core';
import type { VideoClip } from '../models/video-clip';
import { readVideoMetadata } from '../utils/read-video-metadata';
import { uuid } from '../utils/uuid';
import { ElectronService } from './electron.service';

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
          const { durationMs } = await readVideoMetadata(filePath);
          const clip: VideoClip = {
            id: uuid(),
            filePath,
            durationMs,
            trimStartMs: 0,
            trimEndMs: durationMs,
            orderIndex: baseIndex + i,
          };
          return clip;
        })
      );
      this.clipsSignal.update((prev) => [...prev, ...newClips]);
    } finally {
      this.importingSignal.set(false);
    }
  }

  removeClip(id: string): void {
    this.clipsSignal.update((prev) =>
      prev
        .filter((c) => c.id !== id)
        .map((c, i) => (c.orderIndex === i ? c : { ...c, orderIndex: i }))
    );
  }

  clear(): void {
    this.clipsSignal.set([]);
  }
}
