export const IPC = {
  FILE: {
    OPEN_DIALOG: 'file:open-dialog',
    READ: 'file:read',
    OPEN_DIALOG_PROJECT: 'file:open-dialog-project',
    SAVE_DIALOG_PROJECT: 'file:save-dialog-project',
    SAVE_DIALOG_OUTPUT: 'file:save-dialog-output',
  },
  FFMPEG: {
    MERGE: 'ffmpeg:merge',
    CUT: 'ffmpeg:cut',
    EXPORT: 'ffmpeg:export',
    PROGRESS: 'ffmpeg:progress',
    PROBE: 'ffmpeg:probe', // → VideoProbeResult | null
  },
  PROJECT: {
    SAVE: 'project:save',
    LOAD: 'project:load',
    NEW: 'project:new',
    LIST_RECENT: 'project:list-recent',
    ADD_RECENT: 'project:add-recent',
  },
} as const;
