# Modelli di dominio

## Match
```typescript
interface Match {
  id: string;
  teams: [Team, Team];
  format: MatchFormat;
  sets: SetScore[];          // set giocati / in corso (NON i SetFormat di config)
  clips: VideoClip[];
  scoreEvents: ScoreEvent[];
  servingTeam: 0 | 1;        // chi serve all'inizio della partita (set 0, game 0)
  createdAt: string;         // ISO 8601 (serializzabile in .btproject)
}
```

> `sets` è la sequenza degli **stati di set** (giocati/in corso), tipizzata come
> [`SetScore[]`](#scoresnapshot). La **configurazione** dei set vive invece in
> `MatchFormat.sets: SetFormat[]`. (PR1 di M3 ha corretto un precedente refuso che
> tipizzava `sets: Set[]`.)

## Team e Player
```typescript
interface Team {
  id: string;
  players: Player[];         // 1 in singolo, 2 in doppio
  displayName: string;       // es. "FOGLIA / ROSSI" — libero, impostato dall'utente
  color: string;             // hex, usato nell'overlay
}

interface Player {
  displayName: string;       // es. "FOGLIA"
}
```

## MatchFormat
```typescript
interface MatchFormat {
  type: 'singles' | 'doubles';
  setsToWin: number;         // es. 2
  sets: SetFormat[];         // un SetFormat per ogni set possibile
}

interface SetFormat {
  targetGames: number;       // es. 6, 9, 4
  tiebreakAt: number;        // tiebreak scatta a tiebreakAt-tiebreakAt
  preBreakTarget: number;    // a (tiebreakAt-1)-(tiebreakAt-1) si gioca fino qui
  tiebreakFormat: TiebreakFormat;
}

interface TiebreakFormat {
  target: number;            // primo a N punti
  minAdvantage: number;      // con almeno N di vantaggio (di solito 2)
}
```

Esempio standard BT (2 set + long tie):
```typescript
const standardBT: MatchFormat = {
  type: 'doubles',
  setsToWin: 2,
  sets: [
    { targetGames: 6, tiebreakAt: 6, preBreakTarget: 7, tiebreakFormat: { target: 7,  minAdvantage: 2 } },
    { targetGames: 6, tiebreakAt: 6, preBreakTarget: 7, tiebreakFormat: { target: 7,  minAdvantage: 2 } },
    { targetGames: 1, tiebreakAt: 0, preBreakTarget: 0, tiebreakFormat: { target: 10, minAdvantage: 2 } },
  ]
};
```

I preset usati dall'app vivono in `src/shared/models/match-formats.ts`:

- `STANDARD_BT_FORMAT` — 2 set a 6 + super tiebreak a 10 (l'esempio sopra)
- `SET_9_FORMAT` — 2 set a 9 + super tiebreak a 10
- `LONG_TIE_ONLY_FORMAT` — partita risolta da un solo super tiebreak a 10

Un **long-tie set** è un set in cui `targetGames: 1, tiebreakAt: 0`: tutto il set
è tiebreak fin dal primo punto (utile per il terzo set decisivo).

## VideoClip
```typescript
interface VideoClip {
  id: string;
  filePath: string;          // path assoluto originale — mai copiato nel progetto
  durationMs: number;        // durata totale del file originale
  trimStartMs: number;       // 0 se non trimmato
  trimEndMs: number;         // uguale a durationMs se non trimmato
  orderIndex: number;        // posizione nella sequenza video finale
  color: string;             // hex auto-assegnato dalla palette (es. '#4A9EFF')
  width: number;             // larghezza in pixel, 0 se non disponibile
  height: number;            // altezza in pixel, 0 se non disponibile
}
```

> `color` è assegnato in modo ciclico su una palette di 8 colori (`CLIP_COLORS` in `library.service.ts`)
> durante l'import. Viene usato nella clip library (pallino) e come bordo sinistro nella timeline.

> `width` e `height` vengono letti dall'elemento `<video>` HTML5 durante l'import via
> `readVideoMetadata`. In ambienti test (jsdom) risultano 0.

> Timestamp assoluto nel video montato:
> `sum(clips[0..i-1].effectiveDuration) + offsetInClip`
> dove `effectiveDuration = trimEndMs - trimStartMs`

## ScoreEvent
```typescript
interface ScoreEvent {
  id: string;
  timestampMs: number;       // timestamp assoluto nel video finale montato
  scorer: 0 | 1;             // indice della squadra che ha segnato
  scoreSnapshot: ScoreSnapshot;
  overlayType: 'live' | 'detail';
  overlayDurationMs?: number; // solo per 'detail' (default: 3000)
}
```

## ScoreSnapshot
```typescript
interface ScoreSnapshot {
  sets: SetScore[];
  currentSet: number;                // indice del set in corso in `Match.format.sets`
  currentGame: [number, number];     // game vinti dai due team nel set corrente
  currentPoint: [string, string];    // SEMPRE stringhe (anche in tiebreak)
  servingTeam: 0 | 1;                // chi serve il PROSSIMO punto
  isTiebreak: boolean;
  matchWinner?: 0 | 1;               // presente solo se la partita è conclusa
}

interface SetScore {
  games: [number, number];
  winner?: 0 | 1;
  isTiebreak: boolean;
  servingTeamOverride?: 0 | 1;       // forza chi serve l'inizio di questo set
                                     // (eccezione rispetto all'alternanza standard)
}
```

`currentPoint` è sempre `[string, string]`:

- **Nel game** (no-ad BT): `'0' | '15' | '30' | '40'`. A `['40', '40']` si gioca un
  punto secco: il vincitore di quel punto vince il game (mai "A"/"vantaggio").
- **Nel tiebreak**: stringa del numero corrente (`'0'`, `'1'`, `'2'`, …, `'7+'`).

Uniformare il tipo a `string` rende immediato il render dell'overlay; la logica
numerica usa indici interni.

**servingTeamOverride** è un'eccezione rispetto alla regola "alterna chi ha servito
l'ultimo game del set precedente": il torneo può prescrivere che un certo set
inizi con un team specifico. L'utente può impostare l'override dal dialog
configurazione (PR4) o lasciandolo `undefined` (alternanza automatica).

## BtProject (file di salvataggio sessione)

**Formato M2.5 (legacy)** — senza Match/Score:
```typescript
interface BtProject {
  version: string;           // "2.5"
  projectName: string;
  projectFilePath: string;
  clips: VideoClip[];        // top-level
  exportSettings: ExportSettings;
  savedAt: string;           // ISO 8601
}
```

**Formato M3 (target)** — `version: "3.0"`, container `Match` al posto di `clips`
top-level:
```typescript
interface BtProject {
  version: string;           // "3.0"
  projectName: string;
  projectFilePath: string;
  match: Match;              // include clips, teams, scoreEvents
  exportSettings: ExportSettings;
  savedAt: string;
}
```

**Transizione PR1 → PR3 di M3.** In PR1 il type ha `match?: Match` (opzionale) e
mantiene `clips` top-level: nessuna modifica runtime. In PR3 `match` diventa
required, `clips` top-level viene rimosso e il loader migra silenziosamente i
file v2.5 (auto-popolamento di `match` con team placeholder + `STANDARD_BT_FORMAT`).

```typescript
type VideoFormat = 'mp4' | 'mov';

interface ExportSettings {
  outputPath: string;        // path assoluto del file video esportato
  overlayTemplateId: string; // ID template overlay (M5)
  format: VideoFormat;       // default 'mp4'
  width: number;             // default da prima clip o 1920
  height: number;            // default da prima clip o 1080
  frameRate: number;         // default 30 (rilevamento ffprobe in M6)
}
```

## RecentProject (indice dei progetti recenti)
```typescript
interface RecentProject {
  name: string;
  filePath: string;          // path assoluto del .btproject
  savedAt: string;           // ISO 8601
}
```

Salvato in `app.getPath('userData')/recent-projects.json` (max 10 voci, LIFO).
