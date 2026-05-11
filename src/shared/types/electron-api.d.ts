export interface ElectronApi {
  // FILE
  openDialog(): Promise<string[]>;
  openProjectDialog(): Promise<string | null>;
  saveProjectDialog(defaultName: string): Promise<string | null>;
  saveOutputDialog(defaultName: string): Promise<string | null>;

  // PROJECT
  saveProject(data: unknown): Promise<void>;
  loadProject(filePath: string): Promise<unknown>;
  createProject(name: string, filePath: string): Promise<unknown>;
  listRecentProjects(): Promise<unknown[]>;
  addRecentProject(entry: unknown): Promise<void>;

  // FFMPEG
  mergeClips(clipPaths: string[]): Promise<void>;
  cutClip(filePath: string, startMs: number, endMs: number): Promise<void>;
  exportVideo(options: unknown): Promise<void>;
  probeVideo(filePath: string): Promise<unknown>;

  onFfmpegProgress(callback: (progress: number) => void): void;
  removeFfmpegProgressListener(): void;
}

declare global {
  interface Window {
    readonly electronAPI: ElectronApi;
  }
}

export {};
