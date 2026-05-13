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
| UI components | PrimeNG 21+ (tema Aura dark, `darkModeSelector: '.dark'`) |
| Styling | SCSS + CSS custom properties (token PrimeNG `var(--p-*)`) |
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
│   │   ├── app.ts
│   │   ├── layout/
│   │   ├── project-home/       # Home screen + dialog nuovo progetto
│   │   ├── timeline/
│   │   ├── video-player/
│   │   ├── score/
│   │   │   ├── score-keyer/
│   │   │   ├── score-overlay/
│   │   │   ├── score.model.ts
│   │   │   ├── score.service.ts
│   │   │   └── templates/
│   │   └── export/
│   │       └── export-settings/  # Pannello impostazioni esportazione
│   └── shared/
│       ├── models/
│       │   ├── video-clip.ts
│       │   └── project.ts        # BtProject, ExportSettings, RecentProject
│       └── services/
│           ├── electron.service.ts
│           ├── library.service.ts
│           ├── player.service.ts
│           └── project.service.ts
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
| [`wiki/features.md`](wiki/features.md) | Spec Project Home, Video Editor, Score Keyer, Overlay, Import/Export |
| [`wiki/ipc-architecture.md`](wiki/ipc-architecture.md) | Canali IPC Electron, flusso renderer ↔ main |
| [`wiki/milestones.md`](wiki/milestones.md) | Ordine sviluppo M1→M7 con checklist |
| [`wiki/branching.md`](wiki/branching.md) | Git strategy, PR rules, Conventional Commits |
| [`wiki/bugs.md`](wiki/bugs.md) | Bug noti aperti e tentativi già effettuati |

---

## Regole di codice

- **TypeScript strict**: `noImplicitAny`, `strictNullChecks`, tutto tipizzato. No `any`, mai.
- **Standalone components**: nessun NgModule
- **Signals**: preferire Signals a BehaviorSubject per lo stato UI
- **Immutabilità**: i modelli non vengono mai mutati, si crea sempre una nuova istanza
- **No magic strings**: usare costanti o enum (vedi `ipc-channels.ts`)
- **Commenti**: solo dove il "perché" non è ovvio, mai il "cosa"
- **File naming**: `kebab-case.service.ts`, `kebab-case.component.ts`
- **PrimeNG**: usare componenti PrimeNG per tutti i controlli UI; evitare button/input/select nativi; usare sempre i token `var(--p-*)` nel CSS invece di colori hardcoded

---

## Setup

```bash
npm install
npm run dev      # Electron + Angular in dev mode (ricompila electron prima)
npm run test     # Jest unit test
npm run lint     # ESLint
npm run build    # Build produzione
npm run dist     # Package .exe Windows
```

---

## Smoke test pre-PR (regola)

**Prima di proporre il merge di una PR, Claude DEVE sempre:**

1. Verificare che `npm run lint` e `npm run test` siano verdi.
2. Avviare l'app con `npm run dev` quando la PR tocca codice runtime (UI, IPC, Electron, build).
3. Fornire all'utente una **lista di passi specifici di smoke test manuale** che coprano:
   - lo "golden path" della funzionalità appena aggiunta,
   - 2-3 edge case rilevanti (path con spazi/Unicode, dataset vuoto, input multi-elemento, ecc.),
   - regressioni plausibili nelle aree adiacenti.
4. **Attendere l'OK esplicito dell'utente** dopo lo smoke test prima di committare e aprire la PR.

I test unitari verificano la correttezza del codice, non quella della feature. Senza smoke test la PR non si propone.

---

## Allineamento lockfile (regola)

**Prima di ogni push (e prima di aprire/aggiornare una PR), Claude DEVE verificare che `package-lock.json` sia allineato con `package.json`.** La CI gira `npm install` (vedi `.github/workflows/ci.yml`) e un lockfile fuori sincrono fa fallire la build.

Procedura:

1. Se `package.json` è stato modificato (anche solo per un bump o per nuove dipendenze), **rigenerare il lockfile**:
   ```bash
   npm install --package-lock-only
   ```
2. Verificare con `git status` se `package-lock.json` risulta modificato; in tal caso **includerlo nello stesso commit** delle modifiche a `package.json`.
3. Mai pushare un commit che tocca `package.json` senza il corrispondente aggiornamento di `package-lock.json` nello stesso commit (o in uno precedente già pushato).

Nota: alcune dipendenze cross-platform di `unrs-resolver` (transitiva di ESLint) non vengono registrate nel lockfile generato su Windows. Per questo motivo la CI usa `npm install` anziché `npm ci`. Se in futuro si torna a `npm ci`, va prevista una soluzione esplicita per quelle optional deps.

---

## Note importanti

- FFmpeg è **bundled** (`ffmpeg-static`): nessuna installazione separata richiesta
- I video **non vengono mai copiati**: si lavora sempre sui path originali
- Lo stato sessione viene salvato in un file `.btproject` (JSON) — schema in [`wiki/domain-models.md`](wiki/domain-models.md)
- L'app non richiede connessione internet
