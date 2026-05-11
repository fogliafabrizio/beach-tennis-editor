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

## M2 — Video Player + Timeline base
- [x] Import video da filesystem (dialog)
- [x] Integrazione PrimeNG 21 (tema Aura dark, token CSS, p-button)
- [x] Player con play/pause/seek
- [x] Timeline con clip visualizzate
- [x] Nessun processing FFmpeg ancora

## M3 — Score Engine
- [ ] Modelli di dominio completi (vedi [domain-models.md](domain-models.md))
- [ ] `ScoreService` con logica punteggio BT (tutti i formati)
- [ ] Unit test completi per `ScoreService`
- [ ] UI per configurare il formato della partita

## M4 — Score Keyer
- [ ] Controlli keyer (click + tastiera)
- [ ] Creazione `ScoreEvent` ancorato al timestamp
- [ ] Visualizzazione marker sulla timeline
- [ ] Undo/redo (stack in memoria, ultimi 20 eventi)

## M5 — Overlay Preview
- [ ] Rendering overlay live nella preview del player
- [ ] Rendering overlay dettagliato sulle pause
- [ ] Selezione template
- [ ] Decisione approccio FFmpeg per export (PNG vs drawtext)

## M6 — FFmpeg Export
- [ ] Merge clip con FFmpeg
- [ ] Renderizzazione overlay sul video finale
- [ ] Progress bar export
- [ ] Output file sul filesystem

## M7 — Polish
- [ ] Gestione errori e edge case
- [ ] Set interrotto / partita incompleta
- [ ] Performance su video lunghi
- [ ] Shortcut tastiera complete
- [ ] Installer Windows (.exe)
