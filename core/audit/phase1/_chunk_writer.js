// Master chunk writer - Phase 1.1 alle 14 Provider-Tag-Chunks
// Pfad: core/audit/phase1/_chunk_writer.js -> ../../src/db ist core/src/db
const db = require('../../src/db');
const fs = require('fs');
const path = require('path');

// Deterministische Tag-Chunks nach Thinker-Phase-1.0-Strategie
// Reihenfolge: provider DESC nach Anzahl (groesste Chunks zuerst)
const CHUNKS = [
  { provider: 'ab_polish',       limit: 337, offset: 0,    file: 'chunk_01_ab_polish_a.jsonl' },
  { provider: 'ab_polish',       limit: 337, offset: 337,  file: 'chunk_02_ab_polish_b.jsonl' },
  { provider: 'ab_polish',       limit: 337, offset: 674,  file: 'chunk_03_ab_polish_c.jsonl' },
  { provider: 'ab_polish',       limit: 337, offset: 1011, file: 'chunk_04_ab_polish_d.jsonl' },
  { provider: 'native_runtime',  limit: 317, offset: 0,    file: 'chunk_05_native_a.jsonl'    },
  { provider: 'native_runtime',  limit: 317, offset: 317,  file: 'chunk_06_native_b.jsonl'    },
  { provider: 'native_runtime',  limit: 317, offset: 634,  file: 'chunk_07_native_c.jsonl'    },
  { provider: 'native_runtime',  limit: 315, offset: 951,  file: 'chunk_08_native_d.jsonl'    },
  { provider: 'google_free',     limit: 291, offset: 0,    file: 'chunk_09_google_a.jsonl'    },
  { provider: 'google_free',     limit: 291, offset: 291,  file: 'chunk_10_google_b.jsonl'    },
  { provider: 'argos',           limit: 261, offset: 0,    file: 'chunk_11_argos_a.jsonl'     },
  { provider: 'argos',           limit: 261, offset: 261,  file: 'chunk_12_argos_b.jsonl'     },
  { provider: 'openrouter',      limit: 202, offset: 0,    file: 'chunk_13_openrouter.jsonl'  },
  { provider: 'polish_single',   limit: 999, offset: 0,    file: 'chunk_14a_polish_single.jsonl' },
  { provider: 'groq',            limit: 999, offset: 0,    file: 'chunk_14b_groq.jsonl'        }
];

// QUAL-OFFENSIVE Fix #2 (Thinker):
// Multi-Tag-Klassifikation statt first-match-wins.
// Vorher: source_reused + q=25 wurde als source_reused klassifiziert UND low_score
// war unsichtbar. Mit pipe-separierter Tags kann man Beides gleichzeitig sehen.
// Reihenfolge in tags[] bleibt deterministisch — sortierbar für stabile Aggregation.
function classify(row) {
  const src = String(row.source_text || '');
  const tgt = String(row.translation || '');
  const tags = [];
  if (tgt === src && tgt.length > 0) tags.push('source_reused');
  if (row.quality_score < 30) tags.push('low_score');
  if (row.audit_stage === 0 && row.provider === 'native_runtime') tags.push('native_stale');
  if (tgt === '') tags.push('empty');
  if (/^[0-9]+$/.test(tgt)) tags.push('numeric');
  return tags.length > 0 ? tags.join('|') : null;
}

(async () => {
  await db.init();
  const D = db.db();
  const baseOut = __dirname;
  let total = 0;
  const failures = [];

  // Q7-Fix (Reviewer): per-Chunk try/catch + accumulate failures.
  // Ein einzelner Provider-Fehler darf nicht alle anderen Chunks abbrechen.
  for (const c of CHUNKS) {
    try {
      const rows = await new Promise((resolve, reject) => {
        D.all(
          'SELECT source_text, translation, provider, flag_reason, quality_score, audit_stage, flagged FROM translations WHERE provider = ? ORDER BY ROWID LIMIT ? OFFSET ?',
          [c.provider, c.limit, c.offset],
          (err, rs) => err ? reject(err) : resolve(rs)
        );
      });
      const out = path.join(baseOut, c.file);
      // Review-Phase-2-Fix (Idempotenz/Stale-Data): vorheriges Run-File loeschen
      // BEVOR wir neu schreiben — sonst mischt Aggregation Daten verschiedener
      // Generationen wenn ein Chunk in einem Run failed ist.
      try { fs.unlinkSync(out); } catch (_) { /* no prior file */ }
      const jsonl = rows.map(r => JSON.stringify({
        s: String(r.source_text || '').slice(0, 80),
        t: String(r.translation || '').slice(0, 80),
        p: r.provider,
        f: r.flag_reason || '',
        q: r.quality_score,
        sg: r.audit_stage,
        fl: r.flagged,
        a: classify(r)
      })).join('\n') + '\n';
      fs.writeFileSync(out, jsonl, 'utf-8');
      console.log(`OK ${c.file}: ${rows.length} Eintraege`);
      total += rows.length;
    } catch (err) {
      const msg = (err && err.message) ? err.message : String(err);
      console.error(`[FAIL] ${c.file}: ${msg}`);
      failures.push({ chunk: c.file, error: msg });
    }
  }

  console.log(`===== MASTER WRITE TOTAL: ${total} Eintraege in ${CHUNKS.length - failures.length}/${CHUNKS.length} Chunks =====`);
  // Review-Phase-2-Fix (Safe-Close): DB.close in eigene Try/Warn-Huelle, damit
  // close-Fehler nicht als FATAL eskalieren sondern sauber als WARN geloggt werden.
  const closeSafely = (label) => new Promise(r => {
    try {
      if (D && typeof D.close === 'function') D.close(r); else r();
    } catch (e) {
      console.error(`[WARN] ${label} close-Fehler: ${e.message}`);
      r();
    }
  });
  if (failures.length > 0) {
    console.error(`[WARN] ${failures.length} Chunks fehlgeschlagen:`);
    for (const f of failures) console.error(`  - ${f.chunk}: ${f.error}`);
    // Hard-Exit nur wenn >50% fehlgeschlagen sind (Audit wertlos sonst)
    if (failures.length > CHUNKS.length / 2) {
      console.error('[ABORT] Mehr als die Haelfte der Chunks fehlgeschlagen — Audit nicht verwertbar.');
      await closeSafely('ABORT');
      process.exit(1);
    }
  }
  console.log('Schliesse DB...');
  await closeSafely('FINAL');
  // 0 = alles OK, 1 = mindestens 1 Chunk failed (Standard-Unix), nie 2.
  process.exit(failures.length > 0 ? 1 : 0);
})().catch(err => {
  // Letzter Schutz: nur fuer fatal-Fehler vor der Schleife (z.B. db.init wirft).
  console.error('[MASTER FATAL]', err && err.message ? err.message : err);
  process.exit(1);
});
