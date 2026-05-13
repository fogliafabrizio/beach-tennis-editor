import { TestBed } from '@angular/core/testing';
import { ScoreService } from './score.service';
import {
  LONG_TIE_ONLY_FORMAT,
  STANDARD_BT_FORMAT,
} from '../../shared/models/match-formats';
import type {
  MatchFormat,
  ScoreEvent,
  ScoreSnapshot,
  SetFormat,
} from '../../shared/models/match';

// Helper: trasforma una sequenza di vincitori-punto in ScoreEvent[] con id stabili.
function toEvents(scorers: readonly (0 | 1)[]): ScoreEvent[] {
  return scorers.map((scorer, i) => ({
    id: `ev-${i}`,
    timestampMs: i * 1000,
    scorer,
    scoreSnapshot: emptySnapshotPlaceholder(),
    overlayType: 'live',
  }));
}

// Lo snapshot dentro l'evento è ricalcolato dal service, quindi nei test che usano
// computeSnapshot lo riempiamo solo come placeholder.
function emptySnapshotPlaceholder(): ScoreSnapshot {
  return {
    sets: [],
    currentSet: 0,
    currentGame: [0, 0],
    currentPoint: ['0', '0'],
    servingTeam: 0,
    isTiebreak: false,
  };
}

// Replica del SetFormat di un set a 6 game (lo usiamo per chiarezza nei test).
const SET_TO_6: SetFormat = {
  targetGames: 6,
  tiebreakAt: 6,
  preBreakTarget: 7,
  tiebreakFormat: { target: 7, minAdvantage: 2 },
};

// Formato 2-set-a-6 senza terzo long-tie, per testare lo scenario base senza
// dover gestire la transizione al super tiebreak finale.
const TWO_SET_TO_6_FORMAT: MatchFormat = {
  type: 'doubles',
  setsToWin: 2,
  sets: [SET_TO_6, SET_TO_6],
};

