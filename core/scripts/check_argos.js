const { execSync, spawnSync } = require('child_process');
const inquirer = require('inquirer');

// Cache to prevent infinite loops during a session
let argosInstalledCache = null;
// Cache the detected Python interpreter — the detection probe is expensive (spawnSync)
let _pythonCache = null;

/**
 * Detects the available Python interpreter with a robust fallback chain.
 * Verifies that the interpreter can actually RUN code (not just --version),
 * which filters out the Windows Store stub that hangs on stdin piping.
 * Result is cached for the session — call clearPythonCache() to reset.
 * @returns {string} The first working command, or 'python' as last resort
 */
function getPython() {
  if (_pythonCache !== null) return _pythonCache;
  const commands = ['python', 'python3', 'py'];
  for (const cmd of commands) {
    try {
      // Step 1: Quick version check (filters out non-existent commands)
      execSync(`${cmd} --version`, { stdio: 'ignore', timeout: 3000 });
      // Step 2: REAL code execution check (filters out Windows Store stub)
      // The Store stub passes --version but hangs on spawnSync with stdin
      const probe = spawnSync(cmd, ['-c', 'print("ok")'], { encoding: 'utf-8', timeout: 3000 });
      if (probe.status === 0 && probe.stdout && probe.stdout.includes('ok')) {
        _pythonCache = cmd;
        console.log(`[PYTHON] Detected: ${cmd}`);
        return cmd;
      }
      console.warn(`[PYTHON] "${cmd}" passed --version but fails code execution (likely Store stub) — skipping`);
    } catch (e) {}
  }
  _pythonCache = 'python'; // Fallback
  return _pythonCache;
}

function clearPythonCache() { _pythonCache = null; }

// Alias for compatibility with the Multi-Language Model Plan (P1a).
const detectPython = getPython;

function isArgosInstalled() {
  if (argosInstalledCache !== null) return argosInstalledCache;
  const python = getPython();
  try {
    execSync(`${python} -c "import argostranslate"`, { stdio: 'ignore' });
    argosInstalledCache = true;
    return true;
  } catch (e) {
    argosInstalledCache = false;
    return false;
  }
}

/**
 * Invalidates the cached install state. Useful after `ensureArgos()` or
 * `installArgosLanguage()` to force the next `isArgosInstalled()` call
 * to re-evaluate (e.g. when chaining wizard steps).
 */
function clearArgosCache() {
  argosInstalledCache = null;
}

async function ensureArgos() {
  if (isArgosInstalled()) return true;

  console.log('[!] Argos Translate (lokale KI) wurde nicht gefunden.');

  if (process.env.GUI_HEALTH_CHECK === 'true') {
    return false;
  }

  if (argosInstalledCache === false && process.env.ARGOS_INSTALL_ATTEMPTED) {
    return false;
  }

  const { install } = await inquirer.prompt([{
    type: 'confirm',
    name: 'install',
    message: 'Moechtest du Argos Translate (kostenlose lokale Uebersetzung) jetzt installieren?',
    default: true
  }]);

  if (install) {
    process.env.ARGOS_INSTALL_ATTEMPTED = 'true';
    const python = getPython();
    try {
      console.log(`[INFO] Installiere Argos Translate via ${python} -m pip...`);
      execSync(`${python} -m pip install --upgrade pip`, { stdio: 'ignore' });
      execSync(`${python} -m pip install argostranslate`, { stdio: 'inherit' });
      argosInstalledCache = true;
      console.log('[OK] Argos Translate erfolgreich installiert.');
      return true;
    } catch (e) {
      console.error('[ERROR] Installation fehlgeschlagen. Bitte installiere Python manuell und stelle sicher, dass pip verfuegbar ist.');
      console.error(`Technischer Fehler: ${e.message}`);
      return false;
    }
  }
  return false;
}

/**
 * Lists all Argos language packages that are currently installed locally.
 * Uses Python because the model manifest lives in the argostranslate package.
 * @returns {Promise<Array<{code: string, name: string}>>} Installed languages, empty on error
 */
