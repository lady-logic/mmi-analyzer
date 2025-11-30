import fs from 'fs';
import path from 'path';

const HISTORY_FILE = 'monitoring-history.json';
const MAX_MEASUREMENTS = 1000; // Per project

// In-memory cache
let history = {};

/**
 * Load history from disk
 */
export function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf8');
      history = JSON.parse(data);
      console.error(`[MMI] Loaded history for ${Object.keys(history).length} projects`);
    } else {
      history = {};
      console.error(`[MMI] No existing history found, starting fresh`);
    }
  } catch (error) {
    console.error(`[MMI] Error loading history:`, error.message);
    history = {};
  }
}

/**
 * Save history to disk
 */
function saveHistoryToDisk() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error(`[MMI] Error saving history:`, error.message);
  }
}

/**
 * Initialize monitoring for a project
 * @param {string} projectPath - Path to the project
 */
export function initializeProject(projectPath) {
  if (!history[projectPath]) {
    history[projectPath] = {
      started: new Date().toISOString(),
      measurements: []
    };
    saveHistoryToDisk();
  }
}

/**
 * Add a measurement to history
 * @param {string} projectPath - Path to the project
 * @param {Object} scores - { layering, encapsulation, abstraction, overall, filesAnalyzed }
 */
export function addMeasurement(projectPath, scores) {
  if (!history[projectPath]) {
    initializeProject(projectPath);
  }

  const measurement = {
    timestamp: new Date().toISOString(),
    layering: scores.layering,
    encapsulation: scores.encapsulation,
    abstraction: scores.abstraction,
    overall: scores.overall,
    filesAnalyzed: scores.filesAnalyzed
  };

  history[projectPath].measurements.push(measurement);

  // Limit to MAX_MEASUREMENTS (remove oldest)
  if (history[projectPath].measurements.length > MAX_MEASUREMENTS) {
    history[projectPath].measurements = history[projectPath].measurements.slice(-MAX_MEASUREMENTS);
  }

  console.error(`[MMI] Added measurement for ${projectPath}: overall=${scores.overall.toFixed(1)}`);
  
  saveHistoryToDisk();
}

/**
 * Get complete history for a project
 * @param {string} projectPath - Path to the project
 * @returns {Object|null} - History object or null if not found
 */
export function getHistory(projectPath) {
  return history[projectPath] || null;
}

/**
 * Get current (latest) score for a project
 * @param {string} projectPath - Path to the project
 * @returns {Object|null} - Latest measurement or null
 */
export function getCurrentScore(projectPath) {
  const projectHistory = history[projectPath];
  if (!projectHistory || projectHistory.measurements.length === 0) {
    return null;
  }

  return projectHistory.measurements[projectHistory.measurements.length - 1];
}

/**
 * Get all monitored projects
 * @returns {string[]} - Array of project paths
 */
export function getMonitoredProjects() {
  return Object.keys(history);
}

/**
 * Get monitoring statistics for a project
 * @param {string} projectPath - Path to the project
 * @returns {Object|null} - Statistics or null
 */
export function getProjectStats(projectPath) {
  const projectHistory = history[projectPath];
  if (!projectHistory || projectHistory.measurements.length === 0) {
    return null;
  }

  const measurements = projectHistory.measurements;
  const first = measurements[0];
  const last = measurements[measurements.length - 1];

  return {
    started: projectHistory.started,
    measurementCount: measurements.length,
    firstScore: first.overall,
    currentScore: last.overall,
    improvement: last.overall - first.overall,
    duration: getDuration(projectHistory.started)
  };
}

/**
 * Calculate duration since start
 * @param {string} startTime - ISO timestamp
 * @returns {string} - Human readable duration
 */
function getDuration(startTime) {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now - start;
  
  const hours = Math.floor(diffMs / 1000 / 60 / 60);
  const minutes = Math.floor((diffMs / 1000 / 60) % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}

/**
 * Remove a project from history
 * @param {string} projectPath - Path to the project
 */
export function removeProject(projectPath) {
  if (history[projectPath]) {
    delete history[projectPath];
    saveHistoryToDisk();
    console.error(`[MMI] Removed project from history: ${projectPath}`);
  }
}

/**
 * Get recent measurements (for trend display)
 * @param {string} projectPath - Path to the project
 * @param {number} count - Number of recent measurements to get
 * @returns {Array} - Array of measurements
 */
export function getRecentMeasurements(projectPath, count = 10) {
  const projectHistory = history[projectPath];
  if (!projectHistory || projectHistory.measurements.length === 0) {
    return [];
  }

  return projectHistory.measurements.slice(-count);
}

// Load history on module import
loadHistory();