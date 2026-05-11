# IPC Architecture (Electron)

Tutta la comunicazione renderer → main avviene tramite canali IPC tipizzati.
**Non esporre mai Node APIs direttamente al renderer** — tutto passa dal preload.

## Canali definiti

```typescript
// electron/models/ipc-channels.ts
export const IPC = {
  FILE: {
    OPEN_DIALOG: 'file:open-dialog',
    READ:        'file:read',
  },
  FFMPEG: {
    MERGE:    'ffmpeg:merge',
    CUT:      'ffmpeg:cut',
    EXPORT:   'ffmpeg:export',
    PROGRESS: 'ffmpeg:progress', // evento main → renderer (push)
  },
  PROJECT: {
    SAVE: 'project:save',
    LOAD: 'project:load',
  },
} as const;
```

## Flusso tipo

```
Renderer (Angular)
  └─ window.electronAPI.invoke(IPC.FILE.OPEN_DIALOG)
       │
  preload.ts (contextBridge)
       │
  Main process (Node.js)
       └─ ipcMain.handle(IPC.FILE.OPEN_DIALOG, handler)
```

## Regole

- Ogni canale ha un tipo di payload e risposta definiti in TypeScript
- Gli eventi push dal main (es. `FFMPEG.PROGRESS`) usano `ipcRenderer.on`, non `invoke`
- Il preload espone solo le funzioni necessarie tramite `contextBridge.exposeInMainWorld`
- Nessun `require` o `import` di moduli Node nel renderer
