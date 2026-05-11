# Beach Tennis Editor

Applicazione desktop per Windows (Electron + Angular) per editare video di partite di Beach Tennis.
Permette di unire/tagliare spezzoni video, segnare il punteggio con un click sul momento esatto della timeline,
e sovrapporre graficamente il punteggio al video esportato.

## Stack

- **Electron 42** — desktop shell (main process)
- **Angular 21** zoneless, standalone components, Signals (renderer process)
- **TypeScript** strict mode
- **FFmpeg** bundled via `ffmpeg-static` (per il merge/export in M6)
- **Jest** + `jest-preset-angular` (unit test)
- **ESLint** + **Prettier**
- **electron-builder** per installer Windows NSIS

## Setup

```bash
npm install
```

## Script disponibili

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia Angular dev server + Electron in modalità sviluppo |
| `npm run build` | Build produzione: `dist/renderer/` (Angular) e `dist/electron/` (main) |
| `npm run build:renderer` | Solo build Angular |
| `npm run build:electron` | Solo compilazione TypeScript del main process |
| `npm test` | Esegue gli unit test Jest |
| `npm run lint` | ESLint su `.ts` e `.html` |
| `npm run dist` | Pacchettizza l'app come installer Windows `.exe` (NSIS) |

## Struttura

```
beach-tennis-editor/
├── electron/      # Main process (Node.js)
├── src/           # Angular renderer
├── assets/        # Asset statici (score templates)
├── wiki/          # Documentazione di dettaglio
└── CLAUDE.md      # Guida per Claude Code
```

## Documentazione

- [`CLAUDE.md`](CLAUDE.md) — fonte di verità per architettura, regole di codice, stack
- [`wiki/`](wiki/) — documentazione tecnica dettagliata
  - [`wiki/milestones.md`](wiki/milestones.md) — roadmap M1→M7
  - [`wiki/domain-models.md`](wiki/domain-models.md) — modelli TypeScript
  - [`wiki/score-logic.md`](wiki/score-logic.md) — regole punteggio Beach Tennis
  - [`wiki/features.md`](wiki/features.md) — specifiche feature
  - [`wiki/ipc-architecture.md`](wiki/ipc-architecture.md) — canali IPC Electron
  - [`wiki/branching.md`](wiki/branching.md) — Git strategy
