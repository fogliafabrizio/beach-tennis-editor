import { readVideoMetadata } from './read-video-metadata';

function currentVideo(): HTMLVideoElement {
  const v = document.querySelector('video');
  if (!v) throw new Error('No <video> element appended yet');
  return v;
}

describe('readVideoMetadata', () => {
  afterEach(() => {
    document.querySelectorAll('video').forEach((v) => v.remove());
    jest.useRealTimers();
  });

  it('resolves with rounded duration in ms', async () => {
    const promise = readVideoMetadata('C:\\test.mp4', 5_000);
    await Promise.resolve();
    const video = currentVideo();
    Object.defineProperty(video, 'duration', { configurable: true, value: 12.345 });
    video.dispatchEvent(new Event('loadedmetadata'));
    await expect(promise).resolves.toEqual({ durationMs: 12_345, width: 0, height: 0 });
  });

  it('builds a bt-media:// URL for the video src', async () => {
    const promise = readVideoMetadata('C:\\My Videos\\clip 1.mp4', 5_000);
    await Promise.resolve();
    const video = currentVideo();
    expect(video.src).toContain('bt-media://local/');
    expect(video.src).toContain('My%20Videos');
    Object.defineProperty(video, 'duration', { configurable: true, value: 1 });
    video.dispatchEvent(new Event('loadedmetadata'));
    await promise;
  });

  it('rejects when the video element emits error', async () => {
    const promise = readVideoMetadata('C:\\bad.mp4', 5_000);
    await Promise.resolve();
    currentVideo().dispatchEvent(new Event('error'));
    await expect(promise).rejects.toThrow(/Impossibile leggere/);
  });

  it('rejects with a Durata non valida error when duration is NaN', async () => {
    const promise = readVideoMetadata('C:\\nan.mp4', 5_000);
    await Promise.resolve();
    const video = currentVideo();
    Object.defineProperty(video, 'duration', { configurable: true, value: NaN });
    video.dispatchEvent(new Event('loadedmetadata'));
    await expect(promise).rejects.toThrow(/Durata non valida/);
  });

  it('rejects after the timeout expires', async () => {
    jest.useFakeTimers();
    const promise = readVideoMetadata('C:\\slow.mp4', 1_000);
    const assertion = expect(promise).rejects.toThrow(/Timeout/);
    jest.advanceTimersByTime(1_500);
    await assertion;
  });
});
