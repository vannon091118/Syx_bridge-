# PLAN_COMMIT_LAYER_RNG.md — Deterministischer Commit-Layer

> **Stand:** 2026-06-23 | **Status:** ✅ DONE (archiviert 2026-07-02)
> **Ziel:** Commit-Layer als deterministisch verbundene, lebende Welt — ohne Math.random(), ohne Crypto.

---

## Übersicht

Alle Commit-Layer-Komponenten verbinden sich über einen deterministischen PRNG (XorShift128) ohne externe Entropie. Jeder Commit erzeugt einen Composite-Hash `c5j3a2p8`, der Commit-Sequenz, narrative Anweisung, Arc-Referenz und Plot-Referenz in EINER ID kodiert.

Der CHANGELOG.md-Eintrag verankert jeden Commit mit `Commit-Hash + Composite-Hash` — macht die gesamte Kette rückwirkend verifizierbar.

**Standalone-Prinzip:** Der gesamte Layer (außer `verify_commit_msg.js`) lebt im Folder `core/scripts/commit_lore/`. Plug-and-Play auf jedes Projekt anwendbar via:
- `commit_lore/` Ordner kopieren
- `verify_commit_msg.js` + Git-Hook wiren
- AGENTS.md-Regeln übernehmen
- CHANGELOG.md-Anker setzen

Unplug: Hook entfernen, Folder löschen — Projekt läuft weiter.

---

## ID-System (abstrakt, konfliktfrei)

```
C1, C2, C3 ... = Commits       (sequenziell)
P1, P2, P3 ... = Plot-Nodes    (plotchain.json)
A1, A2, A3 ... = Arcs          (lore_arcs.json)
J1..J99       = Narrative Anweisungen (narrative_params.json)
```

## Composite-Hash

```
c5 j3 a2 p8
│   │  │  │
│   │  │  └─ P8: plotchain-Node #8
│   │  └──── A2: Arc #2 (lore_arcs.json)
│   └─────── J3: Narrative Anweisung (Ton + Struktur + Rückbezug)
└─────────── C5: Commit-Sequenz #5
```

### J3 = Narrative Anweisung, NICHT fixer Joke-Text

Der Composite-Hash sagt WIE erzählt werden soll. Der eigentliche Text entsteht pro Commit generativ aus den Commit-Fakten + der Anweisung.

J-Wert-Dekodierung:
- j % 10 → Ton (sachlich/sarkastisch/erschöpft/triumphierend/selbstironisch)
- j % 5 → Struktur (Problem→Lösung/Flashback/Dialog/Faktenliste/Frage→Antwort)
- j > 50 → Starker Rückbezug auf vorherigen Commit

---

## Determinismus

```
composite[N] = derive(composite[N-1], commitHash[N])

derive():
  seed  = djb2(prevComposite + commitHash)
  rng   = new XorShift128(seed)
  nextC = prevC + 1
  nextJ = rng.nextInt(1, 100)
  nextA = rng.nextInt(1, arcCount + 1)
  nextP = rng.nextInt(1, plotCount + 1)
  → "c{nextC}j{nextJ}a{nextA}p{nextP}"
```

Gegeben `composite[0]` + alle Commit-Hashes → gesamte Chain rekonstruierbar. Verifizierbar. Keine Willkür.

---

## CHANGELOG-Verankerung

Jeder CHANGELOG-Eintrag trägt:
```markdown
> **Commit:** `a6af87a` | **Composite:** `c5j3a2p8`
```

Drei Säulen:
- Git-History (Commit-Hash)
- CHANGELOG.md (Eintrag + Verankerung)
- Commit-Layer (Composite-Chain)

Keine kann lügen ohne dass die anderen beiden sie widerlegen.

---

## verify_commit_msg.js — Neue BLOCKED-Checks

```
✅ [COMPOSITE:c5j3a2p8] Token existiert
✅ composite == derive(prevComposite, commitHash)
✅ p-Index → existierender plotchain-Node
✅ a-Index → existierender Arc
✅ CHANGELOG.md enthält Composite + Commit-Hash
```

---

## Dateien

### Neu
| Datei | Zweck |
|-------|-------|
| `commit_lore/rng.js` | XorShift128 + djb2 + derive |
| `commit_lore/composite_chain.json` | `[{seq, composite, commitHash, timestamp}]` |
| `commit_lore/narrative_params.json` | j-Wert → {Ton, Struktur, Rückbezug} |

### Umbau
| Datei | Änderung |
|-------|----------|
| `commit_lore/lore_arcs.json` | A1..A4 Keys |
| `commit_lore/plotchain.json` | p_id Feld pro Node |
| `commit_lore/update_plot.js` | --composite Parameter, p_id |
| `commit_lore/writing_rules.json` | composite_required, changelog_anchor |

### Ersetzt / Archiviert
| Datei | Grund |
|-------|-------|
| `get_sidejoke.js` → `derive_composite.js` | Kein Math.random() mehr |
| `sidejoke_pool.json` | Kein fixer Pool — generativ pro Commit |
| `build_pool.js` | Nicht mehr nötig |
| `cross_references.json` | Durch composite_chain.json abgelöst |

### Außerhalb (bleibt wo es ist)
| Datei | Zweck |
|-------|-------|
| `core/scripts/verify_commit_msg.js` | Git-Hook-Script — valideiert Commit |
| `.git/hooks/commit-msg` | Git-Hook — ruft verify_commit_msg.js auf |
| `CHANGELOG.md` | Verankert mit Commit + Composite |
| `AGENTS.md` | Regeln für Composite-Pflicht |
| `core/archive/docs/PLOT_LORE.md` | Narrative — wird weiter verbunden geschrieben |

---

## Verbindung mit PLOT_LORE.md

PLOT_LORE.md-Einträge referenzieren ab sofort den Composite-Hash:

```markdown
### [2026-06-23 20:15:00] — `[c5j3a2p8]`
> **Composite:** c5j3a2p8 → Ton: sarkastisch, Struktur: Problem→Lösung, Arc: invisible-enemies
```

Der Composite-Hash wird zum Querverweis zwischen PLOT_LORE, CHANGELOG und Git-History.

---

## Standalone-Garantie

**Plug:** `commit_lore/` + `verify_commit_msg.js` + Hook = funktionierender Commit-Layer.

**Play:** Keine Abhängigkeiten außer Node.js und Git. Keine Runtime-Imports.

**Unplug:** Hook entfernen, Folder löschen. Repo funktioniert normal weiter.

**Healthy:** `verify_commit_msg.js` blockiert nur bei Composite-Verstoß. Alle Checks sind deterministisch.
