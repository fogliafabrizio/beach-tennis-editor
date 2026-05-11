export interface ElectronApi {
  openDialog(): Promise<string[]>;
  saveProject(data: unknown): Promise<void>;
  loadProject(): Promise<unknown>;
  mergeClips(clipPaths: string[]): Promise<void>;
  cutClip(filePath: string, startMs: number, endMs: number): Promise<void>;
  exportVideo(options: unknown): Promise<void>;
  onFfmpegProgress(callback: (progress: number) => void): void;
  removeFfmpegProgressListener(): void;
}

declare global {
  interface Window {
    readonly electronAPI: ElectronApi;
  }
}

export {};
