# Milestone di sviluppo

Sviluppare **in questo ordine**. Non passare alla milestone successiva senza che la precedente funzioni.

## M1 — Scaffolding
- [ ] Setup progetto Electron + Angular
- [ ] Build pipeline funzionante (dev + prod) — packager: **electron-builder**
- [ ] ESLint + Prettier configurati
- [ ] GitHub repo creato da zero, branch protection su `main` e `develop`

## M2 — Video Player + Timeline base
- [ ] Import video da filesystem (dialog)
- [ ] Player con play/pause/seek
- [ ] Timeline con clip visualizzate
- [ ] Nessun processing FFmpeg ancora

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
