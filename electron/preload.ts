import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './models/ipc-channels';

contextBridge.exposeInMainWorld('electronAPI', {
  // FILE
  openDialog: () => ipcRenderer.invoke(IPC.FILE.OPEN_DIALOG),

  // PROJECT
  saveProject: (data: unknown) => ipcRenderer.invoke(IPC.PROJECT.SAVE, data),
  loadProject: () => ipcRenderer.invoke(IPC.PROJECT.LOAD),

  // FFMPEG
  mergeClips: (clipPaths: string[]) => ipcRenderer.invoke(IPC.FFMPEG.MERGE, clipPaths),
  cutClip: (path: string, start: number, end: number) =>
    ipcRenderer.invoke(IPC.FFMPEG.CUT, path, start, end),
  exportVideo: (options: unknown) => ipcRenderer.invoke(IPC.FFMPEG.EXPORT, options),

  // Evento push: main → renderer
  onFfmpegProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on(IPC.FFMPEG.PROGRESS, (_event, progress) => callback(progress));
  },
  removeFfmpegProgressListener: () => {
    ipcRenderer.removeAllListeners(IPC.FFMPEG.PROGRESS);
  },
});
