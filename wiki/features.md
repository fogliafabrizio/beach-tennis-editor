# Feature spec

## Project Home Screen

Schermata di atterraggio mostrata ad ogni avvio dell'applicazione.

**Comportamento:**
- Mostra griglia di progetti recenti (max 10, LIFO) con nome e data
- Bottone "Nuovo progetto" → dialog con nome + percorso salvataggio → apre l'editor
- Bottone "Apri progetto" → file dialog filtro `.btproject` → apre l'editor
- Doppio click su progetto recente → apre l'editor
- Lista recenti salvata in `app.getPath('userData')/recent-projects.json`

---

## Video Editor (M2.5)

### Layout 3 pannelli
```
┌─────────────────────────────────────────────────────────┐
│  [logo]  NomeProgetto                          [Salva]  │ ← 48px header
├──────────────────┬──────────────────────────────────────┤
│  CLIP LIBRARY    │  VIDEO PLAYER                        │
│  [+ Importa]     │  [video]                             │ ← flex 1
│  ● clip1.mp4  ×  │  ▶ 0:23 / 1:47  ════════════════════ │
│  ● clip2.mp4  ×  │                                      │
│  ──────────────  │                                      │
│  ESPORTAZIONE ▼  │                                      │
│  [settings...]   │                                      │
├──────────────────┴──────────────────────────────────────┤
│  [−] 1× [+]  ┆ 0:00       0:30        1:00       1:30  │ ← 180px timeline
│  ░░░ CLIP1 ░ ┆ ░░░░░░░ CLIP2 ░░░░░   ░░░ CLIP3 ░░░░░  │
└─────────────────────────────────────────────────────────┘
```

### Clip Library
- Importa video (mp4, mov, avi, mkv)
- Ogni clip mostra: pallino colorato (auto-assegnato), nome file, durata, bottone × rimuovi
- Pallino × visibile on hover
- Colori da palette di 8 (#4A9EFF, #FF6B6B, #51CF66, #FFD43B, #CC5DE8, #FF922B, #20C997, #74C0FC)

### Timeline dinamica
- **Drag-to-reorder**: trascina un blocco clip in una nuova posizione → aggiorna `orderIndex`
- **Trim handles**: hover su clip → appaiono handle sinistro/destro → trascina per modificare `trimStartMs`/`trimEndMs`
  - Vincoli: `trimEndMs - trimStartMs >= 1000ms`
- **Zoom**: mouse wheel sulla timeline oppure bottoni [−]/[+] nella toolbar (1× → 20×, step 0.5)
- **Time ruler**: timecodes proporzionali, intervalli auto-adattati al livello zoom
- Blocchi colorati con il colore della clip (bordo sinistro)

### Export Settings Panel
Pannello collassabile nella sidebar sotto la clip library.
- Percorso output (browser file dialog)
- Formato video: MP4 (altri formati in M6)
- Risoluzione: larghezza × altezza (px)
- Frame rate (fps)
- "Usa originale prima clip" → legge `width`/`height` dalla prima clip importata
- Bottone "Esporta video" disabilitato fino a M6

---

## Score Keyer

Il cuore dell'applicazione. Crea `ScoreEvent` ancorati al timestamp del video.

**Regole di implementazione:**
1. Il video player è **sempre visibile** durante il keying
2. Shortcut tastiera: `1` = punto squadra 1, `2` = punto squadra 2, `Z` = undo
3. Alla pressione → crea `ScoreEvent` al `currentTimeMs` del player
4. Il punteggio viene ricalcolato in tempo reale nell'UI
5. Gli eventi sono **modificabili e cancellabili** dalla timeline
6. Undo disponibile per almeno gli ultimi 20 eventi (stack in memoria, non persistito)

---

## Overlay

Due modalità, selezionabili per template.

### Live (sempre visibile durante il gioco)
- Compatto, posizionabile (default: angolo in alto a sinistra)
- Mostra: nomi squadre, punteggio set, game corrente, chi serve
- Esempio: `FOGLIA/ROSSI  6 3 40 ● | BIANCHI/NERI 4 2 15`

### Detail (sulle pause, tra un punto e l'altro)
- Appare automaticamente dopo ogni `ScoreEvent`
- Durata configurabile (default: 3 secondi — `overlayDurationMs`)
- Mostra: tutti i set giocati, game corrente, punteggio punto
- Layout più grande, posizione prominente

### Template system
Ogni template è un file JSON in `assets/score-templates/` che descrive:
- `position`: coordinate e ancoraggi dell'overlay
- `colors`: colori di sfondo, testo, accent per squadra
- `font`: famiglia, dimensione, peso
- `overlayTypes`: quali overlay mostra (`live`, `detail`, o entrambi)
- `animation`: fade-in/out (durata in ms)

L'approccio di rendering FFmpeg per il video finale è da decidere in M5/M6
(candidati: PNG pre-renderizzati via Chromium headless, oppure filtri `drawtext`/`overlay` nativi).

---

## Import / Export video

**Import:** l'utente può importare:
- Un singolo video della partita
- Più clip da concatenare (es. set1.mp4, set2.mp4)
- Un video lungo da cui tagliare le parti non necessarie (tramite trim handles)

**Export (M6):**
- Impostazioni: risoluzione, formato (MP4), frame rate
- Merge delle clip con FFmpeg (con trim applicato)
- Overlay del punteggio renderizzato sul video finale
- Progress bar durante l'elaborazione
- Output salvato sul filesystem nel path scelto dall'utente
