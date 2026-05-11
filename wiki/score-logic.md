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
- Tiebreak: il servizio cambia ogni 2 punti (il primo punto è di chi serviva l'ultimo game)
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
- Set interrotto: fuori scope per ora (M7)
