#!/usr/bin/env node
/**
 * warm-model.js — Model-Warmup fuer @huggingface/transformers (NMT Local Provider)
 *
 * Laedt einmalig das Uebersetzungsmodell und cached es im HuggingFace-Cache.
 * Wird NICHT automatisch bei jedem Serverstart ausgefuehrt — nur manuell via
 * `npm run warm-model` oder einmalig getriggert bei Erstaktivierung.
 *
 * ROADMAP v0.23: NMT Local Provider Integration.
 * Aktuell existiert nur dieses Warmup-Script — es gibt keinen Provider-Client,
 * keinen Router-Eintrag und keinen Dispatcher-Pfad. NMT_LOCAL_ENABLED wurde aus
 * PERSISTED_KEYS entfernt (BU-040) da die Flag nie gelesen wurde (VERWAIST).
 * Vollstaendige Integration erfordert: client-factory.js NMT-Client, router.js
 * PROVIDER_CAPABILITIES + hasAccess(), dispatcher.js Routing-Pfad, GUI-Toggle.
 *
 * Model: Xenova/nllb-200-distilled-600M (CPU-only via ONNX Runtime)
 */

const MODEL_ID = 'Xenova/nllb-200-distilled-600M';
const ESTIMATED_SIZE = '~1.2 GB';

console.log('========================================');
console.log('  NMT Model Warmup');
console.log('========================================');
console.log('');
console.log(`Modell: ${MODEL_ID}`);
console.log(`Geschaetzte Groesse: ${ESTIMATED_SIZE}`);
console.log('Benoetigt Internetverbindung beim ersten Durchlauf.');
console.log('');

async function warmup() {
  try {
    const { pipeline, env } = await import('@huggingface/transformers');

    // Progress-Logging fuer den Download
    env.backends.onnx.wasm.proxy = false;

    console.log('[INFO] Lade Modell herunter (kann einige Minuten dauern)...');

    const startTime = Date.now();
    const translator = await pipeline('translation', MODEL_ID, {
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          const pct = progress.progress ? ` (${progress.progress.toFixed(1)}%)` : '';
          const file = progress.file ? ` — ${progress.file.split('/').pop()}` : '';
          process.stdout.write(`\r[DOWNLOAD] ${progress.status}${pct}${file}    `);
        } else if (progress.status === 'done') {
          console.log('');
        }
      }
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('');
    console.log(`[OK] Modell geladen und gecacht in ${elapsed}s.`);
    console.log(`Cache-Pfad: ~/.cache/huggingface/hub/models--${MODEL_ID.replace('/', '--')}`);

    // Kurzer Test-Call um zu verifizieren dass das Modell funktioniert
    console.log('[INFO] Fuehre Test-Uebersetzung durch...');
    const testResult = await translator('Hello, world!', {
      src_lang: 'eng_Latn',
      tgt_lang: 'deu_Latn'
    });
    const translated = testResult?.[0]?.translation_text || '(keine Antwort)';
    console.log(`[TEST] "Hello, world!" → "${translated}"`);

    console.log('');
    console.log('[FERTIG] Model-Warmup abgeschlossen. Das Modell ist bereit.');
  } catch (e) {
    console.error('');
    console.error(`[FEHLER] Model-Warmup fehlgeschlagen: ${e.message}`);
    if (e.message.includes('Cannot find module')) {
      console.error('  → @huggingface/transformers ist nicht installiert.');
      console.error('  → Fuerhre aus: npm install @huggingface/transformers@4.2.0');
    }
    process.exit(1);
  }
}

warmup();
