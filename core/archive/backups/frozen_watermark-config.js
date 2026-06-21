// FROZEN COPY - SyxBridge Security Archive
// Erstellt: 2026-06-19
// Quelle: C:/Users/Vannon/Desktop/SyxBridge_Live/core/src/watermark-config.js
// AENDERUNGEN NUR UEBER ARCHIV-AKTUALISIERUNG
// ==================================================

/**
 * watermark-config.js – Shared Watermark Configuration
 *
 * Single source of truth for invisible Unicode markers.
 * HARDCODED – nicht ueber .env oder UI deaktivierbar.
 */

const WATERMARK_CONFIG = Object.freeze({
  /** Unsichtbare Unicode-Marker: ZWSP und ZWNJ */
  ZW_MARKERS: Object.freeze([
    '​', // Zero-Width Space
    '‌'  // Zero-Width Non-Joiner
  ]),

  /** Zufalls-Marker aus ZW_MARKERS auswaehlen */
  randomZWMarker() {
    return this.ZW_MARKERS[Math.floor(Math.random() * this.ZW_MARKERS.length)];
  }
});

module.exports = WATERMARK_CONFIG;
