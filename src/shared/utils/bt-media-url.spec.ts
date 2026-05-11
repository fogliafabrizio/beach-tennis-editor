import { buildBtMediaUrl } from './bt-media-url';

describe('buildBtMediaUrl', () => {
  it('renders Windows drive letter as first path segment (no colon)', () => {
    expect(buildBtMediaUrl('C:\\Users\\Foo\\clip.mp4')).toBe(
      'bt-media://local/C/Users/Foo/clip.mp4'
    );
  });

  it('uppercases the drive letter', () => {
    expect(buildBtMediaUrl('d:\\videos\\clip.mp4')).toBe('bt-media://local/D/videos/clip.mp4');
  });

  it('encodes spaces in path segments', () => {
    expect(buildBtMediaUrl('C:\\My Videos\\clip 1.mp4')).toBe(
      'bt-media://local/C/My%20Videos/clip%201.mp4'
    );
  });

  it('encodes ? and # which would otherwise be parsed as query/fragment', () => {
    expect(buildBtMediaUrl('C:\\foo\\bar?baz#qux.mp4')).toBe(
      'bt-media://local/C/foo/bar%3Fbaz%23qux.mp4'
    );
  });

  it('preserves parentheses in filenames (valid in URL paths)', () => {
    expect(buildBtMediaUrl('C:\\Videos\\24-04-2026(1).mp4')).toBe(
      'bt-media://local/C/Videos/24-04-2026(1).mp4'
    );
  });

  it('handles Unix absolute paths (no drive letter)', () => {
    expect(buildBtMediaUrl('/home/foo/clip.mp4')).toBe('bt-media://local/home/foo/clip.mp4');
  });
});
