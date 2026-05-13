import { isLegacyProject, migrateProject } from './project-migration';
import { DEFAULT_EXPORT_SETTINGS, PROJECT_VERSION } from '../models/project';
import { STANDARD_BT_FORMAT } from '../models/match-formats';

describe('migrateProject', () => {
  describe('legacy v2.5', () => {
    it('migra un progetto v2.5 con clip top-level dentro match.clips', () => {
      const raw = {
        version: '2.5',
        projectName: 'Bucci - Rossi 11/05',
        projectFilePath: 'C:/x/file.btproject',
        clips: [
          { id: 'a', filePath: '/a.mp4', durationMs: 1000, trimStartMs: 0, trimEndMs: 1000, orderIndex: 0, color: '#4A9EFF', width: 1920, height: 1080 },
          { id: 'b', filePath: '/b.mp4', durationMs: 2000, trimStartMs: 0, trimEndMs: 2000, orderIndex: 1, color: '#FF6B6B', width: 0, height: 0 },
        ],
        exportSettings: { ...DEFAULT_EXPORT_SETTINGS, format: 'mov' as const, width: 1280, height: 720 },
        savedAt: '2025-04-02T14:30:00.000Z',
      };
      const out = migrateProject(raw);

      expect(out.version).toBe(PROJECT_VERSION);
      expect(out.projectName).toBe('Bucci - Rossi 11/05');
      expect(out.projectFilePath).toBe('C:/x/file.btproject');
      expect(out.savedAt).toBe('2025-04-02T14:30:00.000Z');
      expect(out.exportSettings.format).toBe('mov');
      expect(out.exportSettings.width).toBe(1280);

      expect(out.match.clips).toHaveLength(2);
      expect(out.match.clips[0].id).toBe('a');
      expect(out.match.format).toEqual(STANDARD_BT_FORMAT);
      expect(out.match.teams[0].displayName).toBe('Squadra 1');
      expect(out.match.teams[1].displayName).toBe('Squadra 2');
      expect(out.match.scoreEvents).toEqual([]);
      expect(out.match.sets).toEqual([]);
      expect(out.match.servingTeam).toBe(0);
    });

    it('migra v2.5 senza clip → match.clips vuoto', () => {
      const raw = {
        version: '2.5',
        projectName: 'vuoto',
        projectFilePath: '',
        clips: [],
        exportSettings: DEFAULT_EXPORT_SETTINGS,
        savedAt: '2025-04-02T14:30:00.000Z',
      };
      const out = migrateProject(raw);
      expect(out.match.clips).toEqual([]);
      expect(out.match.format).toEqual(STANDARD_BT_FORMAT);
    });

    it("non rompe se 'clips' è assente del tutto", () => {
      const raw = {
        version: '2.5',
        projectName: 'broken',
        projectFilePath: '',
        exportSettings: DEFAULT_EXPORT_SETTINGS,
        savedAt: '2025-04-02T14:30:00.000Z',
      };
      const out = migrateProject(raw);
      expect(out.match.clips).toEqual([]);
    });

    it('senza version riconosciuta tratta comunque come legacy', () => {
      const raw = {
        projectName: 'no-version',
        projectFilePath: '',
        clips: [],
        exportSettings: DEFAULT_EXPORT_SETTINGS,
        savedAt: '2025-04-02T14:30:00.000Z',
      };
      const out = migrateProject(raw);
      expect(out.version).toBe(PROJECT_VERSION);
      expect(out.match).toBeDefined();
    });

    it("usa DEFAULT_EXPORT_SETTINGS se exportSettings è malformato", () => {
      const raw = {
        version: '2.5',
        projectName: 'x',
        projectFilePath: '',
        clips: [],
        exportSettings: 'not-an-object',
        savedAt: '',
      };
      const out = migrateProject(raw);
      expect(out.exportSettings).toEqual(DEFAULT_EXPORT_SETTINGS);
    });
  });

  describe('v3.0 (idempotenza)', () => {
    it('ritorna invariato un progetto v3.0 ben formato', () => {
      const v3 = migrateProject({
        version: '2.5',
        projectName: 'first',
        projectFilePath: '/path',
        clips: [],
        exportSettings: DEFAULT_EXPORT_SETTINGS,
        savedAt: '2025-04-02T14:30:00.000Z',
      });
      const v3Round2 = migrateProject(v3);
      expect(v3Round2.version).toBe(PROJECT_VERSION);
      expect(v3Round2.projectName).toBe('first');
      expect(v3Round2.match).toEqual(v3.match);
    });

    it('tratta v3.0 senza match come legacy e ricostruisce un match default', () => {
      const raw = {
        version: PROJECT_VERSION,
        projectName: 'corrupt',
        projectFilePath: '',
        exportSettings: DEFAULT_EXPORT_SETTINGS,
        savedAt: '',
      };
      const out = migrateProject(raw);
      expect(out.match.format).toEqual(STANDARD_BT_FORMAT);
      expect(out.match.clips).toEqual([]);
    });
  });

  describe('errori', () => {
    it('rifiuta input non oggetto', () => {
      expect(() => migrateProject('stringa')).toThrow(/JSON/);
      expect(() => migrateProject(null)).toThrow(/JSON/);
      expect(() => migrateProject(undefined)).toThrow(/JSON/);
      expect(() => migrateProject([])).toThrow(/JSON/);
    });

    it("rifiuta versioni non riconosciute (es. v4.0 dal futuro)", () => {
      expect(() => migrateProject({ version: '4.0', match: {} })).toThrow(/non supportata/);
    });
  });
});

describe('isLegacyProject', () => {
  it('identifica v2.5', () => {
    expect(isLegacyProject({ version: '2.5' })).toBe(true);
  });

  it('identifica v3.0 senza match come legacy', () => {
    expect(isLegacyProject({ version: '3.0' })).toBe(true);
  });

  it('NON considera legacy un v3.0 con match valido', () => {
    expect(isLegacyProject({ version: '3.0', match: { id: 'm' } })).toBe(false);
  });

  it('su input non oggetto ritorna false', () => {
    expect(isLegacyProject(null)).toBe(false);
    expect(isLegacyProject('x')).toBe(false);
  });
});
