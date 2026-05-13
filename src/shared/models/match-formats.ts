import { uuid } from '../utils/uuid';
import type {
  Match,
  MatchFormat,
  MatchType,
  Player,
  ScoreSnapshot,
  SetFormat,
  Team,
  TiebreakFormat,
} from './match';

// Palette default per le squadre alla creazione di un nuovo Match.
// L'utente potrà cambiare i colori dal dialog di configurazione (PR4).
export const DEFAULT_TEAM_COLORS = ['#4A9EFF', '#FF6B6B'] as const;

const TIEBREAK_TO_7: TiebreakFormat = { target: 7, minAdvantage: 2 };
const TIEBREAK_TO_10: TiebreakFormat = { target: 10, minAdvantage: 2 };

const SET_TO_6: SetFormat = {
  targetGames: 6,
  tiebreakAt: 6,
  preBreakTarget: 7,
  tiebreakFormat: TIEBREAK_TO_7,
};

const SET_TO_9: SetFormat = {
  targetGames: 9,
  tiebreakAt: 9,
  preBreakTarget: 10,
  tiebreakFormat: TIEBREAK_TO_7,
};

// Long-tie set: targetGames=1 e tiebreakAt=0 → tutto il set è tiebreak fin dal primo punto.
const LONG_TIE_SET: SetFormat = {
  targetGames: 1,
  tiebreakAt: 0,
  preBreakTarget: 0,
  tiebreakFormat: TIEBREAK_TO_10,
};

export const STANDARD_BT_FORMAT: MatchFormat = {
  type: 'doubles',
  setsToWin: 2,
  sets: [SET_TO_6, SET_TO_6, LONG_TIE_SET],
};

export const SET_9_FORMAT: MatchFormat = {
  type: 'doubles',
  setsToWin: 2,
  sets: [SET_TO_9, SET_TO_9, LONG_TIE_SET],
};

export const LONG_TIE_ONLY_FORMAT: MatchFormat = {
  type: 'doubles',
  setsToWin: 1,
  sets: [LONG_TIE_SET],
};

export function createDefaultPlayer(displayName = ''): Player {
  return { displayName };
}

export function createDefaultTeam(index: 0 | 1, type: MatchType = 'doubles'): Team {
  const playerCount = type === 'singles' ? 1 : 2;
  return {
    id: uuid(),
    players: Array.from({ length: playerCount }, () => createDefaultPlayer()),
    displayName: `Squadra ${index + 1}`,
    color: DEFAULT_TEAM_COLORS[index],
  };
}

export function createInitialMatch(
  format: MatchFormat,
  teams: readonly [Team, Team],
  servingTeam: 0 | 1,
): Match {
  return {
    id: uuid(),
    teams,
    format,
    sets: [],
    clips: [],
    scoreEvents: [],
    servingTeam,
    createdAt: new Date().toISOString(),
  };
}

export function createInitialSnapshot(
  format: MatchFormat,
  servingTeam: 0 | 1,
): ScoreSnapshot {
  const firstSet = format.sets[0];
  const isTiebreakFromStart = firstSet.tiebreakAt === 0;
  return {
    sets: [],
    currentSet: 0,
    currentGame: [0, 0],
    currentPoint: ['0', '0'],
    servingTeam,
    isTiebreak: isTiebreakFromStart,
  };
}
