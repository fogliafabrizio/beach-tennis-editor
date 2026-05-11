import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
setupZonelessTestEnv();

// Stub di window.electronAPI per i test che istanziano servizi/component che
// dipendono dal contextBridge di Electron (non presente in jsdom).
Object.defineProperty(window, 'electronAPI', {
  configurable: true,
  writable: true,
  value: {
    openDialog: () => Promise.resolve([] as string[]),
    saveProject: () => Promise.resolve(),
    loadProject: () => Promise.resolve(),
    mergeClips: () => Promise.resolve(),
    cutClip: () => Promise.resolve(),
    exportVideo: () => Promise.resolve(),
    onFfmpegProgress: () => undefined,
    removeFfmpegProgressListener: () => undefined,
  },
});
