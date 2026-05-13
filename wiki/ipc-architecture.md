# IPC Architecture (Electron)

Tutta la comunicazione renderer → main avviene tramite canali IPC tipizzati.
**Non esporre mai Node APIs direttamente al renderer** — tutto passa dal preload.

## Canali definiti

```typescript
// electron/models/ipc-channels.ts
export const IPC = {
  FILE: {
    OPEN_DIALOG:         'file:open-dialog',          // apre dialog video
    READ:                'file:read',
    OPEN_DIALOG_PROJECT: 'file:open-dialog-project',  // apre dialog .btproject
    SAVE_DIALOG_PROJECT: 'file:save-dialog-project',  // salva dialog .btproject
    SAVE_DIALOG_OUTPUT:  'file:save-dialog-output',   // salva dialog video output
  },
  FFMPEG: {
    MERGE:    'ffmpeg:merge',
    CUT:      'ffmpeg:cut',
    EXPORT:   'ffmpeg:export',
    PROGRESS: 'ffmpeg:progress', // evento main → renderer (push)
    PROBE:    'ffmpeg:probe',    // → VideoProbeResult | null (stub fino a M6)
  },
  PROJECT: {
    SAVE:        'project:save',
    LOAD:        'project:load',        // riceve filePath, restituisce BtProject
    NEW:         'project:new',         // riceve (name, filePath), crea file e restituisce BtProject
    LIST_RECENT: 'project:list-recent', // restituisce RecentProject[]
    ADD_RECENT:  'project:add-recent',  // aggiunge/aggiorna voce in recent-projects.json
  },
} as const;
```

### Comportamento canali PROJECT

| Canale | Payload | Risposta |
|---|---|---|
| `project:new` | `(name: string, filePath: string)` | `BtProject` (vuoto, scritto su disco) |
| `project:save` | `BtProject` completo | `void` (sovrascrive il file, aggiorna recenti) |
| `project:load` | `filePath: string` | `BtProject` (letto da disco, aggiorna recenti) |
| `project:list-recent` | — | `RecentProject[]` (max 10, LIFO) |
| `project:add-recent` | `RecentEntry` | `void` |

I recenti sono salvati in `app.getPath('userData')/recent-projects.json`.

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

## Sandbox del renderer

`webPreferences.sandbox = false` in [`electron/main.ts`](../electron/main.ts).

Motivazione: il preload importa file utente (es. `./models/ipc-channels`) per evitare
magic string. In sandbox mode (default in Electron 20+) il preload può fare `require`
solo di un sotto-insieme limitato di moduli (`electron`, `events`, `timers`, `url`):
qualsiasi import di file relativi fa fallire silenziosamente il preload e
`window.electronAPI` non viene mai esposto al renderer.

`contextIsolation: true` e `nodeIntegration: false` rimangono attivi: il renderer
non ha comunque accesso diretto né a Node né al global del preload.

## Protocollo `bt-media://`

Per riprodurre file video locali nel `<video>` HTML5 del renderer senza incorrere
nelle restrizioni di `file://` (bloccato dalla CSP del renderer Electron) è
registrato un protocollo custom **`bt-media://`** in `electron/main.ts`.

Mappatura URL → filesystem. Il drive letter Windows viene reso come **primo
segmento del path** (senza i due punti) per due motivi:

1. evita che Chromium interpreti `C:` come `host:port` (risulterebbe
   `bt-media://c/...`);
2. evita di mettere `%3A` nel pathname, che fa scattare l'"URL safety check"
   di Blink e fa fallire il `<video>` con `MediaError code=4`.

```
bt-media://local/C/path/to/video.mp4  →  C:\path\to\video.mp4
bt-media://local/home/foo/clip.mp4    →  /home/foo/clip.mp4
```

`local` è un hostname fittizio che rende l'URL esplicitamente standard
(scheme://authority/path) senza ambiguità.

Implementazione:

```typescript
// 1. Registrazione PRIMA di app.whenReady() con i privileges necessari
protocol.registerSchemesAsPrivileged([
  { scheme: 'bt-media', privileges: {
      standard: true, secure: true,
      supportFetchAPI: true, stream: true, bypassCSP: true,
  }},
]);

// 2. Handler DOPO app.whenReady() — ricostruisce il path dai segmenti
protocol.handle('bt-media', (request) => {
  const url = new URL(request.url);
  const segments = url.pathname.split('/').filter((s) => s !== '').map(decodeURIComponent);
  let filePath: string;
  if (process.platform === 'win32' && /^[A-Za-z]$/.test(segments[0] ?? '')) {
    filePath = `${segments[0].toUpperCase()}:\\${segments.slice(1).join('\\')}`;
  } else {
    filePath = '/' + segments.join('/');
  }
  return net.fetch(pathToFileURL(filePath).toString());
});
```

`stream: true` è essenziale perché il tag `<video>` invia richieste Range per
lo streaming progressivo del file.

Il renderer costruisce gli URL tramite [`buildBtMediaUrl`](../src/shared/utils/bt-media-url.ts),
che oltre a `encodeURI` encoda esplicitamente `:`, `?` e `#` (caratteri che il
parser URL standard tratterebbe rispettivamente come separatore host/port,
query e fragment).
