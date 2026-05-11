# Beach Tennis Editor — CLAUDE.md

Fonte di verità per Claude Code. Leggi tutto prima di toccare qualsiasi file.
La documentazione dettagliata vive nella cartella [`wiki/`](wiki/) — **aggiornala ad ogni decisione rilevante**.

---

## Descrizione del progetto

Applicazione **desktop per Windows** (Electron + Angular) per editare video di partite di Beach Tennis.
Permette di unire/tagliare spezzoni video, segnare il punteggio con un click sul momento esatto
della timeline, e sovrapporre graficamente il punteggio al video esportato.

---

## Stack tecnologico

| Layer | Tecnologia |
|---|---|
| Desktop shell | Electron 30+ |
| Frontend | Angular 18+ (standalone components, Signals) |
| Language | TypeScript (strict mode ovunque) |
| Video processing | FFmpeg (bundled via `ffmpeg-static`) |
| State management | Angular Signals + Services |
| Styling | SCSS + CSS custom properties |
| Linting | ESLint + Prettier |
| Testing | Jest (unit) |

---

## Struttura del progetto

```
beach-tennis-editor/
├── electron/               # Main process (Node.js)
│   ├── main.ts
│   ├── preload.ts
│   ├── services/
│   │   ├── ffmpeg.service.ts
│   │   └── file.service.ts
│   └── models/
│       └── ipc-channels.ts
├── src/                    # Angular app (Renderer process)
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── layout/
│   │   ├── timeline/
│   │   ├── video-player/
│   │   ├── score/
│   │   │   ├── score-keyer/
│   │   │   ├── score-overlay/
│   │   │   ├── score.model.ts
│   │   │   ├── score.service.ts
│   │   │   └── templates/
│   │   └── export/
│   └── shared/
├── assets/
│   └── score-templates/    # Template overlay JSON
├── wiki/                   # Documentazione dettagliata ← aggiorna qui
└── CLAUDE.md
```

---

## Wiki — indice

| File | Contenuto |
|---|---|
| [`wiki/domain-models.md`](wiki/domain-models.md) | Tutti i modelli TypeScript (Match, Team, VideoClip, ScoreEvent, BtProject…) |
| [`wiki/score-logic.md`](wiki/score-logic.md) | Regole punteggio BT, servizio, tiebreak |
| [`wiki/features.md`](wiki/features.md) | Spec Score Keyer, Overlay, Import/Export |
| [`wiki/ipc-architecture.md`](wiki/ipc-architecture.md) | Canali IPC Electron, flusso renderer ↔ main |
| [`wiki/milestones.md`](wiki/milestones.md) | Ordine sviluppo M1→M7 con checklist |
| [`wiki/branching.md`](wiki/branching.md) | Git strategy, PR rules, Conventional Commits |

---

## Regole di codice

- **TypeScript strict**: `noImplicitAny`, `strictNullChecks`, tutto tipizzato. No `any`, mai.
- **Standalone components**: nessun NgModule
- **Signals**: preferire Signals a BehaviorSubject per lo stato UI
- **Immutabilità**: i modelli non vengono mai mutati, si crea sempre una nuova istanza
- **No magic strings**: usare costanti o enum (vedi `ipc-channels.ts`)
- **Commenti**: solo dove il "perché" non è ovvio, mai il "cosa"
- **File naming**: `kebab-case.service.ts`, `kebab-case.component.ts`

---

## Setup

```bash
npm install
npm run dev      # Electron + Angular in dev mode
npm run test     # Jest unit test
npm run lint     # ESLint
npm run build    # Build produzione
npm run dist     # Package .exe Windows
```

---

## Note importanti

- FFmpeg è **bundled** (`ffmpeg-static`): nessuna installazione separata richiesta
- I video **non vengono mai copiati**: si lavora sempre sui path originali
- Lo stato sessione viene salvato in un file `.btproject` (JSON) — schema in [`wiki/domain-models.md`](wiki/domain-models.md)
- L'app non richiede connessione internet
