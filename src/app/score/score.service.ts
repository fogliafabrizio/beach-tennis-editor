import { Injectable } from '@angular/core';
import { uuid } from '../../shared/utils/uuid';
import type {
  MatchFormat,
  OverlayType,
  ScoreEvent,
  ScoreSnapshot,
  SetFormat,
  SetScore,
} from '../../shared/models/match';

// No-ad BT: 0 → 15 → 30 → 40 → game. Mai "A": a 40-40 il punto successivo chiude.
const GAME_POINT_LABELS = ['0', '15', '30', '40'] as const;
const POINTS_TO_WIN_GAME = GAME_POINT_LABELS.length;

interface ScoreState {
  readonly sets: readonly SetScore[];
  readonly currentSetIdx: number;
  readonly currentGame: readonly [number, number];
  readonly currentPoints: readonly [number, number];
  readonly servingTeam: 0 | 1;
  readonly isTiebreak: boolean;
  readonly tiebreakFirstServer?: 0 | 1;
  readonly tiebreakPointsPlayed: number;
  readonly matchWinner?: 0 | 1;
}

@Injectable({ providedIn: 'root' })
export class ScoreService {
  /**
   * Ricalcola lo snapshot di punteggio replay-ando tutti gli eventi dall'inizio.
   * Sorgente di verità: la lista eventi + format. Lo stato non viene mai mutato.
   */
  computeSnapshot(
    events: readonly ScoreEvent[],
    format: MatchFormat,
    initialServingTeam: 0 | 1,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreSnapshot {
    let state = this.initialState(format, initialServingTeam, setServingOverrides);
    for (const ev of events) {
      state = this.applyPoint(state, ev.scorer, format, setServingOverrides);
    }
    return this.toSnapshot(state);
  }

  /**
   * Crea un nuovo ScoreEvent calcolando lo snapshot risultante DOPO l'aggiunta del punto.
   * Se il match è già concluso, lo snapshot resta invariato (l'evento è di fatto un no-op
   * sul punteggio — il caller in M4 dovrà gestire l'avviso UI).
   */
  buildScoreEvent(
    timestampMs: number,
    scorer: 0 | 1,
    previousEvents: readonly ScoreEvent[],
    format: MatchFormat,
    initialServingTeam: 0 | 1,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
    overlayType: OverlayType = 'live',
  ): ScoreEvent {
    let state = this.initialState(format, initialServingTeam, setServingOverrides);
    for (const ev of previousEvents) {
      state = this.applyPoint(state, ev.scorer, format, setServingOverrides);
    }
    state = this.applyPoint(state, scorer, format, setServingOverrides);
    return {
      id: uuid(),
      timestampMs,
      scorer,
      scoreSnapshot: this.toSnapshot(state),
      overlayType,
    };
  }

  private initialState(
    format: MatchFormat,
    initialServingTeam: 0 | 1,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreState {
    const firstSet = format.sets[0];
    const isLongTie = firstSet.tiebreakAt === 0;
    const overrideForSet0 = setServingOverrides?.get(0);
    const servingTeam = overrideForSet0 ?? initialServingTeam;
    return {
      sets: [],
      currentSetIdx: 0,
      currentGame: [0, 0],
      currentPoints: [0, 0],
      servingTeam,
      isTiebreak: isLongTie,
      tiebreakFirstServer: isLongTie ? servingTeam : undefined,
      tiebreakPointsPlayed: 0,
    };
  }

  private applyPoint(
    state: ScoreState,
    scorer: 0 | 1,
    format: MatchFormat,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreState {
    if (state.matchWinner !== undefined) return state;
    return state.isTiebreak
      ? this.applyTiebreakPoint(state, scorer, format, setServingOverrides)
      : this.applyGamePoint(state, scorer, format, setServingOverrides);
  }

  private applyGamePoint(
    state: ScoreState,
    scorer: 0 | 1,
    format: MatchFormat,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreState {
    const setFormat = format.sets[state.currentSetIdx];
    const newPoints: [number, number] = [state.currentPoints[0], state.currentPoints[1]];
    newPoints[scorer] += 1;

    // No-ad: 4 punti raggiunti = game vinto. A 3-3 (40-40) chiude allo stesso modo.
    if (newPoints[scorer] >= POINTS_TO_WIN_GAME) {
      return this.finalizeGame(state, scorer, setFormat, format, setServingOverrides);
    }
    return { ...state, currentPoints: newPoints };
  }

  private finalizeGame(
    state: ScoreState,
    gameWinner: 0 | 1,
    setFormat: SetFormat,
    format: MatchFormat,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreState {
    const newGames: [number, number] = [state.currentGame[0], state.currentGame[1]];
    newGames[gameWinner] += 1;

    if (this.isSetWon(newGames, setFormat)) {
      return this.finalizeSet(state, gameWinner, newGames, format, false, setServingOverrides);
    }
    if (newGames[0] === setFormat.tiebreakAt && newGames[1] === setFormat.tiebreakAt) {
      return this.enterTiebreak(state, newGames);
    }
    // Set in corso: alterna il servizio per il game successivo.
    return {
      ...state,
      currentGame: newGames,
      currentPoints: [0, 0],
      servingTeam: (1 - state.servingTeam) as 0 | 1,
      isTiebreak: false,
    };
  }

  private isSetWon(games: readonly [number, number], setFormat: SetFormat): boolean {
    const [a, b] = games;
    if (a >= setFormat.targetGames && a - b >= 2) return true;
    if (b >= setFormat.targetGames && b - a >= 2) return true;
    return false;
  }

  private enterTiebreak(state: ScoreState, newGames: readonly [number, number]): ScoreState {
    // Il primo punto del tiebreak lo serve chi avrebbe dovuto servire il game successivo
    // (regola ITF tennis/beach tennis). Lo state.servingTeam corrente è ancora chi
    // ha servito l'ultimo game (finalizeGame non ha alternato in questo branch).
    const firstServer = (1 - state.servingTeam) as 0 | 1;
    return {
      ...state,
      currentGame: newGames,
      currentPoints: [0, 0],
      servingTeam: firstServer,
      isTiebreak: true,
      tiebreakFirstServer: firstServer,
      tiebreakPointsPlayed: 0,
    };
  }

  private applyTiebreakPoint(
    state: ScoreState,
    scorer: 0 | 1,
    format: MatchFormat,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreState {
    const setFormat = format.sets[state.currentSetIdx];
    const newPoints: [number, number] = [state.currentPoints[0], state.currentPoints[1]];
    newPoints[scorer] += 1;
    const newPointsPlayed = state.tiebreakPointsPlayed + 1;

    const tb = setFormat.tiebreakFormat;
    const diff = Math.abs(newPoints[0] - newPoints[1]);
    if (newPoints[scorer] >= tb.target && diff >= tb.minAdvantage) {
      // Tiebreak vinto → set vinto. Il vincitore guadagna un game (rilevante nei set normali
      // chiusi da tiebreak, es. 7-6); nei long-tie si va da [0,0] a [1,0].
      const finalGames: [number, number] = [state.currentGame[0], state.currentGame[1]];
      finalGames[scorer] += 1;
      return this.finalizeSet(state, scorer, finalGames, format, true, setServingOverrides);
    }

    // Tiebreak continua: pattern 1-2-2-2-... a partire da tiebreakFirstServer.
    const firstServer = state.tiebreakFirstServer ?? state.servingTeam;
    const nextServer = this.tiebreakServerFor(firstServer, newPointsPlayed);
    return {
      ...state,
      currentPoints: newPoints,
      servingTeam: nextServer,
      tiebreakPointsPlayed: newPointsPlayed,
    };
  }

  private tiebreakServerFor(firstServer: 0 | 1, pointsPlayed: number): 0 | 1 {
    const flip = Math.floor((pointsPlayed + 1) / 2) % 2;
    return ((firstServer ^ flip) & 1) as 0 | 1;
  }

  private finalizeSet(
    state: ScoreState,
    setWinner: 0 | 1,
    finalGames: readonly [number, number],
    format: MatchFormat,
    closedByTiebreak: boolean,
    setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  ): ScoreState {
    const newSetScore: SetScore = {
      games: [finalGames[0], finalGames[1]],
      winner: setWinner,
      isTiebreak: closedByTiebreak,
    };
    const newSets: readonly SetScore[] = [...state.sets, newSetScore];

    const setsWon: [number, number] = [0, 0];
    for (const s of newSets) {
      if (s.winner !== undefined) setsWon[s.winner] += 1;
    }
    if (setsWon[setWinner] >= format.setsToWin) {
      // Match concluso: blocca lo stato. Eventi successivi saranno ignorati da applyPoint.
      return {
        ...state,
        sets: newSets,
        currentGame: [0, 0],
        currentPoints: [0, 0],
        matchWinner: setWinner,
      };
    }

    // Il match continua: imposta servizio del set successivo.
    // Alternanza standard rispetto al server dell'ultimo "giro":
    // - set non-tiebreak: 1 - chi ha servito l'ultimo game (state.servingTeam, non alternato qui)
    // - set chiuso in tiebreak: 1 - chi ha iniziato il tiebreak
    // Override esplicito su quel set: prevale (eccezione regolamento torneo).
    const nextSetIdx = state.currentSetIdx + 1;
    const nextSetFormat = format.sets[nextSetIdx];
    const naturalNext: 0 | 1 = closedByTiebreak
      ? ((1 - (state.tiebreakFirstServer ?? state.servingTeam)) as 0 | 1)
      : ((1 - state.servingTeam) as 0 | 1);
    const nextServingTeam = setServingOverrides?.get(nextSetIdx) ?? naturalNext;
    const isNextSetLongTie = nextSetFormat.tiebreakAt === 0;

    return {
      ...state,
      sets: newSets,
      currentSetIdx: nextSetIdx,
      currentGame: [0, 0],
      currentPoints: [0, 0],
      servingTeam: nextServingTeam,
      isTiebreak: isNextSetLongTie,
      tiebreakFirstServer: isNextSetLongTie ? nextServingTeam : undefined,
      tiebreakPointsPlayed: 0,
    };
  }

  private toSnapshot(state: ScoreState): ScoreSnapshot {
    const currentPoint: readonly [string, string] = state.isTiebreak
      ? [String(state.currentPoints[0]), String(state.currentPoints[1])]
      : [GAME_POINT_LABELS[state.currentPoints[0]], GAME_POINT_LABELS[state.currentPoints[1]]];
    return {
      sets: state.sets,
      currentSet: state.currentSetIdx,
      currentGame: [state.currentGame[0], state.currentGame[1]],
      currentPoint,
      servingTeam: state.servingTeam,
      isTiebreak: state.isTiebreak,
      matchWinner: state.matchWinner,
    };
  }
}
