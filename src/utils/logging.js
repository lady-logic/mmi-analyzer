/**
 * Logging utilities for MMI Analyzer
 */

/**
 * Log a tool call
 * @param {string} toolName - Name of the tool being called
 * @param {Object} args - Arguments passed to the tool
 */
export function logToolCall(toolName, args) {
  console.error(`[MMI] Tool call: ${toolName}`, JSON.stringify(args, null, 2));
}

/**
 * Log an error
 * @param {Error} error - The error object
 * @param {string} context - Context where the error occurred
 */
export function logError(error, context) {
  console.error(`[MMI] Error in ${context}:`, error.message);
  if (error.stack) {
    console.error(error.stack);
  }
}

/**
 * Log server startup
 */
export function logStartup() {
  console.error('[MMI] MMI Analyzer server started');
}

