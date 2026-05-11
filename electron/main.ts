import { app, BrowserWindow, ipcMain, dialog, protocol, net } from 'electron';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { IPC } from './models/ipc-channels';

const isDev = !app.isPackaged;

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
    const url = new URL(request.url);
    const filePath = decodeURIComponent(url.pathname.replace(/^\//, ''));
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- IPC Handlers ---

ipcMain.handle(IPC.FILE.OPEN_DIALOG, async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'avi', 'mkv'] }],
  });
  return result.canceled ? [] : result.filePaths;
});

ipcMain.handle(IPC.PROJECT.SAVE, async (_event, _data: unknown) => {
  // TODO: M2 — implementare salvataggio .btproject
});

ipcMain.handle(IPC.PROJECT.LOAD, async () => {
  // TODO: M2 — implementare caricamento .btproject
});
