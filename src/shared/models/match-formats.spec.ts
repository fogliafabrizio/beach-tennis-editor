import {
  DEFAULT_TEAM_COLORS,
  LONG_TIE_ONLY_FORMAT,
  SET_9_FORMAT,
  STANDARD_BT_FORMAT,
  createDefaultPlayer,
  createDefaultTeam,
  createInitialMatch,
  createInitialSnapshot,
} from './match-formats';

describe('match-formats', () => {
  describe('STANDARD_BT_FORMAT', () => {
    it('definisce 3 set: due a 6 game + super tiebreak a 10', () => {
      expect(STANDARD_BT_FORMAT.type).toBe('doubles');
      expect(STANDARD_BT_FORMAT.setsToWin).toBe(2);
      expect(STANDARD_BT_FORMAT.sets).toHaveLength(3);

      const [s1, s2, s3] = STANDARD_BT_FORMAT.sets;
      expect(s1.targetGames).toBe(6);
      expect(s1.tiebreakAt).toBe(6);
      expect(s1.preBreakTarget).toBe(7);
      expect(s1.tiebreakFormat).toEqual({ target: 7, minAdvantage: 2 });
      expect(s2).toEqual(s1);

      expect(s3.targetGames).toBe(1);
      expect(s3.tiebreakAt).toBe(0);
      expect(s3.preBreakTarget).toBe(0);
      expect(s3.tiebreakFormat).toEqual({ target: 10, minAdvantage: 2 });
    });
  });

  describe('SET_9_FORMAT', () => {
    it('imposta i primi due set a 9 game con tiebreak a 9-9', () => {
      const [s1, s2] = SET_9_FORMAT.sets;
      expect(s1.targetGames).toBe(9);
      expect(s1.tiebreakAt).toBe(9);
      expect(s1.preBreakTarget).toBe(10);
      expect(s2).toEqual(s1);
      expect(SET_9_FORMAT.sets[2].tiebreakFormat.target).toBe(10);
    });
  });

  describe('LONG_TIE_ONLY_FORMAT', () => {
    it('è un singolo super tiebreak a 10', () => {
      expect(LONG_TIE_ONLY_FORMAT.setsToWin).toBe(1);
      expect(LONG_TIE_ONLY_FORMAT.sets).toHaveLength(1);
      const only = LONG_TIE_ONLY_FORMAT.sets[0];
      expect(only.tiebreakAt).toBe(0);
      expect(only.targetGames).toBe(1);
      expect(only.tiebreakFormat).toEqual({ target: 10, minAdvantage: 2 });
    });
  });

  describe('createDefaultPlayer', () => {
    it('crea un player con displayName vuoto di default', () => {
      expect(createDefaultPlayer()).toEqual({ displayName: '' });
    });

    it('preserva il displayName se fornito', () => {
      expect(createDefaultPlayer('Foglia')).toEqual({ displayName: 'Foglia' });
    });
  });

  describe('createDefaultTeam', () => {
    it('crea Squadra 1 con 2 player in doppio (default)', () => {
      const t = createDefaultTeam(0);
      expect(t.displayName).toBe('Squadra 1');
      expect(t.players).toHaveLength(2);
      expect(t.color).toBe(DEFAULT_TEAM_COLORS[0]);
      expect(t.id).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('crea Squadra 2 con 1 player in singolo', () => {
      const t = createDefaultTeam(1, 'singles');
      expect(t.displayName).toBe('Squadra 2');
      expect(t.players).toHaveLength(1);
      expect(t.color).toBe(DEFAULT_TEAM_COLORS[1]);
    });

    it('produce id diversi a ogni invocazione', () => {
      const a = createDefaultTeam(0);
      const b = createDefaultTeam(0);
      expect(a.id).not.toBe(b.id);
    });
  });

  describe('createInitialMatch', () => {
    it('crea un match vuoto: niente set giocati, clip o eventi', () => {
      const teams = [createDefaultTeam(0), createDefaultTeam(1)] as const;
      const m = createInitialMatch(STANDARD_BT_FORMAT, teams, 0);

      expect(m.sets).toEqual([]);
      expect(m.clips).toEqual([]);
      expect(m.scoreEvents).toEqual([]);
      expect(m.servingTeam).toBe(0);
      expect(m.format).toBe(STANDARD_BT_FORMAT);
      expect(m.teams).toBe(teams);
      expect(m.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(m.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('rispetta servingTeam = 1', () => {
      const teams = [createDefaultTeam(0), createDefaultTeam(1)] as const;
      const m = createInitialMatch(STANDARD_BT_FORMAT, teams, 1);
      expect(m.servingTeam).toBe(1);
    });
  });

  describe('createInitialSnapshot', () => {
    it('parte da 0-0 in game per formato standard', () => {
      const s = createInitialSnapshot(STANDARD_BT_FORMAT, 0);
      expect(s.sets).toEqual([]);
      expect(s.currentSet).toBe(0);
      expect(s.currentGame).toEqual([0, 0]);
      expect(s.currentPoint).toEqual(['0', '0']);
      expect(s.servingTeam).toBe(0);
      expect(s.isTiebreak).toBe(false);
      expect(s.matchWinner).toBeUndefined();
    });

    it('parte direttamente in tiebreak per LONG_TIE_ONLY_FORMAT', () => {
      const s = createInitialSnapshot(LONG_TIE_ONLY_FORMAT, 1);
      expect(s.isTiebreak).toBe(true);
      expect(s.currentPoint).toEqual(['0', '0']);
      expect(s.servingTeam).toBe(1);
    });
  });
});
