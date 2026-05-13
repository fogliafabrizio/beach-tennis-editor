# Milestone di sviluppo

Sviluppare **in questo ordine**. Non passare alla milestone successiva senza che la precedente funzioni.

## M1 — Scaffolding ✅
- [x] Setup progetto Electron 42 + Angular 21 (zoneless, standalone, SCSS)
- [x] Build pipeline funzionante — `npm run build` genera `dist/renderer/` e `dist/electron/`
- [x] Jest 30 + jest-preset-angular 16 configurati — 2 test passano
- [x] ESLint (angular-eslint 21) + Prettier configurati — 0 errori
- [x] electron-builder configurato per Windows NSIS installer
- [x] CI workflow `.github/workflows/ci.yml` (lint + test su PR)
- [x] Commit iniziale su branch `develop`
- [x] GitHub repo remoto + branch protection (da fare manualmente)

## M2 — Video Player + Timeline base ✅
- [x] Import video da filesystem (dialog)
- [x] Integrazione PrimeNG 21 (tema Aura dark, token CSS, p-button)
- [x] Player con play/pause/seek
- [x] Timeline con clip visualizzate
- [x] Nessun processing FFmpeg ancora

## M2.5 — Editor UX Redesign ✅
- [x] Project home screen con griglia progetti recenti
- [x] Dialog "Nuovo progetto" (nome + percorso salvataggio)
- [x] Apertura progetto da file dialog o da recenti
- [x] Salvataggio progetto (`.btproject` JSON)
- [x] Nuovi modelli: `BtProject`, `ExportSettings`, `RecentProject` (`src/shared/models/project.ts`)
- [x] `VideoClip` esteso con `color`, `width`, `height`
- [x] `LibraryService`: auto-color import, `reorderClips`, `updateClipTrim`, `loadClips`
- [x] `ProjectService`: create/save/load/recent projects
- [x] Layout editor 3 pannelli: sidebar (clip library + export) | video player | timeline (basso)
- [x] Clip library: color dot, bottone × rimuovi, import integrato
- [x] Timeline: drag-to-reorder (HTML5 native), trim handles (← →), zoom (mouse wheel + ±), time ruler
- [x] Export settings panel: output path, formato MP4, risoluzione, fps, "Usa originale prima clip"
- [x] IPC channels: file dialogs progetto/output, project CRUD, recent list, ffprobe stub
- [x] Electron main: handlers completi per tutti i nuovi canali IPC

## M3 — Score Engine
- [ ] Modelli di dominio completi (vedi [domain-models.md](domain-models.md))
- [ ] `ScoreService` con logica punteggio BT (tutti i formati)
- [ ] Unit test completi per `ScoreService`
- [ ] UI per configurare il formato della partita (team names, format)
- [ ] Migrazione `BtProject` da M2.5 (clips dirette) a M3 (dentro `Match`)

## M4 — Score Keyer
- [ ] Controlli keyer (click + tastiera)
- [ ] Creazione `ScoreEvent` ancorato al timestamp
- [ ] Visualizzazione marker sulla timeline (seconda traccia)
- [ ] Undo/redo (stack in memoria, ultimi 20 eventi)

## M5 — Overlay Preview
- [ ] Rendering overlay live nella preview del player
- [ ] Rendering overlay dettagliato sulle pause
- [ ] Selezione template
- [ ] Decisione approccio FFmpeg per export (PNG vs drawtext)

## M6 — FFmpeg Export
- [ ] Aggiungere `ffmpeg-static` come dipendenza
- [ ] `ffmpeg:probe` IPC con ffprobe reale (width, height, fps, codec) — sostituisce lo stub
- [ ] Merge clip con FFmpeg
- [ ] Renderizzazione overlay sul video finale
- [ ] Progress bar export
- [ ] Output file sul filesystem

## M7 — Polish
- [ ] Gestione errori e edge case
- [ ] Set interrotto / partita incompleta
- [ ] Performance su video lunghi
- [ ] Shortcut tastiera complete (Ctrl+S salva, ecc.)
- [ ] Installer Windows (.exe)