describe('ScoreService', () => {
  let service: ScoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ScoreService);
  });

  describe('snapshot iniziale', () => {
    it('parte da 0-0 senza eventi (formato standard)', () => {
      const s = service.computeSnapshot([], STANDARD_BT_FORMAT, 0);
      expect(s.sets).toEqual([]);
      expect(s.currentSet).toBe(0);
      expect(s.currentGame).toEqual([0, 0]);
      expect(s.currentPoint).toEqual(['0', '0']);
      expect(s.servingTeam).toBe(0);
      expect(s.isTiebreak).toBe(false);
      expect(s.matchWinner).toBeUndefined();
    });

    it('parte direttamente in tiebreak per LONG_TIE_ONLY_FORMAT', () => {
      const s = service.computeSnapshot([], LONG_TIE_ONLY_FORMAT, 1);
      expect(s.isTiebreak).toBe(true);
      expect(s.currentPoint).toEqual(['0', '0']);
      expect(s.servingTeam).toBe(1);
    });

    it('rispetta override del server per il set 0', () => {
      const overrides = new Map<number, 0 | 1>([[0, 1]]);
      const s = service.computeSnapshot([], TWO_SET_TO_6_FORMAT, 0, overrides);
      expect(s.servingTeam).toBe(1);
    });
  });

  describe('progressione game (no-ad BT)', () => {
    it('avanza 0 → 15 → 30 → 40 → game per team 0', () => {
      const step = (n: number) => service.computeSnapshot(toEvents(Array(n).fill(0)), TWO_SET_TO_6_FORMAT, 0);
      expect(step(1).currentPoint).toEqual(['15', '0']);
      expect(step(2).currentPoint).toEqual(['30', '0']);
      expect(step(3).currentPoint).toEqual(['40', '0']);
      const after4 = step(4);
      expect(after4.currentGame).toEqual([1, 0]);
      expect(after4.currentPoint).toEqual(['0', '0']);
    });

    it('punteggi misti producono etichette corrette', () => {
      const s = service.computeSnapshot(toEvents([0, 1, 0]), TWO_SET_TO_6_FORMAT, 0);
      expect(s.currentPoint).toEqual(['30', '15']);
    });

    it('chiude il game con punto secco a 40-40 (no vantaggio)', () => {
      // 3 punti per uno e 3 per l'altro → 40-40, poi team 0 segna → game [1,0].
      const at40_40 = service.computeSnapshot(toEvents([0, 0, 0, 1, 1, 1]), TWO_SET_TO_6_FORMAT, 0);
      expect(at40_40.currentPoint).toEqual(['40', '40']);
      expect(at40_40.currentGame).toEqual([0, 0]);

      const afterDecidingPoint = service.computeSnapshot(
        toEvents([0, 0, 0, 1, 1, 1, 0]),
        TWO_SET_TO_6_FORMAT,
        0,
      );
      expect(afterDecidingPoint.currentGame).toEqual([1, 0]);
      expect(afterDecidingPoint.currentPoint).toEqual(['0', '0']);
    });
  });

  describe('servizio nel game', () => {
    it('non cambia il servizio durante il game (inclusi 30-40 e 40-40)', () => {
      // Tutti gli snapshot intermedi del primo game devono avere servingTeam = 0.
      for (let i = 1; i <= 6; i++) {
        const events = toEvents([0, 0, 0, 1, 1, 1].slice(0, i));
        const s = service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
        expect(s.servingTeam).toBe(0);
        expect(s.currentGame).toEqual([0, 0]);
      }
    });

    it("alterna il servizio dopo ogni game", () => {
      const game1 = service.computeSnapshot(toEvents([0, 0, 0, 0]), TWO_SET_TO_6_FORMAT, 0);
      expect(game1.servingTeam).toBe(1);

      const game2 = service.computeSnapshot(toEvents([0, 0, 0, 0, 1, 1, 1, 1]), TWO_SET_TO_6_FORMAT, 0);
      expect(game2.servingTeam).toBe(0);
    });

    it('il servizio non cambia con il punto secco (resta lo stesso fino a fine game)', () => {
      // Stato a 40-40: servingTeam=0; dopo il game chiuso da team 0, alterna a 1.
      const at40_40 = service.computeSnapshot(toEvents([0, 0, 0, 1, 1, 1]), TWO_SET_TO_6_FORMAT, 0);
      expect(at40_40.servingTeam).toBe(0);
      const afterDecide = service.computeSnapshot(toEvents([0, 0, 0, 1, 1, 1, 0]), TWO_SET_TO_6_FORMAT, 0);
      expect(afterDecide.servingTeam).toBe(1);
    });
  });

  describe('chiusura set (set a 6)', () => {
    // Helper: vince N game di fila per `winner` partendo da 0-0 (4 punti per game).
    function winNGames(winner: 0 | 1, n: number): (0 | 1)[] {
      const out: (0 | 1)[] = [];
      for (let i = 0; i < n; i++) for (let j = 0; j < 4; j++) out.push(winner);
      return out;
    }

    // Alterna chi vince i game (4 punti per game) per finire a `a-b` games.
    function gamesTo(a: number, b: number): (0 | 1)[] {
      const out: (0 | 1)[] = [];
      const alternate: (0 | 1)[] = [];
      for (let i = 0; i < Math.max(a, b); i++) {
        if (i < a) alternate.push(0);
        if (i < b) alternate.push(1);
      }
      for (const w of alternate) for (let j = 0; j < 4; j++) out.push(w);
      return out;
    }

    it('chiude il primo set a 6-0', () => {
      const s = service.computeSnapshot(toEvents(winNGames(0, 6)), TWO_SET_TO_6_FORMAT, 0);
      expect(s.sets).toHaveLength(1);
      expect(s.sets[0].winner).toBe(0);
      expect(s.sets[0].games).toEqual([6, 0]);
      expect(s.sets[0].isTiebreak).toBe(false);
      expect(s.currentSet).toBe(1);
    });

    it('chiude a 6-4', () => {
      const s = service.computeSnapshot(toEvents(gamesTo(6, 4)), TWO_SET_TO_6_FORMAT, 0);
      expect(s.sets[0].games).toEqual([6, 4]);
      expect(s.sets[0].winner).toBe(0);
    });

    it('a 5-5 si gioca fino a 7-5 (pre-tiebreak rule)', () => {
      // Sequenza: 5-5 alternato, poi team 0 vince 2 game di fila → 7-5.
      const seq: (0 | 1)[] = [...gamesTo(5, 5), ...winNGames(0, 2)];
      const s = service.computeSnapshot(toEvents(seq), TWO_SET_TO_6_FORMAT, 0);
      expect(s.sets[0].games).toEqual([7, 5]);
      expect(s.sets[0].winner).toBe(0);
      expect(s.sets[0].isTiebreak).toBe(false);
    });

    it('a 6-5 → 6-6 → tiebreak (non chiude su 6-5 con solo 1 di vantaggio)', () => {
      // 5-5 alternato, +1 game team 0 (= 6-5), +1 game team 1 (= 6-6).
      const seq: (0 | 1)[] = [...gamesTo(5, 5), 0, 0, 0, 0, 1, 1, 1, 1];
      const s = service.computeSnapshot(toEvents(seq), TWO_SET_TO_6_FORMAT, 0);
      expect(s.isTiebreak).toBe(true);
      expect(s.currentGame).toEqual([6, 6]);
      expect(s.currentPoint).toEqual(['0', '0']);
      expect(s.sets).toEqual([]);
    });
  });

  describe('tiebreak (set normale, target 7)', () => {
    function reach6_6(initialServer: 0 | 1): (0 | 1)[] {
      // Alterna game (12 game totali) finché il punteggio è 6-6.
      const out: (0 | 1)[] = [];
      const _ = initialServer; // unused, retained for symmetry/readability
      void _;
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) out.push(0);
        for (let j = 0; j < 4; j++) out.push(1);
      }
      return out;
    }

    it('entrata: tiebreakFirstServer = chi NON ha servito l\'ultimo game', () => {
      // serving iniziale = 0. I 12 game alternano: server 0,1,0,1,...,0,1.
      // L'ultimo game (12mo, indice 11) è servito da 1. Il primo punto del tiebreak
      // lo serve "chi avrebbe dovuto servire il game successivo" = 0.
      const s = service.computeSnapshot(toEvents(reach6_6(0)), TWO_SET_TO_6_FORMAT, 0);
      expect(s.isTiebreak).toBe(true);
      expect(s.servingTeam).toBe(0);
    });

    it("rispetta il pattern di servizio 1-2-2-2 nel tiebreak", () => {
      // firstServer = 0 (dal test precedente). Pattern atteso del server del PROSSIMO punto:
      // dopo 0 punti giocati → 0 (firstServer)
      // dopo 1 punto giocato → 1
      // dopo 2 punti giocati → 1
      // dopo 3 punti giocati → 0
      // dopo 4 punti giocati → 0
      // dopo 5 punti giocati → 1
      const base = toEvents(reach6_6(0));
      // Aggiungo punti 0..5 (li facciamo segnare a team 0 per semplicità).
      const expected: (0 | 1)[] = [1, 1, 0, 0, 1];
      for (let n = 1; n <= 5; n++) {
        const extra = toEvents(Array(n).fill(0));
        const events = [...base, ...extra.map((e, i) => ({ ...e, id: `tb-${i}` }))];
        const s = service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
        expect(s.servingTeam).toBe(expected[n - 1]);
      }
    });

    it('chiude il set a 7-5 nel tiebreak (set a 6 → games [7,6])', () => {
      // Da 6-6 il team 0 segna 7 punti di fila, team 1 zero → 7-0 → 7>=7 e diff>=2.
      const events = toEvents([...reach6_6(0), ...Array(7).fill(0) as (0 | 1)[]]);
      const s = service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
      expect(s.sets).toHaveLength(1);
      expect(s.sets[0].games).toEqual([7, 6]);
      expect(s.sets[0].isTiebreak).toBe(true);
      expect(s.sets[0].winner).toBe(0);
    });

    it("continua oltre 7-6 quando manca il vantaggio (chiude a 8-6)", () => {
      // 6-6 → segno 6 punti per 0, poi 6 per 1, poi 2 per 0 → 6-6 → 7-6 → 7-6 ... per
      // arrivare a 8-6 servono: team 0 vince 6 punti, team 1 vince 6 punti (=6-6 tb),
      // poi team 0 vince 2 punti consecutivi (=8-6).
      const tb: (0 | 1)[] = [];
      for (let i = 0; i < 6; i++) tb.push(0, 1); // alternati fino a 6-6 nel tiebreak
      const at_6_6_tb = service.computeSnapshot(toEvents([...reach6_6(0), ...tb]), TWO_SET_TO_6_FORMAT, 0);
      expect(at_6_6_tb.isTiebreak).toBe(true);
      expect(at_6_6_tb.currentPoint).toEqual(['6', '6']);

      // 7-6 (diff 1, non chiude)
      const at_7_6 = service.computeSnapshot(toEvents([...reach6_6(0), ...tb, 0]), TWO_SET_TO_6_FORMAT, 0);
      expect(at_7_6.isTiebreak).toBe(true);
      expect(at_7_6.currentPoint).toEqual(['7', '6']);

      // 8-6 → chiude
      const at_8_6 = service.computeSnapshot(toEvents([...reach6_6(0), ...tb, 0, 0]), TWO_SET_TO_6_FORMAT, 0);
      expect(at_8_6.sets).toHaveLength(1);
      expect(at_8_6.sets[0].winner).toBe(0);
      expect(at_8_6.sets[0].games).toEqual([7, 6]);
    });
  });

  describe('long-tie set (LONG_TIE_ONLY_FORMAT)', () => {
    it("è in tiebreak fin dal primo punto, currentGame resta [0,0]", () => {
      const s = service.computeSnapshot(toEvents([0, 0, 1]), LONG_TIE_ONLY_FORMAT, 0);
      expect(s.isTiebreak).toBe(true);
      expect(s.currentGame).toEqual([0, 0]);
      expect(s.currentPoint).toEqual(['2', '1']);
    });

    it('match deciso al primo 10-x con vantaggio ≥ 2', () => {
      const events = toEvents(Array(10).fill(0) as (0 | 1)[]);
      const s = service.computeSnapshot(events, LONG_TIE_ONLY_FORMAT, 0);
      expect(s.matchWinner).toBe(0);
      expect(s.sets).toHaveLength(1);
      expect(s.sets[0].games).toEqual([1, 0]);
      expect(s.sets[0].isTiebreak).toBe(true);
    });

    it('a 10-9 non chiude, va avanti fino al vantaggio di 2', () => {
      const seq: (0 | 1)[] = [];
      for (let i = 0; i < 9; i++) seq.push(0, 1); // 9-9
      seq.push(0); // 10-9
      const at10_9 = service.computeSnapshot(toEvents(seq), LONG_TIE_ONLY_FORMAT, 0);
      expect(at10_9.matchWinner).toBeUndefined();
      expect(at10_9.currentPoint).toEqual(['10', '9']);

      seq.push(0); // 11-9
      const at11_9 = service.computeSnapshot(toEvents(seq), LONG_TIE_ONLY_FORMAT, 0);
      expect(at11_9.matchWinner).toBe(0);
    });
  });

  describe('servizio inizio set 2', () => {
    function winSet(server: 0 | 1, target: 0 | 1, gamesA: number, gamesB: number): (0 | 1)[] {
      void server;
      const out: (0 | 1)[] = [];
      const alternate: (0 | 1)[] = [];
      for (let i = 0; i < Math.max(gamesA, gamesB); i++) {
        if (i < gamesA) alternate.push(0);
        if (i < gamesB) alternate.push(1);
      }
      // assicurati che alla fine vinca `target`: completo riordinando se serve
      void target;
      for (const w of alternate) for (let j = 0; j < 4; j++) out.push(w);
      return out;
    }

    it('set non-tiebreak: chi serve set 2 = NON chi ha servito ultimo game', () => {
      // Set 1: serving inizia con team 0; 6-4 → game alternati 0,1,0,1,...
      // 10 game → ultimo (idx 9) servito da 1 → set 2 inizia con 0.
      const set1 = winSet(0, 0, 6, 4);
      const s = service.computeSnapshot(toEvents(set1), TWO_SET_TO_6_FORMAT, 0);
      expect(s.currentSet).toBe(1);
      expect(s.servingTeam).toBe(0);
    });

    it('set chiuso da tiebreak: chi serve set 2 = NON chi ha iniziato il tiebreak', () => {
      // 6-6 in 12 game (alternato), tiebreak vinto 7-0 da team 0.
      // tiebreakFirstServer = 0 (test precedente), quindi set 2 inizia con 1.
      const events: (0 | 1)[] = [];
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 4; j++) events.push(0);
        for (let j = 0; j < 4; j++) events.push(1);
      }
      for (let j = 0; j < 7; j++) events.push(0);
      const s = service.computeSnapshot(toEvents(events), TWO_SET_TO_6_FORMAT, 0);
      expect(s.sets[0].isTiebreak).toBe(true);
      expect(s.currentSet).toBe(1);
      expect(s.servingTeam).toBe(1);
    });

    it("override per set 1 prevale sull'alternanza naturale", () => {
      // Senza override, set 2 inizierebbe con team 0 (caso 6-4 sopra).
      // Con override [1, 1], deve iniziare con team 1.
      const overrides = new Map<number, 0 | 1>([[1, 1]]);
      const set1 = (() => {
        const out: (0 | 1)[] = [];
        const alt: (0 | 1)[] = [0, 1, 0, 1, 0, 1, 0, 1, 0, 0]; // 6-4
        for (const w of alt) for (let j = 0; j < 4; j++) out.push(w);
        return out;
      })();
      const s = service.computeSnapshot(toEvents(set1), TWO_SET_TO_6_FORMAT, 0, overrides);
      expect(s.currentSet).toBe(1);
      expect(s.servingTeam).toBe(1);
    });
  });

  describe('match concluso (matchWinner)', () => {
    function quickSet(winner: 0 | 1): (0 | 1)[] {
      // 6 game consecutivi del vincitore (24 punti).
      return Array(24).fill(winner) as (0 | 1)[];
    }

    it('match a 2 set vinti settati a 6-0/6-0 produce matchWinner', () => {
      const s = service.computeSnapshot(toEvents([...quickSet(0), ...quickSet(0)]), TWO_SET_TO_6_FORMAT, 0);
      expect(s.matchWinner).toBe(0);
      expect(s.sets).toHaveLength(2);
    });

    it("ignora gli eventi dopo che il match è concluso", () => {
      const base = [...quickSet(0), ...quickSet(0)]; // matchWinner=0
      const baseSnap = service.computeSnapshot(toEvents(base), TWO_SET_TO_6_FORMAT, 0);
      const withExtras = [...base, 0, 1, 0, 1];
      const extraSnap = service.computeSnapshot(toEvents(withExtras), TWO_SET_TO_6_FORMAT, 0);
      expect(extraSnap).toEqual(baseSnap);
    });
  });

  describe('immutabilità e determinismo', () => {
    it("non muta l'array di eventi passato in input", () => {
      const events = toEvents([0, 1, 0, 0, 0]);
      const snapshot = JSON.stringify(events);
      service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
      expect(JSON.stringify(events)).toBe(snapshot);
    });

    it('produce lo stesso snapshot a chiamate successive (deterministico)', () => {
      const events = toEvents([0, 0, 1, 0, 1, 1, 0, 0, 0]);
      const a = service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
      const b = service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
      expect(a).toEqual(b);
    });
  });

  describe('currentPoint typing', () => {
    it('in game usa le etichette 0/15/30/40', () => {
      const labels = new Set<string>();
      for (let n = 0; n <= 6; n++) {
        const events = toEvents(Array(n).fill(0));
        const s = service.computeSnapshot(events, TWO_SET_TO_6_FORMAT, 0);
        if (!s.isTiebreak) labels.add(s.currentPoint[0]);
      }
      expect(labels).toEqual(new Set(['0', '15', '30', '40']));
    });

    it('in tiebreak usa stringhe numeriche', () => {
      const events = toEvents([0, 1, 0, 0]);
      const s = service.computeSnapshot(events, LONG_TIE_ONLY_FORMAT, 0);
      expect(s.currentPoint).toEqual(['3', '1']);
    });
  });

  describe('buildScoreEvent', () => {
    it("calcola lo snapshot DOPO l'aggiunta del punto", () => {
      const previous = toEvents([0, 0, 0]); // 40-0
      const ev = service.buildScoreEvent(12345, 0, previous, TWO_SET_TO_6_FORMAT, 0);
      expect(ev.timestampMs).toBe(12345);
      expect(ev.scorer).toBe(0);
      expect(ev.overlayType).toBe('live');
      expect(ev.scoreSnapshot.currentGame).toEqual([1, 0]);
      expect(ev.scoreSnapshot.currentPoint).toEqual(['0', '0']);
      expect(ev.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("se il match è concluso, scoreSnapshot resta invariato rispetto al precedente", () => {
      const closed = toEvents([
        ...Array(24).fill(0),
        ...Array(24).fill(0),
      ] as (0 | 1)[]);
      const baseSnap = service.computeSnapshot(closed, TWO_SET_TO_6_FORMAT, 0);
      const ev = service.buildScoreEvent(99, 1, closed, TWO_SET_TO_6_FORMAT, 0);
      expect(ev.scoreSnapshot).toEqual(baseSnap);
      expect(ev.scoreSnapshot.matchWinner).toBe(0);
    });
  });
});
