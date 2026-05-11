import { contextBridge, ipcRenderer } from 'electron';
import { IPC } from './models/ipc-channels';

contextBridge.exposeInMainWorld('electronAPI', {
  // FILE
  openDialog: () => ipcRenderer.invoke(IPC.FILE.OPEN_DIALOG),
  openProjectDialog: () => ipcRenderer.invoke(IPC.FILE.OPEN_DIALOG_PROJECT),
  saveProjectDialog: (defaultName: string) =>
    ipcRenderer.invoke(IPC.FILE.SAVE_DIALOG_PROJECT, defaultName),
  saveOutputDialog: (defaultName: string) =>
    ipcRenderer.invoke(IPC.FILE.SAVE_DIALOG_OUTPUT, defaultName),

  // PROJECT
  saveProject: (data: unknown) => ipcRenderer.invoke(IPC.PROJECT.SAVE, data),
  loadProject: (filePath: string) => ipcRenderer.invoke(IPC.PROJECT.LOAD, filePath),
  createProject: (name: string, filePath: string) =>
    ipcRenderer.invoke(IPC.PROJECT.NEW, name, filePath),
  listRecentProjects: () => ipcRenderer.invoke(IPC.PROJECT.LIST_RECENT),
  addRecentProject: (entry: unknown) => ipcRenderer.invoke(IPC.PROJECT.ADD_RECENT, entry),

  // FFMPEG
  mergeClips: (clipPaths: string[]) => ipcRenderer.invoke(IPC.FFMPEG.MERGE, clipPaths),
  cutClip: (path: string, start: number, end: number) =>
    ipcRenderer.invoke(IPC.FFMPEG.CUT, path, start, end),
  exportVideo: (options: unknown) => ipcRenderer.invoke(IPC.FFMPEG.EXPORT, options),
  probeVideo: (filePath: string) => ipcRenderer.invoke(IPC.FFMPEG.PROBE, filePath),

  // Evento push: main → renderer
  onFfmpegProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on(IPC.FFMPEG.PROGRESS, (_event, progress) => callback(progress));
  },
  removeFfmpegProgressListener: () => {
    ipcRenderer.removeAllListeners(IPC.FFMPEG.PROGRESS);
  },
});
