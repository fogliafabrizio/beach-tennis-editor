import type { VideoClip } from './video-clip';

export type VideoFormat = 'mp4' | 'mov';

export interface ExportSettings {
  readonly outputPath: string;
  readonly overlayTemplateId: string;
  readonly format: VideoFormat;
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}

// M2.5: formato semplificato (senza Match/Score, aggiunto in M3)
export interface BtProject {
  readonly version: string;
  readonly projectName: string;
  readonly projectFilePath: string;
  readonly clips: readonly VideoClip[];
  readonly exportSettings: ExportSettings;
  readonly savedAt: string; // ISO 8601
}

export interface RecentProject {
  readonly name: string;
  readonly filePath: string;
  readonly savedAt: string; // ISO 8601
}

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  outputPath: '',
  overlayTemplateId: '',
  format: 'mp4',
  width: 1920,
  height: 1080,
  frameRate: 30,
};
