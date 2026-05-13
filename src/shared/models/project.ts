import type { Match } from './match';

export type VideoFormat = 'mp4' | 'mov';

export const PROJECT_VERSION = '3.0';
export const LEGACY_PROJECT_VERSION = '2.5';

export interface ExportSettings {
  readonly outputPath: string;
  readonly overlayTemplateId: string;
  readonly format: VideoFormat;
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}

// Formato file `.btproject` v3.0: `match` è il container di teams/clips/scoreEvents.
// I file v2.5 (con `clips` top-level e senza `match`) vengono migrati silenziosamente
// in memoria da `project-migration.ts` al load e riscritti in v3.0 al primo save.
export interface BtProject {
  readonly version: string;
  readonly projectName: string;
  readonly projectFilePath: string;
  readonly match: Match;
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
