import { buildBtMediaUrl } from './bt-media-url';

export interface VideoMetadata {
  readonly durationMs: number;
  readonly width: number;
  readonly height: number;
}

export function readVideoMetadata(filePath: string, timeoutMs = 10_000): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.style.display = 'none';

    let settled = false;

    const cleanup = (): void => {
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
      clearTimeout(timer);
      video.removeAttribute('src');
      try {
        video.load();
      } catch {
        // jsdom non implementa la pipeline media: ignorare
      }
      video.remove();
    };

    const onLoaded = (): void => {
      if (settled) return;
      settled = true;
      const seconds = video.duration;
      const width = video.videoWidth;
      const height = video.videoHeight;
      cleanup();
      if (!Number.isFinite(seconds) || seconds <= 0) {
        reject(new Error(`Durata non valida per ${filePath}`));
        return;
      }
      resolve({ durationMs: Math.round(seconds * 1000), width, height });
    };

    const onError = (): void => {
      if (settled) return;
      settled = true;
      const mediaError = video.error;
      const code = mediaError?.code ?? '?';
      const message = mediaError?.message ?? '';
      const srcAtError = video.currentSrc || video.src;
      cleanup();
      reject(
        new Error(
          `Impossibile leggere i metadati di ${filePath} (MediaError code=${code} message="${message}" src="${srcAtError}")`
        )
      );
    };

    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Timeout lettura metadati per ${filePath}`));
    }, timeoutMs);

    video.addEventListener('loadedmetadata', onLoaded);
    video.addEventListener('error', onError);

    document.body.appendChild(video);
    video.src = buildBtMediaUrl(filePath);
  });
}
