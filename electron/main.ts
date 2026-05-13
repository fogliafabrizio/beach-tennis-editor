import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { IPC } from './models/ipc-channels';

const isDev = !app.isPackaged;

const RECENT_PROJECTS_FILE = () => path.join(app.getPath('userData'), 'recent-projects.json');
const MAX_RECENT = 10;

// Il protocollo `bt-media://` serve file video locali al renderer evitando
// le restrizioni CSP/CORS di `file://`. Va dichiarato PRIMA di app.whenReady().
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'bt-media',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      stream: true,
      bypassCSP: true,
    },
  },
]);

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Il preload importa moduli utente (es. `./models/ipc-channels`):
      // con sandbox=true (default in Electron 42) il require di file utente
      // viene bloccato e contextBridge non viene mai esposto al renderer.
      // `contextIsolation:true` + `nodeIntegration:false` proteggono comunque
      // dall'esecuzione di codice non autorizzato nel renderer.
      sandbox: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/browser/index.html'));
  }
}

app.whenReady().then(() => {
  protocol.handle('bt-media', (request) => {
    // Schema URL: bt-media://local/<drive>/<rest...> (Windows) o
    //             bt-media://local/<rest...>          (Unix).
    // Vedi `src/shared/utils/bt-media-url.ts`.
    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter((s) => s !== '').map(decodeURIComponent);

    let filePath: string;
    if (process.platform === 'win32' && segments.length > 0 && /^[A-Za-z]$/.test(segments[0])) {
      const drive = segments[0].toUpperCase();
      const rest = segments.slice(1).join('\\');
      filePath = `${drive}:\\${rest}`;
    } else {
      filePath = '/' + segments.join('/');
    }

    // Inoltrare method + headers (in particolare `Range`) è obbligatorio:
    // il `<video>` HTML5 fa richieste parziali per streamare oltre il primo
    // chunk; senza il forwarding, `net.fetch` risponde sempre 200 con i primi
    // byte e il media decoder si blocca dopo il primo frame.
    return net.fetch(pathToFileURL(filePath).toString(), {
      method: request.method,
      headers: request.headers,
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- Utility: recent projects ---

interface RecentEntry {
  name: string;
  filePath: string;
  savedAt: string;
}

async function readRecentProjects(): Promise<RecentEntry[]> {
  try {
    const raw = await fs.readFile(RECENT_PROJECTS_FILE(), 'utf-8');
    return JSON.parse(raw) as RecentEntry[];
  } catch {
    return [];
  }
}

async function writeRecentProjects(entries: RecentEntry[]): Promise<void> {
  await fs.writeFile(RECENT_PROJECTS_FILE(), JSON.stringify(entries, null, 2), 'utf-8');
}

async function upsertRecent(entry: RecentEntry): Promise<void> {
  const existing = await readRecentProjects();
  const filtered = existing.filter((e) => e.filePath !== entry.filePath);
  const updated = [entry, ...filtered].slice(0, MAX_RECENT);
  await writeRecentProjects(updated);
}

// --- IPC Handlers ---

ipcMain.handle(IPC.FILE.OPEN_DIALOG, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle(IPC.FILE.OPEN_DIALOG_PROJECT, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Beach Tennis Project', extensions: ['btproject'] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(IPC.FILE.SAVE_DIALOG_PROJECT, async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Beach Tennis Project', extensions: ['btproject'] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle(IPC.FILE.SAVE_DIALOG_OUTPUT, async (_event, defaultName: string) => {
  const result = await dialog.showSaveDialog({
    defaultPath: defaultName,
    filters: [{ name: 'Video MP4', extensions: ['mp4'] }],
  });
  return result.canceled ? null : result.filePath;
});

ipcMain.handle(IPC.PROJECT.LIST_RECENT, async () => {
  return readRecentProjects();
});

ipcMain.handle(IPC.PROJECT.ADD_RECENT, async (_event, entry: RecentEntry) => {
  await upsertRecent(entry);
});

ipcMain.handle(IPC.PROJECT.NEW, async (_event, name: string, filePath: string) => {
  const project = {
    version: '2.5',
    projectName: name,
    projectFilePath: filePath,
    clips: [],
    exportSettings: {
      outputPath: '',
      overlayTemplateId: '',
      format: 'mp4',
      width: 1920,
      height: 1080,
      frameRate: 30,
    },
    savedAt: new Date().toISOString(),
  };
  await fs.writeFile(filePath, JSON.stringify(project, null, 2), 'utf-8');
  await upsertRecent({ name, filePath, savedAt: project.savedAt });
  return project;
});

ipcMain.handle(IPC.PROJECT.SAVE, async (_event, data: unknown) => {
  const project = data as { projectFilePath: string; projectName: string; savedAt: string };
  const updated = { ...(project as object), savedAt: new Date().toISOString() };
  await fs.writeFile(
    project.projectFilePath,
    JSON.stringify(updated, null, 2),
    'utf-8'
  );
  await upsertRecent({
    name: project.projectName,
    filePath: project.projectFilePath,
    savedAt: (updated as { savedAt: string }).savedAt,
  });
});

ipcMain.handle(IPC.PROJECT.LOAD, async (_event, filePath: string) => {
  const raw = await fs.readFile(filePath, 'utf-8');
  const project = JSON.parse(raw);
  // Aggiorna il campo projectFilePath in caso il file sia stato spostato
  project.projectFilePath = filePath;
  await upsertRecent({
    name: project.projectName,
    filePath,
    savedAt: project.savedAt,
  });
  return project;
});

// FFMPEG.PROBE: TODO M6 — usa ffmpeg-static per estrarre metadati video reali.
// Per ora il renderer ottiene width/height dall'elemento <video> HTML5.
ipcMain.handle(IPC.FFMPEG.PROBE, async (_event, _filePath: string) => {
  return null;
});
