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
