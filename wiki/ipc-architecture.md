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

## Protocollo `bt-media://`

Per riprodurre file video locali nel `<video>` HTML5 del renderer senza incorrere
nelle restrizioni di `file://` (bloccato dalla CSP del renderer Electron) è
registrato un protocollo custom **`bt-media://`** in `electron/main.ts`.

Mappatura URL → filesystem:

```
bt-media:///C:/path/to/video.mp4  →  C:\path\to\video.mp4
```

Implementazione:

```typescript
// 1. Registrazione PRIMA di app.whenReady() con i privileges necessari
protocol.registerSchemesAsPrivileged([
  { scheme: 'bt-media', privileges: {
      standard: true, secure: true,
      supportFetchAPI: true, stream: true, bypassCSP: true,
  }},
]);

// 2. Handler DOPO app.whenReady()
protocol.handle('bt-media', (request) => {
  const url = new URL(request.url);
  const filePath = decodeURIComponent(url.pathname.replace(/^\//, ''));
  return net.fetch(pathToFileURL(filePath).toString());
});
```

`stream: true` è essenziale perché il tag `<video>` invia richieste Range per
lo streaming progressivo del file.

Il renderer costruisce gli URL con:

```typescript
const mediaUrl = `bt-media:///${encodeURI(clip.filePath.replace(/\\/g, '/'))}`;
```
