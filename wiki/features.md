# Feature spec

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
- Un video lungo da cui tagliare le parti non necessarie

**Export (M6):**
- Merge delle clip con FFmpeg
- Overlay del punteggio renderizzato sul video finale
- Progress bar durante l'elaborazione
- Output salvato sul filesystem nel path scelto dall'utente
