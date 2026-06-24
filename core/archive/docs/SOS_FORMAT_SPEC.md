# SoS Format Specification — Songs of Syx `.txt` Files
> **Version:** v1.0.0 | **Stand:** 2026-06-25
> **Status:** Normativ — Test-Schemen und Code-Validierung richten sich nach diesem Dokument.
> **Quelle:** `extractor.js`, `parser.js`, `text-core.js`, `validator.js`, `SongsOfSyxPlugin.js`

---

## Inhaltsverzeichnis

1. [Übersicht](#1-übersicht)
2. [Grundstruktur](#2-grundstruktur)
3. [Keys](#3-keys)
4. [Values](#4-values)
5. [Escaping-Regeln](#5-escaping-regeln)
6. [Kommas als Delimiter](#6-kommas-als-delimiter)
7. [Blöcke und Verschachtelung](#7-blöcke-und-verschachtelung)
8. [Der INFO-Block](#8-der-info-block)
9. [Arrays und Listen](#9-arrays-und-listen)
10. [Kommentare und Whitespace](#10-kommentare-und-whitespace)
11. [Bekannte Sonderfälle](#11-bekannte-sonderfälle)
12. [Test-Schema](#12-test-schema)
13. [Vergleich: SoS vs. RimWorld XML](#13-vergleich-sos-vs-rimworld-xml)
14. [Referenz-Implementierung](#14-referenz-implementierung)

---

## 1. Übersicht

Songs of Syx verwendet ein **proprietäres Textformat** für Mod-Dateien (`.txt`).
Es ist **kein JSON**, **kein YAML**, **kein XML** — es ist ein einfaches
Key-Value-Format mit einigen Eigenheiten, die bei der automatisierten
Übersetzung berücksichtigt werden müssen.

### Grundform

```
KEY: "value",
```

**Das ist alles.** Eine Zeile, ein Key, ein Wert in doppelten Anführungszeichen,
ein Komma als Abschluss. Alles andere ist Variationen davon.

---

## 2. Grundstruktur

### 2.1 Einfacher Key-Value-Eintrag

```
NAME: "Aruan",
DESC: "A proud race of warriors",
INFO: "Known for their strength and honor",
```

### 2.2 Ohne Key (bare strings)

In manchen Dateien (z.B. Dictionary-Dateien `Dic.txt`) stehen Werte ohne Key:

```
"First entry",
"Second entry",
"Third entry",
```

### 2.3 Mehrzeilige Werte

SoS unterstützt **keine nativen Mehrzeilien-Werte** innerhalb einer Zeile.
Mehrzeiliger Text wird durch `\n` escaped:

```
DESC: "This is line one.\nThis is line two.\nAnd line three.",
```

### 2.4 Kommentare

Es gibt **keine offizielle Kommentar-Syntax**. Zeilen die kein Key-Value-Muster
matchen, werden vom Spiel ignoriert oder als Fehler behandelt.

---

## 3. Keys

### 3.1 Erlaubte Zeichen

```
[a-zA-Z0-9_]+
```

Keys bestehen aus **Buchstaben, Ziffern und Unterstrichen**. Groß-/Kleinschreibung
wird beibehalten, ist aber semantisch irrelevant (Spiel liest case-insensitive).

### 3.2 Typische Key-Namen

| Key | Zweck | Beispiel |
|-----|-------|----------|
| `NAME` | Anzeigename | `NAME: "Aruan",` |
| `DESC` | Beschreibung | `DESC: "A proud race",` |
| `INFO` | Ausführliche Info | `INFO: "Known for...",` |
| `DESCRIPTION` | Alternative zu DESC | `DESCRIPTION: "...",` |
| `AUTHOR` | Mod-Autor | `AUTHOR: "Vannon",` |
| `VERSION` | Version als String | `VERSION: "1.0.0",` |
| `GAME_VERSION_MAJOR` | Versionsnummer (kein String!) | `GAME_VERSION_MAJOR: 71,` |

### 3.3 Key-Value-Trennzeichen

```
KEY: "value"
    ^^^^^^^
    Doppelpunkt + optionales Whitespace
```

Regex: `^\s*[A-Za-z0-9_]+\s*:\s*`

**Wichtig:** Der Doppelpunkt IST das Trennzeichen. Leerzeichen danach sind
optional. `"KEY:value"` ist genauso gültig wie `"KEY: value"`.

### 3.4 Keys ohne Values (Struktur-Keys)

Einige Keys öffnen Blöcke statt einen String-Wert zu enthalten:

```
INFO: {
  ...
},
```

Siehe [Abschnitt 7: Blöcke](#7-blöcke-und-verschachtelung).

---

## 4. Values

### 4.1 String-Values (Standard)

Werte sind in **doppelten Anführungszeichen** eingeschlossen:

```
NAME: "Aruan",
```

**Regeln:**
- Öffnendes `"` und schließendes `"` auf der gleichen Zeile
- Keine einfachen Anführungszeichen `'` als Alternative
- Keine mehrzeiligen Strings (Newline muss escaped sein)

### 4.2 Numerische Values

Manche Felder sind numerisch und haben **keine** Anführungszeichen:

```
GAME_VERSION_MAJOR: 71,
GAME_VERSION_MINOR: 0,
```

### 4.3 Boolean-Values

```
ENABLED: true,
VISIBLE: false,
```

Keine Anführungszeichen, keine Kommas nach Boolean-Werten (je nach Datei).

### 4.4 Block-Values

Siehe [Abschnitt 7](#7-blöcke-und-verschachtelung).

---

## 5. Escaping-Regeln

### 5.1 Die drei Escape-Sequenzen

| Sequenz | Bedeutung | Beispiel |
|---------|-----------|----------|
| `\"` | Doppeltes Anführungszeichen | `He said \"Hello\"` |
| `\\` | Backslash | `Path: C:\\Users\\...` |
| `\n` | Newline (Zeilenumbruch) | `Line1\nLine2` |

### 5.2 Reihenfolge beim Unescaping (KRITISCH!)

Die Reihenfolge in `extractor.js:unescapeTextValue()` ist **nicht vertauschbar**:

```javascript
// 1. Strip watermarks (ZWSP/ZWNJ) — VOR dem Unescaping
// 2. \n → newline
// 3. \" → "
// 4. \\ → \  (MUSS LETZT kommen!)
```

**Datei-Inhalt → Code-Regex → Ergebnis:**

| Datei-Inhalt | Regex matched | Ergebnis |
|--------------|---------------|----------|
| `\\n`        | `/\\n/g` (backslash + n) | newline `\n` |
| `\\"`        | `/\\"/g` (backslash + quote) | Quote `"` |
| `\\\\`       | `/\\\\/g` (doppel-backslash) | Single Backslash `\` |

**Warum Reihenfolge kritisch:** Würde `\\` zuerst unescaped, würde `\\n` zu `\n` werden (backslash + n),
dann `\n` zu newline — statt korrekt backslash + newline.

**Warum?** Wenn `\\` zuerst unescaped würde:
- Input: `\\n` (literal backslash + n)
- Falsch: `\` + `n` → newline ← FALSCH!
- Richtig: `\n` (erst wird `\\n` zu `\` + `\n`, dann `\n` zu newline)

**Eigene Regel:** `\\\\` MUSS als letztes unescaped werden, sonst
Doppel-Unescaping.

### 5.3 Reihenfolge beim Escaping

```javascript
// escapeTextValue():
// 1. \\ → \\\\  (Backslash escapen)
// 2. \" → \\\"  (Quotes escapen)
// 3. newline → \\n  (Newlines escapen)
```

### 5.4 Wasserzeichen (ZWSP/ZWNJ)

SyxBridge nutzt **Zero-Width Space** (`\u200B`) und **Zero-Width Non-Joiner**
(`\u200C`) als unsichtbare Marker. Diese werden **vor** dem Unescaping
entfernt, weil ein Watermark zwischen `\` und `n` das Unescaping sabotieren
würde.

---

## 6. Kommas als Delimiter

### 6.1 Komma nach dem Value

```
NAME: "Aruan",   ← KOMMA
DESC: "Warrior", ← KOMMA
```

Das Komma ist ein **struktureller Delimiter**, der den Eintrag abschließt.
Es steht **außerhalb** der Anführungszeichen.

### 6.2 Komma am Ende einer Datei

```
LAST_ENTRY: "value",   ← Letztes Komma ist OPTIONAL
```

Manche Dateien haben ein trailing comma, manche nicht. Beide Formen sind gültig.

### 6.3 Doppeltes Komma (Fehler!)

```
NAME: "value",",   ← BROKEN! Doppeltes Komma!
```

**Ursache:** Wenn LLM-Output ein trailing comma im Value hat:
- LLM gibt die Übersetzung `value,` zurück (mit trailing comma)
- `escapeTextValue()` wrapped es: `"value,"`
- Write-back erzeugt: `NAME: "value,"` ← Komma zwischen `"` und `,` = DOPPELKOMMA!

**Schutz:** `cleanTranslationArtifact()` in `text-core.js` stript trailing
commas vom LLM-Output:

```javascript
result = result.replace(/,+$/, '');
```

### 6.4 Komma INNERHALB des Values

Kommas innerhalb des Values sind **erlaubt** und werden **nicht** escaped:

```
DESC: "The capital city, built on ancient ruins",
```

Das Komma hier ist Teil des Textes, kein Delimiter.

---

## 7. Blöcke und Verschachtelung

### 7.1 Block-Öffnung

Einige Keys öffnen einen Block mit `{` statt einem String-Value:

```
INFO: {
  KEY1: "value1",
  KEY2: "value2",
},
```

### 7.2 Geschweifte Klammern

- `{` öffnet einen Block
- `}` schließt einen Block
- Blöcke können **verschachtelt** sein
- `findClosingBrace()` in `extractor.js` trackt die Tiefe

### 7.3 Eckige Klammern

```
SOME_LIST: [
  "item1",
  "item2",
],
```

Arrays werden mit `[` und `]` begrenzt.

### 7.4 Java-Package-Notation

SoS nutzt Java-Klassen als Referenzen:

```
view.sett.ui.room.UIRoom: {
  ...
},
world.map.landmark.WorldLandmarks: {
  ...
},
```

Diese werden von `shouldTranslate()` als **nicht übersetzbar** erkannt
(Regex: `/[a-z]+\.[a-z]+\.[a-z]+\.[A-Z]/`).

---

## 8. Der INFO-Block

### 8.1 Struktur

Der `INFO`-Block ist ein **Metadaten-Block** am Anfang von Mod-Dateien:

```
INFO: {
  VERSION: "1.0.0",
  GAME_VERSION_MAJOR: 71,
  GAME_VERSION_MINOR: 0,
  NAME: "My Mod",
  DESC: "A great mod",
  AUTHOR: "Mod Author",
},
```

### 8.2 Warum wird er NICHT übersetzt?

Der INFO-Block enthält **Engine-Metadaten**. Die Keys `VERSION`,
`GAME_VERSION_MAJOR`, `GAME_VERSION_MINOR` sind numerisch und werden
von `shouldTranslate()` gefiltert.

Aber `NAME`, `DESC`, `INFO` innerhalb des Blocks sind **Anzeigetext**,
der vom Launcher gelesen wird. Übersetzen würde die Mod-Struktur korruptieren.

**SyxBridge-Lösung:** `extractStrings()` erkennt den INFO-Block über
`/(?:^|\n)\s*INFO\s*:\s*\{/` und überspringt alle Strings innerhalb
dieses Bereichs.

### 8.3 _Info.txt (Separate Metadaten-Datei)

Mod-Ordner haben eine `_Info.txt` am Root:

```
VERSION: "1.0.0",
GAME_VERSION_MAJOR: 71,
GAME_VERSION_MINOR: 0,
NAME: "My Mod",
DESC: "Description",
AUTHOR: "Author",
INFO: "Instructions for users",
```

**Hier** werden `NAME`, `DESC`, `INFO` sehr wohl übersetzt — sie sind
**kein** INFO-Block, sondern eigenständige Key-Value-Einträge.

---

## 9. Arrays und Listen

### 9.1 Explizite Arrays

```
ITEMS: [
  "Sword",
  "Shield",
  "Bow",
],
```

### 9.2 Implizite Listen (bare strings)

In Dictionaries und Text-Dateien:

```
"Warrior",
"Archer",
"Healer",
"Scholar",
```

Jede Zeile ist ein eigener Eintrag, getrennt durch Komma + Newline.

---

## 10. Kommentare und Whitespace

### 10.1 Whitespace

- **Leading whitespace** vor Keys ist erlaubt (Einrückung für Lesbarkeit)
- **Whitespace nach dem Doppelpunkt** ist optional
- **Trailing whitespace** nach dem Komma wird ignoriert
- **Tabs vs. Spaces** — beides wird akzeptiert

### 10.2 Zeilenumbrüche

- `\r\n` (Windows) und `\n` (Unix) werden beide akzeptiert
- `extractStrings()` nutzt `/\r?\n/` zum Splitten
- Leere Zeilen werden ignoriert

### 10.3 Keine Kommentar-Syntax

Es gibt kein `#`, `//`, oder `/* */`. Zeilen die nicht dem Key-Value-Muster
entsprechen, werden je nach Kontext ignoriert oder als Fehler behandelt.

---

## 11. Bekannte Sonderfälle

### 11.1 `__OVERWRITE: true`

Eine Workshop-Direktive die besagt, dass die Mod Dateien überschreibt:

```
__OVERWRITE: true,
```

SyxBridge **ändert diese Zeile nicht** — sie ist eine legitime Mod-Autoren-Direktive.

### 11.2 Leere Values

```
DESC: "",
```

Leere Strings werden von `shouldTranslate()` als nicht übersetzbar gefiltert.

### 11.3 URLs als Values

```
HOMEPAGE: "https://steamcommunity.com/sharedfiles/filedetails/?id=12345",
```

URLs werden von `classifyString()` als `URL` klassifiziert und nicht übersetzt.

### 11.4 Interne IDs

```
RACE_ID: "ARUAN",
BUILDING_TYPE: "ROOM_THRONE",
```

Werte die nur aus `[A-Z0-9_]` bestehen und keine Leerzeichen enthalten,
werden als `INTERNAL_ID` klassifiziert.

### 11.5 Escape-Sequenz am String-Ende

```
DESC: "Path ends with backslash: C:\\",
```

**Problem:** Das `\"` am Ende wird als escaped quote erkannt,
aber das schließende `"` fehlt.

**Lösung:** Die Regex `/"((?:\\.|[^"\\])*)"/` matcht korrekt,
weil `\\.` das `\"` als escaped character matched.

### 11.6 Mehrfache Backslashes

```
PATH_TEXT: "C:\\Users\\Documents",
```

Zwei Backslashes in der Datei → ein Backslash im Spiel.
Escaped: `\\` → `\` (pro Paar ein Backslash).

---

## 12. Test-Schema

### 12.1 Test-Schema für Songs of Syx `.txt` Dateien

Dieses Schema beschreibt was eine **valide** SoS-Datei ist.
Tests müssen diese Regeln prüfen und **laute, ortsgenaue Fehler** melden.

#### Grundregeln

```
RULE-01: Jeder Key-Value-Eintrag steht auf einer eigenen Zeile
RULE-02: Keys matchen /^[A-Za-z0-9_]+/
RULE-03: Doppelpunkt nach dem Key (optional Whitespace)
RULE-04: String-Values in doppelten Anführungszeichen
RULE-05: Komma nach dem Value (außerhalb der Quotes)
RULE-06: Escaped Quotes \" innerhalb des Values
RULE-07: Escaped Backslash \\ innerhalb des Values
RULE-08: Escaped Newline \n innerhalb des Values
RULE-09: INFO-Block: geschweifte Klammern, verschachtelt
RULE-10: Numerische Values ohne Quotes (GAME_VERSION_*)
```

#### Valide Beispiele

```txt
# Valide — Standard-Key-Value
NAME: "Aruan",
DESC: "A proud race of warriors",

# Valide — Escaping
QUOTE_TEXT: "He said \"Hello\" to them",
PATH_TEXT: "Located at C:\\Users\\Data",
MULTILINE: "Line one.\nLine two.\nLine three.",

# Valide — Numerisch
GAME_VERSION_MAJOR: 71,
GAME_VERSION_MINOR: 0,

# Valide — Block
INFO: {
  NAME: "My Mod",
  DESC: "Description",
},

# Valide — Bare String (Dictionary)
"First entry",
"Second entry",

# Valide — Letztes Komma optional
LAST: "value"
```

#### Invalide Beispiele

```txt
# INVALID — Fehlende Quotes
NAME: Aruan,           ← Quotes fehlen!

# INVALID — Einfache Quotes
NAME: 'Aruan',         ← Muss doppelte Quotes sein!

# INVALID — Komma innerhalb der Quotes
NAME: "Aruan",",       ← Komma MUSS außerhalb!

# INVALID — Doppeltes Komma
NAME: "Aruan",,        ← Doppelkomma!

# INVALID — Unescaped Quote im Value
DESC: "He said "Hello"", ← Quote muss escaped sein!

# INVALID — Falsche Escape-Reihenfolge (Code-Fehler, nicht Datei-Fehler)
# \\ wird vor \n unescaped → Backslash + n wird zu newline statt zu \n

# INVALID — INFO-Block nicht geschlossen
INFO: {
  NAME: "test",
  ← fehlendes } !
```

### 12.2 Test-Schema-Regex (für automatisierte Prüfung)

```javascript
// Grundstruktur: Key-Value mit Escape-Support
const SOS_LINE_REGEX = /^\s*([A-Za-z0-9_]+)\s*:\s*"((?:\\.|[^"\\])*)",?\s*$/;

// Block-Öffnung
const SOS_BLOCK_OPEN = /^\s*([A-Za-z0-9_]+)\s*:\s*\{/;

// Numerischer Value
const SOS_NUMERIC = /^\s*([A-Za-z0-9_]+)\s*:\s*(\d+),?\s*$/;

// Bare String (Dictionary)
const SOS_BARE_STRING = /^\s*"((?:\\.|[^"\\])*)",?\s*$/;

// Komma-Check: AUSSERHALB der Quotes
// valider: "value",
// invalider: "value,"  (Komma IN den Quotes)
```

### 12.3 Test-Matrix

| Test | Beschreibung | Erwartung | Fehlermeldung |
|------|-------------|-----------|---------------|
| T-01 | Key matcht `[A-Za-z0-9_]+` | true | `KEY_INVALID: Zeile {n} — Key "{key}" enthält ungültige Zeichen` |
| T-02 | Doppelpunkt nach Key | true | `MISSING_COLON: Zeile {n} — Kein ":" nach Key "{key}"` |
| T-03 | Value in doppelten Quotes | true | `MISSING_QUOTES: Zeile {n} — Value nicht in doppelten Quotes` |
| T-04 | Komma AUSSERHALB der Quotes | true | `COMMA_INSIDE_QUOTES: Zeile {n} — Komma muss nach dem schließenden Quote stehen` |
| T-05 | Kein doppeltes Komma | true | `DOUBLE_COMMA: Zeile {n} — Doppeltes Komma nach Value` |
| T-06 | Escape-Sequenzen korrekt | true | `BAD_ESCAPE: Zeile {n} — Ungültige Escape-Sequenz "{seq}"` |
| T-07 | Quote-Parity Source vs. Target | `sourceQuotes % 2 === targetQuotes % 2` | `QUOTE_PARITY_MISMATCH: source={s} target={t}` |
| T-08 | Key-Anzahl: Source vs. Target | gleich | `KEY_COUNT_MISMATCH: source={s} target={t}` |
| T-09 | Zeilen-Anzahl: Source vs. Target | ±20% oder ±5 | `LINE_COUNT_DIFF: source={s} target={t}` |
| T-10 | Marker-Erhalt (Placeholders) | 100% | `MARKER_LOST: "{marker}" fehlt in Translation` |
| T-11 | Shield-Token-Restore | 100% | `SHIELD_LEAK: Token __SHLD_{n}__ nicht restored` |
| T-12 | INFO-Block Struktur | geschlossen | `INFO_BLOCK_UNCLOSED: Schließende } fehlt` |
| T-13 | Translation ≠ Struktur-Key | `!/^[A-Z_][A-Z0-9_]*:\s*$/.test(target)` | `STRUCTURAL_KEY_LEAK: Zeile {n} — Translation "{val}" sieht aus wie ein Struktur-Key` |

### 12.4 Test-Schema für RimWorld XML (Zukunft)

```xml
<!-- Grundstruktur -->
<LanguageData>
  <Key>Value</Key>
</LanguageData>

<!-- Valide -->
<Label>Wächter</Label>
<Description>Ein starker Beschützer</Description>

<!-- Invalide — Key-Fehlt -->
<Value ohne Key</Value>

<!-- Invalide — Nicht geschlossenes Tag -->
<Label>Wächter
```

**XML-Regeln:**
- Jeder Eintrag: `<Key>Value</Key>`
- Keine Attribute
- Keine Escape-Sequenzen (nur XML-Entities: `&amp;`, `&lt;`, `&gt;`)
- Encoding: `utf-8` (Deklaration am Dateianfang)

---

## 13. Vergleich: SoS vs. RimWorld XML

| Aspekt | Songs of Syx (.txt) | RimWorld (.xml) |
|--------|-------------------|-----------------|
| Format | `KEY: "value",` | `<Key>Value</Key>` |
| Quotes | Doppelte `"` als Wrapper | Keine (nur XML-Entities) |
| Komma | Struktur-Delimiter außerhalb | Kein Komma |
| Escaping | `\"`, `\\`, `\n` | `&amp;`, `&lt;`, `&gt;` |
| Mehrzeilig | `\n` escaped | Innerhalb von Tags erlaubt |
| Blöcke | `{ ... }` | `<Parent>...</Parent>` |
| Kommentare | Keine | `<!-- ... -->` |
| Encoding | UTF-8 implizit | `<?xml version="1.0" encoding="utf-8"?>` |
| Parser | Regex-basiert (`extractStrings()`) | DOM-basiert |
| Validation | Quote-Balance + Key-Count | Tag-Balance + Closing-Tag-Count |

---

## 14. Referenz-Implementierung

### 14.1 Extraction (extractor.js)

```javascript
// Haupt-Regex: KEY optional, Value in Quotes
const regex = /(?:([a-zA-Z0-9_]+)\s*:\s*)?\"((?:\\.|[^\"\\])*)\"/g;

// INFO-Block-Erkennung
const infoMatch = content.match(/(?:^|\n)\s*INFO\s*:\s*\{/);

// Closing-Brace-Finder (Tiefe-Tracking)
function findClosingBrace(content, openBraceIndex) {
  let depth = 1;
  for (let i = openBraceIndex + 1; i < content.length && depth > 0; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
```

### 14.2 Unescaping (extractor.js)

```javascript
function unescapeTextValue(value) {
  return stripWatermarks(value)   // 1. Watermarks zuerst
    .replace(/\\n/g, '\n')         // 2. Escaped Newline → echtes Newline
    .replace(/\\"/g, '"')          // 3. Escaped Quote → echtes Quote
    .replace(/\\\\/g, '\\');       // 4. Doppel-Backslash → Single (LETZT!)
}
```

### 14.3 Escaping (extractor.js)

```javascript
function escapeTextValue(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')        // 1. Backslash escapen
    .replace(/"/g, '\\"')          // 2. Quotes escapen
    .replace(/\r?\n/g, '\\n');     // 3. Newlines escapen
}
```

### 14.4 Validation (validator.js + SongsOfSyxPlugin.js)

```javascript
// Plugin-delegiert via validateFileSyntax._plugin
// SoS-Check: Key-Count, Quote-Balance, Line-Count
function validateFileSyntax(sourceContent, targetContent) {
  const sourceKeys = (sourceContent.match(/^\s*[A-Za-z0-9_]+:\s*/gm) || []).length;
  const targetKeys = (targetContent.match(/^\s*[A-Za-z0-9_]+:\s*/gm) || []).length;
  if (sourceKeys !== targetKeys) issues.push(`KEY_COUNT_MISMATCH: ...`);

  const sourceQuotes = (sourceContent.match(/"/g) || []).length;
  const targetQuotes = (targetContent.match(/"/g) || []).length;
  if (sourceQuotes % 2 !== targetQuotes % 2) issues.push(`UNBALANCED_QUOTES: ...`);
}
```

### 14.5 Placeholder-Regex (SongsOfSyxPlugin.js)

```javascript
// Alle SoS-Placeholder/Formate:
/<[^>]+>|__VAR\d+__|\{[^}]+\\}|\$[A-Za-z0-9_]+|%[^%\s]+%/g

// Bedeutung:
// <tag>         — HTML-ähnliche Tags (z.B. <c:FF0000>)
// __VAR0__      — SyxBridge-interne Variablen
// {0}, {name}   — Spiel-Platzhalter
// $VAR          — Shell-ähnliche Variablen
// %s, %d        — Printf-Platzhalter
```

---

## Anhang A: Komplettes Beispiel

### Quelldatei (Englisch)

```txt
VERSION: "1.0.0",
GAME_VERSION_MAJOR: 71,
GAME_VERSION_MINOR: 0,
NAME: "Aruan Race",
DESC: "A proud race of warriors from the northern mountains.",
INFO: {
  NAME: "Aruan",
  DESC: "The Aruan are known for their strength and honor.",
  AUTHOR: "Game Creator",
},
BIO: {
  TRAIT.PROUD: "They carry themselves with an air of superiority that is both admirable and off-putting.",
  TRAIT.BRAVE: "In battle, an Aruan never retreats. This is not foolishness — it is tradition.",
},
TEXT: {
  WELCOME: "Welcome to the Aruan settlement, traveler.",
  WARNING: "The mountains are dangerous. Take a guide.",
  FAREWELL: "May the winds carry you safely home.",
},
```

### Übersetzte Datei (Deutsch)

```txt
VERSION: "1.0.0",
GAME_VERSION_MAJOR: 71,
GAME_VERSION_MINOR: 0,
NAME: "Aruan Rasse",
DESC: "Ein stolzes Volk von Kriegern aus den nördlichen Bergen.",
INFO: {
  NAME: "Aruan",
  DESC: "The Aruan are known for their strength and honor.",
  AUTHOR: "Game Creator",
},
BIO: {
  TRAIT.PROUD: "Sie tragen sich mit einer Überlegenheit, die sowohl bewundernswert als auch abschreckend ist.",
  TRAIT.BRAVE: "In der Schlacht weicht ein Aruan nie zurück. Das ist keine Dummheit — es ist Tradition.",
},
TEXT: {
  WELCOME: "Willkommen in der Aruan-Siedlung, Reisender.",
  WARNING: "Die Berge sind gefährlich. Nimm einen Führer mit.",
  FAREWELL: "Mögen die Winde dich sicher nach Hause tragen.",
},
```

**Was passiert:**
- `VERSION`, `GAME_VERSION_*` → nicht übersetzt (numerisch)
- `INFO`-Block → **nicht übersetzt** (Engine-Metadaten)
- `NAME`, `DESC`, `BIO`, `TEXT` → übersetzt
- Keys bleiben **identisch** (nur Values ändern sich)
- Kommas, Quotes, Escaping → **identisch** zum Original

---

## Anhang B: Checkliste für Test-Entwicklung

- [ ] T-01 bis T-12 implementiert als Test-Schema
- [ ] Jeder Test gibt **Zeilennummer + Key + konkreten Fehler** aus
- [ ] Tests sind **format-spezifisch** (SoS ≠ RimWorld)
- [ ] Tests prüfen **nur Struktur**, nicht Inhalt (Qualität ist LLM-Sache)
- [ ] Tests **reparieren nicht** automatisch — sie melden nur
- [ ] Neue Formate: Plugin via `registerFormat()` registrieren, eigenes Test-Schema

---

*Erstellt 2026-06-25 — System-Überblick Doku-Achse, 5. von 5 Dokumenten.*
