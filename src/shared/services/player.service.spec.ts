import { TestBed } from '@angular/core/testing';
import { ElectronService } from './electron.service';
import { LibraryService } from './library.service';
import { PlayerService } from './player.service';
import * as metadataModule from '../utils/read-video-metadata';

describe('PlayerService', () => {
  let readMetadata: jest.SpyInstance;

  beforeEach(() => {
    readMetadata = jest
      .spyOn(metadataModule, 'readVideoMetadata')
      .mockImplementation((filePath: string) => {
        const map: Record<string, number> = {
          '/a.mp4': 1_000,
          '/b.mp4': 2_000,
          '/c.mp4': 500,
        };
        return Promise.resolve({ durationMs: map[filePath] ?? 1_000 });
      });

    TestBed.configureTestingModule({
      providers: [{ provide: ElectronService, useValue: { openDialog: jest.fn() } }],
    });
  });

  afterEach(() => {
    readMetadata.mockRestore();
  });

  it('starts with no active clip when the library is empty', () => {
    const player = TestBed.inject(PlayerService);
    TestBed.tick();

    expect(player.activeClipId()).toBeNull();
    expect(player.activeClip()).toBeNull();
    expect(player.currentTimeMs()).toBe(0);
    expect(player.isPlaying()).toBe(false);
  });

  it('auto-selects the first imported clip', async () => {
    const library = TestBed.inject(LibraryService);
    const player = TestBed.inject(PlayerService);

    await library.addClipsFromPaths(['/a.mp4', '/b.mp4']);
    TestBed.tick();

    expect(player.activeClipId()).toBe(library.clips()[0].id);
    expect(player.activeClip()?.filePath).toBe('/a.mp4');
  });

  it('does not change the active clip when more clips are appended', async () => {
    const library = TestBed.inject(LibraryService);
    const player = TestBed.inject(PlayerService);

    await library.addClipsFromPaths(['/a.mp4']);
    TestBed.tick();
    const firstId = player.activeClipId();

    await library.addClipsFromPaths(['/b.mp4']);
    TestBed.tick();

    expect(player.activeClipId()).toBe(firstId);
  });

  it('falls back to the first remaining clip when the active one is removed', async () => {
    const library = TestBed.inject(LibraryService);
    const player = TestBed.inject(PlayerService);

    await library.addClipsFromPaths(['/a.mp4', '/b.mp4']);
    TestBed.tick();

    player.setCurrentTimeMs(500);
    player.setIsPlaying(true);

    library.removeClip(library.clips()[0].id);
    TestBed.tick();

    expect(player.activeClip()?.filePath).toBe('/b.mp4');
    expect(player.currentTimeMs()).toBe(0);
    expect(player.isPlaying()).toBe(false);
  });

  it('clears the active clip when the library becomes empty', async () => {
    const library = TestBed.inject(LibraryService);
    const player = TestBed.inject(PlayerService);

    await library.addClipsFromPaths(['/a.mp4']);
    TestBed.tick();

    library.clear();
    TestBed.tick();

    expect(player.activeClipId()).toBeNull();
    expect(player.activeClip()).toBeNull();
  });

  it('setActiveClip switches clip and resets time and playing state', async () => {
    const library = TestBed.inject(LibraryService);
    const player = TestBed.inject(PlayerService);

    await library.addClipsFromPaths(['/a.mp4', '/b.mp4']);
    TestBed.tick();
    player.setCurrentTimeMs(750);
    player.setIsPlaying(true);

    const secondId = library.clips()[1].id;
    player.setActiveClip(secondId);

    expect(player.activeClipId()).toBe(secondId);
    expect(player.currentTimeMs()).toBe(0);
    expect(player.isPlaying()).toBe(false);
  });

  it('setActiveClip is a no-op when the id is already active', async () => {
    const library = TestBed.inject(LibraryService);
    const player = TestBed.inject(PlayerService);

    await library.addClipsFromPaths(['/a.mp4']);
    TestBed.tick();
    const id = player.activeClipId()!;
    player.setCurrentTimeMs(400);
    player.setIsPlaying(true);

    player.setActiveClip(id);

    expect(player.currentTimeMs()).toBe(400);
    expect(player.isPlaying()).toBe(true);
  });

  it('requestSeek updates currentTimeMs and emits a new seek request with an incrementing nonce', () => {
    const player = TestBed.inject(PlayerService);
    TestBed.tick();

    expect(player.seekRequest()).toBeNull();

    player.requestSeek(1_500);
    const first = player.seekRequest();
    expect(first).toEqual({ ms: 1_500, nonce: expect.any(Number) });
    expect(player.currentTimeMs()).toBe(1_500);

    player.requestSeek(2_500);
    const second = player.seekRequest();
    expect(second!.ms).toBe(2_500);
    expect(second!.nonce).toBeGreaterThan(first!.nonce);
    expect(player.currentTimeMs()).toBe(2_500);
  });

  it('setCurrentTimeMs and setIsPlaying do not produce a seek request', () => {
    const player = TestBed.inject(PlayerService);
    TestBed.tick();

    player.setCurrentTimeMs(123);
    player.setIsPlaying(true);

    expect(player.seekRequest()).toBeNull();
    expect(player.currentTimeMs()).toBe(123);
    expect(player.isPlaying()).toBe(true);
  });
});
