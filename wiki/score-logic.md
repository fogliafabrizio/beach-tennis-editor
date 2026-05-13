# Logica punteggio Beach Tennis

`score.service.ts` è **puro e testabile** — zero dipendenze da UI o Electron.
Riceve `ScoreEvent[]` + `MatchFormat`, restituisce `ScoreSnapshot`.

## Regola universale del set

Valida per qualsiasi `SetFormat`:

1. Vince il set chi raggiunge `targetGames` con almeno 2 game di vantaggio
2. A `(tiebreakAt-1)`-`(tiebreakAt-1)`: si gioca fino a `preBreakTarget`
3. A `tiebreakAt`-`tiebreakAt`: scatta il tiebreak
4. Tiebreak: primo a `target` punti con almeno `minAdvantage` di vantaggio

**Esempio set a 6:**
- 5-5 → si gioca fino a 7 (chi arriva a 7 vince il set)
- 6-6 → tiebreak, primo a 7 punti con 2 di vantaggio (es. 8-6, 9-7)

**Esempio set da 9:**
- 8-8 → si gioca fino a 10
- 9-9 → tiebreak (target configurato in `tiebreakFormat`)

## Servizio

- Set normali: il servizio cambia ogni game
- **Dentro il game** il servizio non cambia mai (incluso il punto secco a 40-40)
- Tiebreak: il **primo punto** lo serve chi avrebbe dovuto servire il game
  successivo (= NON chi ha servito l'ultimo game prima del tiebreak). Poi il
  servizio cambia **ogni 2 punti** (pattern 1-2-2-2-…)
- Inizio set successivo: alternanza rispetto all'ultimo "giro" del set precedente.
  - Set chiuso senza tiebreak → 1 − chi ha servito l'ultimo game
  - Set chiuso da tiebreak → 1 − chi ha iniziato il tiebreak
  - Può essere forzato manualmente via `SetScore.servingTeamOverride` (eccezione
    da regolamento torneo)
- `ScoreSnapshot.servingTeam` riflette sempre chi serve il **punto successivo**

## Punteggi nel game

Nel Beach Tennis **non esiste il vantaggio**: a 40-40 si gioca un **punto secco** (chi vince quel punto vince il game).
Sequenza: `0 → 15 → 30 → 40`, e a 40-40 il punto successivo chiude il game. Non si raggiunge mai "A".

Nel tiebreak si contano punti interi: `0, 1, 2, ...`

## Regole di servizio BT

Nel Beach Tennis **non esiste la doppia battuta**: il servizio è uno solo per punto.
In caso di fallo al servizio, il punto va direttamente all'avversario (no seconda palla).

## Set giocato come tiebreak

Un intero set può essere configurato come tiebreak (es. terzo set). In `SetFormat`:
- `targetGames: 1, tiebreakAt: 0` → il set è interamente un tiebreak
- `tiebreakFormat.target: 7` → tiebreak a 7 (primo a 7 con 2 di vantaggio)
- `tiebreakFormat.target: 10` → long tie-break a 10 (primo a 10 con 2 di vantaggio)

In questo caso `currentGame` rimane `[0, 0]` e si usa `currentPoint` per il punteggio del tiebreak.

## Casi limite da gestire

- A 40-40: il punto successivo chiude il game (no vantaggio, no "A")
- Fallo al servizio: punto diretto all'avversario (no seconda palla)
- Partita già vinta (`matchWinner` presente): ignorare nuovi `ScoreEvent`
  (lo snapshot resta invariato, il caller UI dovrà avvisare in M4)
- Set interrotto: fuori scope per ora (M7)
- Cambio campo (court swap): fuori scope M3 (rimandato a M7 con l'overlay)

## Service API (M3 PR2)

`ScoreService` vive in `src/app/score/score.service.ts` ed espone:

```typescript
computeSnapshot(
  events: readonly ScoreEvent[],
  format: MatchFormat,
  initialServingTeam: 0 | 1,
  setServingOverrides?: ReadonlyMap<number, 0 | 1>,
): ScoreSnapshot

buildScoreEvent(
  timestampMs: number,
  scorer: 0 | 1,
  previousEvents: readonly ScoreEvent[],
  format: MatchFormat,
  initialServingTeam: 0 | 1,
  setServingOverrides?: ReadonlyMap<number, 0 | 1>,
  overlayType?: 'live' | 'detail',
): ScoreEvent
```

`computeSnapshot` rebuilda lo stato da zero: la sorgente di verità è la lista
eventi, mai una struttura mutabile. `buildScoreEvent` costruisce un nuovo
evento e ne calcola lo `scoreSnapshot` come stato **dopo** l'aggiunta del
punto (usato da M4 per il keyer).

`setServingOverrides` è una mappa `setIndex → 0 | 1`: se presente per un set,
forza chi serve a inizio del set ignorando l'alternanza naturale.