async function getAvailableArgosLanguages() {
  const python = getPython();
  if (!isArgosInstalled()) return [];
  const script = [
    'import json',
    'try:',
    '  from argostranslate import translate',
    '  languages = translate.get_installed_languages()',
    '  result = [{"code": lang.code, "name": lang.name} for lang in languages]',
    '  print(json.dumps(result))',
    'except Exception as e:',
    '  print(json.dumps({"error": str(e)}))'
  ].join('\n');
  try {
    const result = spawnSync(python, ['-'], { input: script, encoding: 'utf-8', timeout: 5000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Python exited with code ${result.status}`);
    const out = result.stdout;
    const parsed = JSON.parse(out.trim());
    if (parsed && parsed.error) {
      console.warn(`[WARN] getAvailableArgosLanguages: ${parsed.error}`);
      return [];
    }
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn(`[WARN] getAvailableArgosLanguages fehlgeschlagen: ${e.message}`);
    return [];
  }
}

/**
 * Checks which of the given target languages have an installed EN→XX translation model.
 * @param {string[]} targetLangs - ISO 639-1 codes (e.g. ['de', 'fr', 'pl'])
 * @returns {Promise<{[code: string]: boolean}>} Map of code -> installed (false on error for all)
 */
async function checkArgosLanguages(targetLangs) {
  if (!Array.isArray(targetLangs) || targetLangs.length === 0) return {};
  if (!isArgosInstalled()) {
    return Object.fromEntries(targetLangs.map(code => [code, false]));
  }
  const python = getPython();
  const codesJson = JSON.stringify(targetLangs);
  const script = [
    'import json, sys',
    'try:',
    '  target_codes = json.loads(sys.argv[1])',
    '  from argostranslate import translate',
    '  available = {}',
    '  for code in target_codes:',
    '    available[code] = translate.get_translation_from_codes("en", code) is not None',
    '  print(json.dumps(available))',
    'except Exception as e:',
    '  print(json.dumps({"error": str(e)}))'
  ].join('\n');
  try {
    // Inline codesJson directly into the script to avoid sys.argv + shell escaping issues on Windows.
    // codesJson is already a valid Python literal (e.g. ["de"]).
    const fullScript = script.replace('json.loads(sys.argv[1])', codesJson);
    const result = spawnSync(python, ['-'], { input: fullScript, encoding: 'utf-8', timeout: 20000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(result.stderr || `Python exited with code ${result.status}`);
    const out = result.stdout;
    const parsed = JSON.parse(out.trim());
    if (parsed && parsed.error) {
      console.warn(`[WARN] checkArgosLanguages: ${parsed.error}`);
      return Object.fromEntries(targetLangs.map(code => [code, false]));
    }
    return parsed || {};
  } catch (e) {
    console.warn(`[WARN] checkArgosLanguages fehlgeschlagen: ${e.message}`);
    return Object.fromEntries(targetLangs.map(code => [code, false]));
  }
}

/**
 * Installs the Argos language model for EN→{langCode}.
 * Prefers the modern CLI: `python -m argostranslate.cli download en {code}`.
 * Falls back to the Python API on failure.
 * @param {string} langCode - Target language code (e.g. 'de', 'fr')
 * @returns {Promise<boolean>} true on success
 */
async function installArgosLanguage(langCode) {
  if (!langCode || typeof langCode !== 'string' || !/^[a-z]{2}(-[A-Z]{2})?$/.test(langCode)) {
    console.warn(`[WARN] installArgosLanguage: ungueltiger Sprachcode "${langCode}"`);
    return false;
  }
  if (!isArgosInstalled()) {
    console.warn('[WARN] installArgosLanguage: argostranslate nicht installiert. Bitte zuerst ensureArgos() aufrufen.');
    return false;
  }
  const python = getPython();
  console.log(`[INFO] Installiere Argos-Sprachmodell: en -> ${langCode}...`);

  // Primary: Modern CLI
  try {
    execSync(`${python} -m argostranslate.cli download en ${langCode}`, { stdio: 'inherit', timeout: 180000 });
    console.log(`[OK] Argos-Sprachmodell en -> ${langCode} installiert.`);
    return true;
  } catch (e) {
    console.warn(`[WARN] CLI-Download fehlgeschlagen (${e.message}). Versuche Fallback...`);
  }

  // Fallback: Python API
  const script = [
    'from argostranslate import package',
    'package.update_package_index()',
    'for pkg in package.get_available_packages():',
    `    if pkg.from_code == 'en' and pkg.to_code == '${langCode}':`,
    '        path = pkg.download()',
    '        package.install_from_path(path)',
    '        break',
    'else:',
    `    raise SystemExit('Kein Paket fuer en -> ${langCode} verfuegbar.')`,
    'print("OK")'
  ].join('\n');
  try {
    const result = spawnSync(python, ['-'], { input: script, stdio: 'inherit', timeout: 180000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Python exited with code ${result.status}`);
    console.log(`[OK] Argos-Sprachmodell en -> ${langCode} installiert (Fallback-Methode).`);
    return true;
  } catch (e) {
    console.error(`[ERROR] Argos-Installation fuer ${langCode} fehlgeschlagen: ${e.message}`);
    return false;
  }
}

if (require.main === module) {
  ensureArgos().then(ok => process.exit(ok ? 0 : 1));
}

module.exports = {
  ensureArgos,
  isArgosInstalled,
  clearArgosCache,
  getPython,
  detectPython,
  getAvailableArgosLanguages,
  checkArgosLanguages,
  installArgosLanguage
};
