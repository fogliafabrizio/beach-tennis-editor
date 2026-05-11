import { basename } from './basename';

describe('basename', () => {
  it('extracts filename from Windows path', () => {
    expect(basename('C:\\Users\\Foo\\video.mp4')).toBe('video.mp4');
  });

  it('extracts filename from Unix path', () => {
    expect(basename('/home/foo/video.mp4')).toBe('video.mp4');
  });

  it('handles paths with spaces and Unicode', () => {
    expect(basename('C:\\My Videos\\partita finale\\set 1 — finale.mp4')).toBe(
      'set 1 — finale.mp4'
    );
  });

  it('returns the input when no separator is present', () => {
    expect(basename('video.mp4')).toBe('video.mp4');
  });

  it('returns empty string for trailing separator', () => {
    expect(basename('/foo/bar/')).toBe('');
  });
});
