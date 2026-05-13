import type { BtProject, ExportSettings } from '../models/project';
import {
  DEFAULT_EXPORT_SETTINGS,
  LEGACY_PROJECT_VERSION,
  PROJECT_VERSION,
} from '../models/project';
import type { Match } from '../models/match';
import type { VideoClip } from '../models/video-clip';
import {
  STANDARD_BT_FORMAT,
  createDefaultTeam,
  createInitialMatch,
} from '../models/match-formats';

/**
 * Normalizza il raw JSON di un .btproject in BtProject corrente (v3.0).
 * - v2.5 (legacy, con `clips` top-level e senza `match`): migra automaticamente
 *   creando un Match con team placeholder ("Squadra 1" / "Squadra 2") e formato
 *   STANDARD_BT_FORMAT. Le `clips` top-level finiscono in `match.clips`.
 * - v3.0 con `match` valido: ritorna il progetto invariato (idempotente).
 * - v3.0 con `match` mancante o malformato: tratta come legacy.
 * - Oggetto non riconoscibile: lancia un errore con messaggio descrittivo.
 *
 * La funzione è pura: non legge/scrive su disco. Lo scrive `ProjectService`
 * al primo save dopo la migrazione.
 */
export function migrateProject(raw: unknown): BtProject {
  if (!isPlainObject(raw)) {
    throw new Error('Il file .btproject non e\' un oggetto JSON valido.');
  }
  const version = typeof raw['version'] === 'string' ? (raw['version'] as string) : null;
  if (version === PROJECT_VERSION && isPlainObject(raw['match'])) {
    return normalizeV3(raw);
  }
  if (version === PROJECT_VERSION || version === LEGACY_PROJECT_VERSION || version === null) {
    return migrateLegacyToV3(raw);
  }
  throw new Error(`Versione .btproject non supportata: ${version}`);
}

export function isLegacyProject(raw: unknown): boolean {
  if (!isPlainObject(raw)) return false;
  const version = raw['version'];
  if (version === LEGACY_PROJECT_VERSION) return true;
  if (version === PROJECT_VERSION && !isPlainObject(raw['match'])) return true;
  return false;
}

function normalizeV3(raw: Record<string, unknown>): BtProject {
  const match = raw['match'] as Match;
  return {
    version: PROJECT_VERSION,
    projectName: readString(raw, 'projectName', ''),
    projectFilePath: readString(raw, 'projectFilePath', ''),
    match,
    exportSettings: readExportSettings(raw),
    savedAt: readString(raw, 'savedAt', new Date().toISOString()),
  };
}

function migrateLegacyToV3(raw: Record<string, unknown>): BtProject {
  const clips = Array.isArray(raw['clips']) ? (raw['clips'] as readonly VideoClip[]) : [];
  const teams: readonly [ReturnType<typeof createDefaultTeam>, ReturnType<typeof createDefaultTeam>] = [
    createDefaultTeam(0),
    createDefaultTeam(1),
  ];
  const baseMatch = createInitialMatch(STANDARD_BT_FORMAT, teams, 0);
  const match: Match = { ...baseMatch, clips };
  return {
    version: PROJECT_VERSION,
    projectName: readString(raw, 'projectName', ''),
    projectFilePath: readString(raw, 'projectFilePath', ''),
    match,
    exportSettings: readExportSettings(raw),
    savedAt: readString(raw, 'savedAt', new Date().toISOString()),
  };
}

function readString(raw: Record<string, unknown>, key: string, fallback: string): string {
  const value = raw[key];
  return typeof value === 'string' ? value : fallback;
}

function readExportSettings(raw: Record<string, unknown>): ExportSettings {
  const value = raw['exportSettings'];
  if (!isPlainObject(value)) return DEFAULT_EXPORT_SETTINGS;
  return {
    outputPath: readString(value, 'outputPath', DEFAULT_EXPORT_SETTINGS.outputPath),
    overlayTemplateId: readString(value, 'overlayTemplateId', DEFAULT_EXPORT_SETTINGS.overlayTemplateId),
    format:
      value['format'] === 'mov' || value['format'] === 'mp4'
        ? value['format']
        : DEFAULT_EXPORT_SETTINGS.format,
    width: typeof value['width'] === 'number' ? value['width'] : DEFAULT_EXPORT_SETTINGS.width,
    height: typeof value['height'] === 'number' ? value['height'] : DEFAULT_EXPORT_SETTINGS.height,
    frameRate:
      typeof value['frameRate'] === 'number' ? value['frameRate'] : DEFAULT_EXPORT_SETTINGS.frameRate,
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
