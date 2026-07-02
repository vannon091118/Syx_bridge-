// =============================================================================
// MODULE: state.js — Shared state + DOM element references
// Load FIRST — all other modules depend on these globals.
// =============================================================================
 
 
/* exported logContainer, uiPhase, uiModName, uiProgress, statScanned, statCached, statTranslated, statFailed, termReq, termRes, reqProvider, resTime, dbSamplesContainer, dotArgos, dotOllama, stages, connectors, currentConfig, providerStats, apiProviderStatus, dbSearchResults, currentRevisionsSource, currentRevisionsLang, revisionResults, liveStats, lastRunningState, statusTimeout, patchOverrideEnabled, _fps, lastFrameTime, frameCount, lastSampleRotation, displayPercent, lastTickTarget, sessionId, evtSource, _modelStatusInterval, _providerStatusInterval, _preflightWarning, _runtimeScoreData, _runEvalData, _rsMinimized, _streamViewIsLLM, RS_CATEGORY_DESCRIPTIONS, RUN_EVAL_DESCRIPTIONS */

// DOM Elements
var logContainer = document.getElementById('log');
var uiPhase = document.getElementById('ui-phase');
var uiModName = document.getElementById('ui-mod-name');
var uiProgress = document.getElementById('ui-progress');

var statScanned = document.getElementById('stat-scanned');
var statCached = document.getElementById('stat-cached');
var statTranslated = document.getElementById('stat-translated');
var statFailed = document.getElementById('stat-failed');

var termReq = document.getElementById('term-req');
var termRes = document.getElementById('term-res');
var reqProvider = document.getElementById('req-provider');
var resTime = document.getElementById('res-time');

var dbSamplesContainer = document.getElementById('db-samples');
var dotArgos = document.getElementById('dot-argos');
var dotOllama = document.getElementById('dot-ollama');

// Pipeline Stages
var stages = {
  scan: document.getElementById('stage-scan'),
  trans: document.getElementById('stage-trans'),
  polish: document.getElementById('stage-polish'),
  export: document.getElementById('stage-export')
};
var connectors = {
  c1: document.getElementById('conn-1'),
  c2: document.getElementById('conn-2'),
  c3: document.getElementById('conn-3')
};

// ── Shared State ──────────────────────────────────────────────────────
var currentConfig = {};
var providerStats = {};       // { gemini: { pass: 0, fail: 0 }, ... }
var apiProviderStatus = {};   // { gemini: { valid: 0, total: 0, rateLimited: false }, ... }
var dbSearchResults = [];
var currentRevisionsSource = '';
var currentRevisionsLang = '';
var revisionResults = [];
var liveStats = {
  activePhase: 'Idle',
  currentMod: '-',
  filesScanned: 0,
  totalFiles: 0,
  cacheHits: 0,
  newTranslations: 0,
  qaFailures: 0,
  activeThreads: 0,
  isRunning: false,
  subPhase: '',
  batchN: 0,
  totalBatches: 0,
  lastHeartbeat: 0
};
var lastRunningState = false;
var statusTimeout = null;
var patchOverrideEnabled = false;
var _fps = 60;
var lastFrameTime = performance.now();
var frameCount = 0;
var lastSampleRotation = 0;
var displayPercent = 0;
var lastTickTarget = 0;

var sessionId = 'gui-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

// SSE
var evtSource = null;

// Settings polling
var _modelStatusInterval = null;
var _providerStatusInterval = null;

// Preflight / DB repair
var _preflightWarning = null;

// Runtime Score
var _runtimeScoreData = null;
var _runEvalData = null;
var _rsMinimized = true;

// Stream view
var _streamViewIsLLM = false;

// ── Constants ─────────────────────────────────────────────────────────
var RS_CATEGORY_DESCRIPTIONS = {
  'casual': 'Gelegenheitsnutzer mit 1-2 Mods. Meist Standard-Konfiguration, niedriges Volumen.',
  'mid-range-with-keys': 'Fortgeschrittener Nutzer mit API-Keys (Groq/Gemini/OpenRouter). Mehrere Mods, aber nicht maximale Auslastung.',
  'mid-range-no-keys': 'Fortgeschrittener Nutzer OHNE API-Keys. Verlässt sich auf Free-Tier + Argos/Google Free — niedrigere Erfolgsrate.',
  'schwache-hw': 'Schwache Hardware (z.B. Steam Deck, 4GB RAM). Kein Ollama, keine lokalen Modelle. Argos/Google Free limitiert.',
  'power-ollama': 'Power Workstation mit Ollama (≥16GB RAM, GPU). Höchste lokale Qualität, aber abhängig von installierten Modellen.',
  'headless': 'Headless Linux Server / CI/CD. Kein Display, keine manuelle Intervention. Automatisierte Runs mit Fallbacks.',
  'power-api-user': 'Power-API-User mit ≥5 API-Keys. Maximale Parallelität, aber Rate-Limits bremsen oft aus (402/429).',
  'offline': 'Offline / Air-gapped. Strengster Fallback-Pfad: Argos + Google Free nur wenn installiert. Häufig keine Übersetzung möglich.'
};

var RUN_EVAL_DESCRIPTIONS = {
  'cache-efficiency': 'Anteil aus Cache — wenig API-Kosten',
  'translation-success': 'Erfolgreich übersetzt ohne Fallback',
  'quality-depth': 'Deep Polish erreicht — hohe Qualität',
  'native-efficiency': 'Ohne API-Request gelöst (Proper-Nouns, Glossary)',
  'shield-health': 'Platzhalter-Restoration erfolgreich',
  'batch-stability': 'Fehlerfreie Batches — keine Provider-Ausfälle',
  'coverage': 'Strings gefunden vs. übersetzt',
  'db-integrity': 'Nicht-flagged Einträge in der DB'
};
