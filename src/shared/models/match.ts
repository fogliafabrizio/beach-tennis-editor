import type { VideoClip } from './video-clip';

export interface Player {
  readonly displayName: string;
}

export interface Team {
  readonly id: string;
  readonly players: readonly Player[];
  readonly displayName: string;
  readonly color: string;
}

export interface TiebreakFormat {
  readonly target: number;
  readonly minAdvantage: number;
}

export interface SetFormat {
  readonly targetGames: number;
  readonly tiebreakAt: number;
  readonly preBreakTarget: number;
  readonly tiebreakFormat: TiebreakFormat;
}

export type MatchType = 'singles' | 'doubles';

export interface MatchFormat {
  readonly type: MatchType;
  readonly setsToWin: number;
  readonly sets: readonly SetFormat[];
}

// Override manuale di chi serve a inizio set (eccezione rispetto all'alternanza standard).
// Esempio: il regolamento di torneo prescrive che un set inizi sempre con un certo team.
export interface SetScore {
  readonly games: readonly [number, number];
  readonly winner?: 0 | 1;
  readonly isTiebreak: boolean;
  readonly servingTeamOverride?: 0 | 1;
}

export type GamePointLabel = '0' | '15' | '30' | '40';

// In game: '0' | '15' | '30' | '40'. In tiebreak: stringa numerica ('0','1','2',...).
export type PointLabel = GamePointLabel | string;

export interface ScoreSnapshot {
  readonly sets: readonly SetScore[];
  readonly currentSet: number;
  readonly currentGame: readonly [number, number];
  readonly currentPoint: readonly [PointLabel, PointLabel];
  readonly servingTeam: 0 | 1;
  readonly isTiebreak: boolean;
  readonly matchWinner?: 0 | 1;
}

export type OverlayType = 'live' | 'detail';

export interface ScoreEvent {
  readonly id: string;
  readonly timestampMs: number;
  readonly scorer: 0 | 1;
  readonly scoreSnapshot: ScoreSnapshot;
  readonly overlayType: OverlayType;
  readonly overlayDurationMs?: number;
}

export interface Match {
  readonly id: string;
  readonly teams: readonly [Team, Team];
  readonly format: MatchFormat;
  readonly sets: readonly SetScore[];
  readonly clips: readonly VideoClip[];
  readonly scoreEvents: readonly ScoreEvent[];
  readonly servingTeam: 0 | 1;
  readonly createdAt: string; // ISO 8601 — serializzabile direttamente su .btproject
}
