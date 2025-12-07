/**
 * Configuration for report formatting
 * Ermöglicht token-optimierte (compact) vs. detaillierte (detailed) Reports
 */
export const REPORT_CONFIG = {
  // Default mode: compact (spart ~65% Tokens)
  defaultMode: 'compact',
  
  // Modes
  modes: {
    compact: {
      maxViolationsShown: 5,        // Nur Top 5 Violations zeigen
      includeCodeExamples: false,   // Keine Code-Snippets
      groupSimilar: true,            // Gruppieren statt einzeln
      maxReportLength: 2000,         // Max Zeichen pro Report
      showDetailedStats: false,      // Keine ausführlichen Tabellen
      maxFilesListed: 10             // Max Dateien einzeln auflisten
    },
    detailed: {
      maxViolationsShown: 50,
      includeCodeExamples: true,
      groupSimilar: false,
      maxReportLength: 10000,
      showDetailedStats: true,
      maxFilesListed: 100
    }
  }
};

/**
 * Get report config for a mode
 * @param {string} mode - 'compact' or 'detailed'
 * @returns {Object} Configuration object
 */
export function getReportConfig(mode = 'compact') {
  return REPORT_CONFIG.modes[mode] || REPORT_CONFIG.modes.compact;
}

/**
 * Helper: Group array by key
 * @param {Array} array - Array to group
 * @param {string} key - Property to group by
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
  return array.reduce((result, item) => {
    (result[item[key]] = result[item[key]] || []).push(item);
    return result;
  }, {});
}