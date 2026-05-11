# Bug tracker

Tracking dei bug noti non ancora risolti. I bug risolti vanno chiusi spostandoli in fondo (sezione "Risolti") con riferimento al commit/PR.

---

## 🟥 Aperti

### BUG-001 — Slider seek-bar: il playhead non segue il drag e torna a inizio clip

**Severità:** alta — blocca l'uso dell'editor (impossibile posizionarsi a metà clip in modo affidabile).

**File coinvolti:**
- [src/app/video-player/video-player.ts](../src/app/video-player/video-player.ts)
- [src/app/video-player/video-player.html](../src/app/video-player/video-player.html)
- [src/app/timeline/timeline.ts](../src/app/timeline/timeline.ts) (`playheadPct`)

**Sintomi osservati:**
- Trascinando lo slider sotto il player, il playhead non segue al secondo come dovrebbe.
- Dopo il drag, il video torna spesso a inizio clip invece di restare sul punto rilasciato.
- L'utente vuole poter posizionare il video a metà clip per: (a) riprendere la riproduzione da lì, (b) in futuro segnare un punto nello score keeper.

**Comportamento atteso:**
1. Mentre si trascina lo slider, la linea verticale (playhead) all'interno del blocco-clip nella timeline deve seguire il thumb in tempo reale.
2. L'anteprima video dovrebbe aggiornarsi (scrubbing) o almeno restare ferma sul frame del punto di rilascio.
3. Al rilascio dello slider, il video deve fermarsi sul punto esatto e da lì deve poter ripartire premendo play.

**Tentativi già effettuati (non risolutivi):**

1. **Pause-on-drag start + reorder di `seekToAbsoluteMs` prima di `isDragging.set(false)`** — pensavo fosse un "snap back" dovuto all'ordine delle operazioni in `onSliderEnd`. Insufficiente.
2. **Live scrub in `onSliderChange`** — chiamato `seekToAbsoluteMs(value)` ad ogni `onChange` del p-slider per aggiornare `currentTimeMs` + `<video>.currentTime` durante il drag. Non basta: l'utente ha riportato che il playhead non segue comunque.
3. **`(pointerdown)` come trigger affidabile di drag** — aggiunto sul `<p-slider>` per impostare `isDragging=true` immediatamente, senza dipendere da quando PrimeNG emette `onChange`. Aggiunto anche `@HostListener('document:pointerup')` come fallback per rilasci fuori dallo slider.
4. **Writable signal `sliderModelMs` + `effect` invece di `computed`** — `sliderValue` era un `computed` che leggeva `absolutePositionMs` ad ogni tick di playback; sostituito con un signal scrivibile aggiornato solo quando `!isDragging`.
5. **Fix collaterale `playheadPct` nella timeline** — usava `currentTimeMs / duration` invece di `(currentTimeMs - trimStartMs) / duration`. Per clip non rifilate era equivalente, per clip con trim ≠ 0 il playhead era sfalsato. Corretto, ma non era la causa principale.
6. **Rimozione del rewind a `trimStartMs` in `onTimeUpdate`** — al raggiungimento di `trimEndMs` il vecchio codice faceva `el.currentTime = clip.trimStartMs / 1000`, riportando il video a inizio clip. Ora pausa al confine senza rewindare. Probabilmente risolve solo lo scenario "torna a inizio dopo aver raggiunto la fine clip", non il problema del drag in sé.
7. **`pendingSeekMs` aggiornato anche nel branch "stessa clip"** in `seekToAbsoluteMs`, per evitare che un `onVideoLoaded` in ritardo (dopo un eventuale switch di clip nel mezzo del drag) sovrascriva la posizione corretta.

**Ipotesi non ancora verificate:**

- **PrimeNG 21 `p-slider` non emette `onChange` continuamente durante il drag.** Se emette solo all'`onSlideEnd`, il pattern "live scrub via onChange" non funziona affatto. Da verificare ispezionando il DOM e gli eventi emessi durante un drag reale.
- **Stop-propagation interno di PrimeNG sul `pointerdown`** — il listener `(pointerdown)` sul p-slider potrebbe non scattare se PrimeNG ferma la propagazione.
- **`[ngModel]` one-way con CVA del p-slider** — possibile interferenza tra `writeValue` chiamato da `[ngModel]="sliderModelMs()"` e l'update interno del thumb durante drag. Da provare con `(ngModelChange)` + tracking esplicito di drag.
- **`<video>.currentTime` durante drag rapidi** — settare currentTime ~60 Hz potrebbe causare coalescing/cancellazione lato browser. Throttle con `requestAnimationFrame` potrebbe aiutare.
- **`preload="metadata"` sul `<video>`** — durante uno scrub potrebbe non avere il frame buffferizzato e tornare al keyframe più vicino (che spesso è l'inizio clip).

**Prossimi passi suggeriti:**

1. Aggiungere logging temporaneo in `onSliderChange`, `onSliderEnd`, `onSliderPointerDown`, `onTimeUpdate`, `onVideoLoaded` per capire la sequenza reale degli eventi durante un drag dell'utente.
2. Verificare nel devtools se `onChange` del `p-slider` scatta durante mousemove o solo al release.
3. Se PrimeNG non supporta lo scrub continuo, considerare il rifacimento della seek-bar con eventi `pointer` nativi su un track custom (rispettando però la regola in `CLAUDE.md` di usare componenti PrimeNG dove possibile — confrontarsi con l'utente).
4. Provare `preload="auto"` sul `<video>` per migliorare la disponibilità dei frame durante lo scrubbing.

---

## ✅ Risolti

(Sposta qui i bug chiusi citando il commit/PR che li ha risolti.)
