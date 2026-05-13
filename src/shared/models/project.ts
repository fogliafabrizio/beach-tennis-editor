import type { VideoClip } from './video-clip';
import type { Match } from './match';

export type VideoFormat = 'mp4' | 'mov';

export interface ExportSettings {
  readonly outputPath: string;
  readonly overlayTemplateId: string;
  readonly format: VideoFormat;
  readonly width: number;
  readonly height: number;
  readonly frameRate: number;
}

// Formato file `.btproject`.
// - v2.5 (legacy): clips top-level, niente Match.
// - v3.0 (M3 target): match contiene clips/teams/scoreEvents; clips top-level non scritto più.
// In transizione (M3 PR1): `match` è opzionale per non rompere il codice di runtime
// finché la migrazione del loader (PR3) non è in piedi. PR3 lo renderà required e
// rimuoverà `clips` top-level.
export interface BtProject {
  readonly version: string;
  readonly projectName: string;
  readonly projectFilePath: string;
  readonly clips: readonly VideoClip[];
  readonly match?: Match;
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
