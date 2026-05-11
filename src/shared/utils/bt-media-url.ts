// Schema URL per il protocollo `bt-media://`:
//
//   Windows  C:\Users\foo\clip.mp4   →  bt-media://local/C/Users/foo/clip.mp4
//   Unix     /home/foo/clip.mp4      →  bt-media://local/home/foo/clip.mp4
//
// Il drive letter Windows viene reso come primo segmento del path (senza i due
// punti) per due motivi:
//   1. evita che Chromium interpreti `C:` come `host:port`;
//   2. evita di mettere `%3A` nel pathname, che fa scattare l'"URL safety check"
//      di Blink e fa fallire il `<video>` con `MediaError code=4`.
//
// Vedi `electron/main.ts` per la decodifica.

export function buildBtMediaUrl(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');

  const driveMatch = normalized.match(/^([A-Za-z]):(\/.*)?$/);
  let pathSegments: string[];

  if (driveMatch) {
    const drive = driveMatch[1].toUpperCase();
    const rest = driveMatch[2] ?? '/';
    pathSegments = [drive, ...rest.split('/').filter((s) => s !== '')];
  } else {
    pathSegments = normalized.split('/').filter((s) => s !== '');
  }

  const encodedPath = pathSegments.map((s) => encodeURIComponent(s)).join('/');
  return `bt-media://local/${encodedPath}`;
}
