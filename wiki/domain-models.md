# Modelli di dominio

## Match
```typescript
interface Match {
  id: string;
  teams: [Team, Team];
  format: MatchFormat;
  sets: Set[];
  clips: VideoClip[];
  scoreEvents: ScoreEvent[];
  servingTeam: 0 | 1;        // chi serve all'inizio della partita
  createdAt: Date;
}
```

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
  currentSet: number;
  currentGame: [number, number];
  currentPoint: [string, string]; // es. ["40", "30"], ["40", "40"] = punto secco, tiebreak = ["6", "5"]
  servingTeam: 0 | 1;
  isTiebreak: boolean;
  matchWinner?: 0 | 1;       // presente solo se la partita è conclusa
}

interface SetScore {
  games: [number, number];
  winner?: 0 | 1;
  isTiebreak: boolean;
}
```

## BtProject (file di salvataggio sessione)

**Formato M2.5** (senza Match/Score — aggiunto in M3):
```typescript
interface BtProject {
  version: string;           // es. "2.5"
  projectName: string;       // nome del progetto (es. "Bucci - Rossi 11/05")
  projectFilePath: string;   // path assoluto del file .btproject su disco
  clips: VideoClip[];        // clip correnti (in M3 si sposteranno in Match.clips)
  exportSettings: ExportSettings;
  savedAt: string;           // ISO 8601
}

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

**Formato target M3+** (con Match):
```typescript
interface BtProject {
  version: string;
  projectName: string;
  projectFilePath: string;
  match: Match;              // include clips, teams, scoreEvents
  exportSettings: ExportSettings;
  savedAt: string;
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
