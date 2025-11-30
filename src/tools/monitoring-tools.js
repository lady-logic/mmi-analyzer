import path from 'path';
import * as fileWatcher from '../monitoring/file-watcher.js';
import * as historyStorage from '../monitoring/history-storage.js';
import { analyzeLayering } from '../analyzers/layering.js';
import { analyzeEncapsulation } from '../analyzers/encapsulation.js';
import { analyzeAbstraction } from '../analyzers/abstraction.js';
import { formatMonitoringStatus } from '../formatters/combined-formatter.js';
import { validateProjectPath } from '../utils/validation.js';
import { logToolCall, logError } from '../utils/logging.js';
import { createSuccessResponse, createErrorResponse } from '../utils/response.js';

/**
 * Handle start monitoring tool
 */
export function handleStartMonitoring(args) {
  logToolCall('start_monitoring', args);
  
  const { projectPath } = args;
  const validation = validateProjectPath(projectPath);
  
  if (!validation.valid) {
    return createErrorResponse(`Path not found: ${projectPath}\n\nPlease check if the path is correct.`);
  }
  
  // Check if already watching
  if (fileWatcher.isWatching(projectPath)) {
    const current = historyStorage.getCurrentScore(projectPath);
    return createSuccessResponse(
      `⚠️ Already monitoring: ${projectPath}\n\nCurrent score: ${current?.overall.toFixed(1) || 'N/A'}/5\n\nUse \`stop_monitoring\` first if you want to restart.`
    );
  }
  
  try {
    // Initialize project in history
    historyStorage.initializeProject(projectPath);
    
    // Run initial analysis
    console.error('[MMI] Running initial analysis...');
    const layering = analyzeLayering(projectPath);
    const encapsulation = analyzeEncapsulation(projectPath);
    const abstraction = analyzeAbstraction(projectPath);
    
    const overallScore = ((layering.score + encapsulation.score + abstraction.score) / 3);
    
    // Save initial measurement
    historyStorage.addMeasurement(projectPath, {
      layering: layering.score,
      encapsulation: encapsulation.score,
      abstraction: abstraction.score,
      overall: overallScore,
      filesAnalyzed: layering.totalFiles
    });
    
    // Start file watcher
    const started = fileWatcher.startWatching(projectPath, (changedPath, changedFiles) => {
      console.error(`[MMI] Files changed, running analysis...`);
      
      const l = analyzeLayering(changedPath);
      const e = analyzeEncapsulation(changedPath);
      const a = analyzeAbstraction(changedPath);
      
      const overall = ((l.score + e.score + a.score) / 3);
      
      historyStorage.addMeasurement(changedPath, {
        layering: l.score,
        encapsulation: e.score,
        abstraction: a.score,
        overall: overall,
        filesAnalyzed: l.totalFiles
      });
      
      console.error(`[MMI] Analysis complete. New score: ${overall.toFixed(1)}/5`);
    });
    
    if (!started) {
      return createErrorResponse(`Failed to start monitoring for: ${projectPath}`);
    }
    
    return createSuccessResponse(
      `✅ **Monitoring Started**

**Project:** ${path.basename(projectPath)}
**Path:** ${projectPath}
**Initial Score:** ${overallScore.toFixed(1)}/5

📊 **Initial Scores:**
- Layering: ${layering.score}/5
- Encapsulation: ${encapsulation.score}/5  
- Abstraction: ${abstraction.score}/5

🔍 **Watching:** All .cs files in project
⚡ **Auto-analysis:** Triggered on file save (2s debounce)
📈 **History:** Tracking score changes over time

I'll automatically analyze your code whenever you save .cs files and track the trend!`
    );
    
  } catch (error) {
    logError(error, 'start_monitoring');
    return createErrorResponse(`Error starting monitoring:\n\n${error.message}`);
  }
}

/**
 * Handle stop monitoring tool
 */
export async function handleStopMonitoring(args) {
  logToolCall('stop_monitoring', args);
  
  const { projectPath } = args;
  
  try {
    const stopped = await fileWatcher.stopWatching(projectPath);
    
    if (!stopped) {
      return createSuccessResponse(`⚠️ Project not being monitored: ${projectPath}`);
    }
    
    const stats = historyStorage.getProjectStats(projectPath);
    
    return createSuccessResponse(
      `✅ **Monitoring Stopped**

**Project:** ${path.basename(projectPath)}
**Duration:** ${stats?.duration || 'N/A'}
**Measurements:** ${stats?.measurementCount || 0}
**Final Score:** ${stats?.currentScore.toFixed(1) || 'N/A'}/5

History has been preserved. Use \`get_monitoring_status\` to see trends.`
    );
    
  } catch (error) {
    logError(error, 'stop_monitoring');
    return createErrorResponse(`Error stopping monitoring:\n\n${error.message}`);
  }
}

/**
 * Handle get monitoring status tool
 */
export function handleMonitoringStatus() {
  logToolCall('get_monitoring_status', {});
  
  try {
    const watchedProjects = fileWatcher.getWatchedProjects();
    const monitoredProjects = historyStorage.getMonitoredProjects();
    
    const report = formatMonitoringStatus(watchedProjects, monitoredProjects, historyStorage);
    return createSuccessResponse(report);
    
  } catch (error) {
    logError(error, 'get_monitoring_status');
    return createErrorResponse(`Error getting status:\n\n${error.message}`);
  }
}