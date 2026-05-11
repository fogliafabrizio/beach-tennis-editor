import { TestBed } from '@angular/core/testing';
import { ElectronService } from './electron.service';
import { LibraryService } from './library.service';
import * as metadataModule from '../utils/read-video-metadata';

describe('LibraryService', () => {
  let openDialog: jest.Mock;
  let readMetadata: jest.SpyInstance;

  beforeEach(() => {
    openDialog = jest.fn();
    readMetadata = jest
      .spyOn(metadataModule, 'readVideoMetadata')
      .mockImplementation((filePath: string) => {
        const map: Record<string, number> = {
          '/a.mp4': 1_000,
          '/b.mp4': 2_000,
          '/c.mp4': 500,
        };
        const ms = map[filePath] ?? 1_000;
        return Promise.resolve({ durationMs: ms });
      });

    TestBed.configureTestingModule({
      providers: [{ provide: ElectronService, useValue: { openDialog } }],
    });
  });

  afterEach(() => {
    readMetadata.mockRestore();
  });

  it('starts empty and reports isEmpty', () => {
    const svc = TestBed.inject(LibraryService);
    expect(svc.clips()).toEqual([]);
    expect(svc.isEmpty()).toBe(true);
    expect(svc.isImporting()).toBe(false);
  });

  it('importFromDialog populates clips with metadata-derived durations', async () => {
    openDialog.mockResolvedValueOnce(['/a.mp4', '/b.mp4']);
    const svc = TestBed.inject(LibraryService);

    await svc.importFromDialog();

    expect(svc.clips()).toHaveLength(2);
    expect(svc.clips()[0]).toMatchObject({
      filePath: '/a.mp4',
      durationMs: 1_000,
      trimStartMs: 0,
      trimEndMs: 1_000,
      orderIndex: 0,
    });
    expect(svc.clips()[1]).toMatchObject({
      filePath: '/b.mp4',
      orderIndex: 1,
    });
    expect(svc.isEmpty()).toBe(false);
    expect(svc.isImporting()).toBe(false);
  });

  it('importFromDialog is a no-op when the user cancels (empty paths)', async () => {
    openDialog.mockResolvedValueOnce([]);
    const svc = TestBed.inject(LibraryService);

    await svc.importFromDialog();

    expect(svc.clips()).toEqual([]);
    expect(readMetadata).not.toHaveBeenCalled();
  });

  it('addClipsFromPaths appends preserving previous clips immutably', async () => {
    const svc = TestBed.inject(LibraryService);
    await svc.addClipsFromPaths(['/a.mp4']);
    const firstSnapshot = svc.clips();

    await svc.addClipsFromPaths(['/b.mp4']);

    expect(svc.clips()).toHaveLength(2);
    expect(svc.clips()[1].orderIndex).toBe(1);
    expect(firstSnapshot).not.toBe(svc.clips());
    expect(firstSnapshot[0]).toBe(svc.clips()[0]);
  });

  it('removeClip drops the clip and re-indexes the rest', async () => {
    const svc = TestBed.inject(LibraryService);
    await svc.addClipsFromPaths(['/a.mp4', '/b.mp4', '/c.mp4']);

    const middleId = svc.clips()[1].id;
    svc.removeClip(middleId);

    expect(svc.clips().map((c) => c.filePath)).toEqual(['/a.mp4', '/c.mp4']);
    expect(svc.clips().map((c) => c.orderIndex)).toEqual([0, 1]);
  });

  it('clear empties the library', async () => {
    const svc = TestBed.inject(LibraryService);
    await svc.addClipsFromPaths(['/a.mp4']);
    svc.clear();
    expect(svc.clips()).toEqual([]);
    expect(svc.isEmpty()).toBe(true);
  });

  it('isImporting is true while metadata are being read', async () => {
    let resolveMeta!: (v: { durationMs: number }) => void;
    readMetadata.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveMeta = res;
        })
    );
    openDialog.mockResolvedValueOnce(['/a.mp4']);

    const svc = TestBed.inject(LibraryService);
    const pending = svc.importFromDialog();

    await Promise.resolve();
    expect(svc.isImporting()).toBe(true);

    resolveMeta({ durationMs: 1_000 });
    await pending;
    expect(svc.isImporting()).toBe(false);
  });

  it('refuses concurrent importFromDialog calls', async () => {
    let resolveMeta!: (v: { durationMs: number }) => void;
    readMetadata.mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveMeta = res;
        })
    );
    openDialog.mockResolvedValueOnce(['/a.mp4']);

    const svc = TestBed.inject(LibraryService);
    const first = svc.importFromDialog();
    await Promise.resolve();

    await svc.importFromDialog();

    expect(openDialog).toHaveBeenCalledTimes(1);

    resolveMeta({ durationMs: 1_000 });
    await first;
  });
});
