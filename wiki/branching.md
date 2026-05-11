# Regole di Branching

## Branch principali

| Branch | Scopo | Push diretto |
|---|---|---|
| `main` | Release stabili | ❌ Mai |
| `develop` | Integrazione continua | ❌ Solo via PR |

## Branch di lavoro

Tutti partono da `develop` e vengono mergati in `develop`.

| Prefisso | Quando | Esempio |
|---|---|---|
| `feature/` | Nuova funzionalità | `feature/score-keyer` |
| `fix/` | Bugfix | `fix/timeline-drag-offset` |
| `chore/` | Config, dipendenze, refactor | `chore/eslint-setup` |
| `docs/` | Solo documentazione | `docs/update-readme` |

## Workflow standard

```bash
git checkout develop && git pull origin develop
git checkout -b feature/nome-feature

# ... lavora, committa spesso ...

git checkout develop && git pull origin develop
git checkout feature/nome-feature && git rebase develop
git push origin feature/nome-feature
# → apri PR verso develop
```

## Regole PR

- Titolo descrittivo
- Almeno una review prima del merge
- Squash merge su `develop`
- Branch cancellato dopo il merge

## Release su main

```bash
git checkout main
git merge --no-ff develop -m "release: v1.x.0"
git tag v1.x.0
git push origin main --tags
```

## Conventional Commits

```
<tipo>: <descrizione breve>

[corpo opzionale: perché, non cosa]
```

**Tipi validi:** `feat` · `fix` · `chore` · `docs` · `test` · `refactor` · `style` · `perf`

**Esempi:**
```
feat: aggiunge score keyer con shortcut tastiera
fix: corregge calcolo tie-break nel terzo set
chore: aggiorna ffmpeg-static alla versione 6
test: aggiunge unit test per MatchFormat long-tie
```

## Branch protection (GitHub)

`main`: require PR · 1 approval · dismiss stale reviews · no bypass
`develop`: require PR · squash merge only
