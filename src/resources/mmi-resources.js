import path from 'path';
import * as historyStorage from '../monitoring/history-storage.js';
import * as fileWatcher from '../monitoring/file-watcher.js';

/**
 * List all available MMI resources
 */
export function listResources() {
  const resources = [
    {
      uri: "mmi://current",
      name: "Current MMI Scores",
      description: "Current scores of all monitored projects",
      mimeType: "application/json"
    },
    {
      uri: "mmi://summary",
      name: "MMI Summary",
      description: "Quick overview of all monitored projects with status",
      mimeType: "application/json"
    }
  ];

  // Add history resource for each monitored project
  const monitoredProjects = historyStorage.getMonitoredProjects();
  for (const projectPath of monitoredProjects) {
    const projectName = path.basename(projectPath);
    resources.push({
      uri: `mmi://history/${projectName}`,
      name: `${projectName} History`,
      description: `Complete MMI score history for ${projectName}`,
      mimeType: "application/json"
    });
  }

  return resources;
}

/**
 * Read a specific resource
 */
export function readResource(uri) {
  // Parse the URI
  if (uri === "mmi://current") {
    return getCurrentResource();
  }

  if (uri === "mmi://summary") {
    return getSummaryResource();
  }

  if (uri.startsWith("mmi://history/")) {
    const projectName = uri.replace("mmi://history/", "");
    return getHistoryResource(projectName);
  }

  throw new Error(`Unknown resource: ${uri}`);
}

/**
 * Get current scores resource
 */
function getCurrentResource() {
  const monitoredProjects = historyStorage.getMonitoredProjects();
  const watchedProjects = fileWatcher.getWatchedProjects();

  const projects = {};

  for (const projectPath of monitoredProjects) {
    const projectName = path.basename(projectPath);
    const current = historyStorage.getCurrentScore(projectPath);
    const stats = historyStorage.getProjectStats(projectPath);
    const isActive = watchedProjects.includes(projectPath);

    if (current) {
      projects[projectName] = {
        path: projectPath,
        active: isActive,
        score: {
          overall: current.overall,
          layering: current.layering,
          encapsulation: current.encapsulation,
          abstraction: current.abstraction
        },
        timestamp: current.timestamp,
        filesAnalyzed: current.filesAnalyzed,
        improvement: stats.improvement,
        duration: stats.duration
      };
    }
  }

  return {
    uri: "mmi://current",
    mimeType: "application/json",
    text: JSON.stringify({
      projects,
      totalProjects: Object.keys(projects).length,
      activeProjects: watchedProjects.length,
      timestamp: new Date().toISOString()
    }, null, 2)
  };
}

/**
 * Get summary resource
 */
function getSummaryResource() {
  const monitoredProjects = historyStorage.getMonitoredProjects();
  const watchedProjects = fileWatcher.getWatchedProjects();

  const summary = {
    totalMonitored: monitoredProjects.length,
    activeMonitoring: watchedProjects.length,
    projects: []
  };

  for (const projectPath of monitoredProjects) {
    const projectName = path.basename(projectPath);
    const current = historyStorage.getCurrentScore(projectPath);
    const stats = historyStorage.getProjectStats(projectPath);
    const isActive = watchedProjects.includes(projectPath);

    if (current && stats) {
      summary.projects.push({
        name: projectName,
        active: isActive,
        currentScore: current.overall,
        improvement: stats.improvement,
        status: getStatus(current.overall),
        trend: getTrend(stats.improvement),
        measurementCount: stats.measurementCount
      });
    }
  }

  // Sort by score (best first)
  summary.projects.sort((a, b) => b.currentScore - a.currentScore);

  return {
    uri: "mmi://summary",
    mimeType: "application/json",
    text: JSON.stringify(summary, null, 2)
  };
}

/**
 * Get history resource for a specific project
 */
function getHistoryResource(projectName) {
  // Find project by name
  const monitoredProjects = historyStorage.getMonitoredProjects();
  const projectPath = monitoredProjects.find(p => path.basename(p) === projectName);

  if (!projectPath) {
    throw new Error(`Project not found: ${projectName}`);
  }

  const history = historyStorage.getHistory(projectPath);
  const stats = historyStorage.getProjectStats(projectPath);

  if (!history) {
    throw new Error(`No history found for project: ${projectName}`);
  }

  return {
    uri: `mmi://history/${projectName}`,
    mimeType: "application/json",
    text: JSON.stringify({
      projectName,
      projectPath,
      started: history.started,
      stats: {
        measurementCount: stats.measurementCount,
        firstScore: stats.firstScore,
        currentScore: stats.currentScore,
        improvement: stats.improvement,
        duration: stats.duration
      },
      measurements: history.measurements
    }, null, 2)
  };
}

/**
 * Get status label based on score
 */
function getStatus(score) {
  if (score >= 4.5) return "excellent";
  if (score >= 3.5) return "good";
  if (score >= 2.5) return "acceptable";
  if (score >= 1.5) return "needs-improvement";
  return "critical";
}

/**
 * Get trend label based on improvement
 */
function getTrend(improvement) {
  if (improvement > 0.5) return "improving";
  if (improvement > 0) return "slightly-improving";
  if (improvement === 0) return "stable";
  if (improvement > -0.5) return "slightly-declining";
  return "declining";
}