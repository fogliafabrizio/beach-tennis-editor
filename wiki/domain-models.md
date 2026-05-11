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
}
```

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
```typescript
interface BtProject {
  version: string;           // es. "1.0"
  match: Match;
  exportSettings: ExportSettings;
  savedAt: string;           // ISO 8601
}

interface ExportSettings {
  outputPath: string;
  overlayTemplateId: string;
  resolution: '720p' | '1080p' | '4k';
}
```
