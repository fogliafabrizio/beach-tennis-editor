export const IPC = {
  FILE: {
    OPEN_DIALOG: 'file:open-dialog',
    READ: 'file:read',
  },
  FFMPEG: {
    MERGE: 'ffmpeg:merge',
    CUT: 'ffmpeg:cut',
    EXPORT: 'ffmpeg:export',
    PROGRESS: 'ffmpeg:progress',
  },
  PROJECT: {
    SAVE: 'project:save',
    LOAD: 'project:load',
  },
} as const;
