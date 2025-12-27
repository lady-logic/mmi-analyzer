import path from 'path';
import { getReportConfig } from '../config/report-config.js';

/**
 * Format combined MMI report (all 4 dimensions) 
 * @param {Object} layering - Layering analysis result
 * @param {Object} encapsulation - Encapsulation analysis result
 * @param {Object} abstraction - Abstraction analysis result
 * @param {Object} cycles - Cycle analysis result 
 * @param {string} mode - 'compact' or 'detailed'
 */
export function formatCombinedReport(layering, encapsulation, abstraction, cycles, mode = 'compact') {
  const config = getReportConfig(mode);
  
  const overallScore = ((layering.score + encapsulation.score + abstraction.score + cycles.score) / 4).toFixed(1);
  
  const overallLevel = getOverallLevel(parseFloat(overallScore));
  const projectName = path.basename(layering.projectPath);
  
  let report = `# 🌳 MMI Analysis - ${projectName}\n\n`;
  report += `**Overall Score:** ${overallScore}/5 (${overallLevel})\n\n`;
  
  // Scorecard
  report += `## 📊 Scorecard\n\n`;
  report += `| Dimension | Score | Status |\n`;
  report += `|-----------|-------|--------|\n`;
  report += `| Layering | ${layering.score}/5 | ${getStatusIcon(layering.score)} ${layering.level} |\n`;
  report += `| Encapsulation | ${encapsulation.score}/5 | ${getStatusIcon(encapsulation.score)} ${encapsulation.level} |\n`;
  report += `| Abstraction | ${abstraction.score}/5 | ${getStatusIcon(abstraction.score)} ${abstraction.level} |\n`;
  report += `| Cycles | ${cycles.score}/5 | ${getStatusIcon(cycles.score)} ${cycles.level} |\n`; 
  report += `| **Overall** | **${overallScore}/5** | ${getStatusIcon(parseFloat(overallScore))} **${overallLevel}** |\n\n`;
  
  // Details
  if (config.showDetailedStats) {
    report += formatDetailedDimensionInfo(layering, encapsulation, abstraction, cycles); 
  }
  
  // Priority Actions
  report += `## Priority Actions\n\n`;
  report += formatCompactActions(layering, encapsulation, abstraction, cycles); 
  
  // Roadmap
  if (config.groupSimilar) {
    report += formatCompactRoadmap(parseFloat(overallScore));
  } else {
    report += formatDetailedRoadmap(parseFloat(overallScore));
  }
  
  return report;
}

/**
 * COMPACT: Kurze Action Items
 */
function formatCompactActions(layering, encapsulation, abstraction, cycles) {
  const actions = [];
  
  if (layering.score < 4 && layering.violationCount > 0) {
    actions.push(`1️⃣ **Layering**: Fix ${layering.violationCount} violations → ${layering.score}→${Math.min(5, layering.score + 1)}`);
  }
  
  if (encapsulation.score < 3) {
    actions.push(`2️⃣ **Encapsulation**: Reduce public types ${encapsulation.publicPercentage}%→30% → ${encapsulation.score}→${Math.min(5, encapsulation.score + 1)}`);
  }
  
  if (abstraction.score < 4 && abstraction.issueCount > 0) {
    actions.push(`3️⃣ **Abstraction**: Separate ${abstraction.issueCount} mixed concerns → ${abstraction.score}→${Math.min(5, abstraction.score + 1)}`);
  }

  if (cycles.score < 4 && cycles.cycleCount > 0) {
    const critical = cycles.cycles.filter(c => c.severity === 'CRITICAL').length;
    if (critical > 0) {
      actions.push(`4️⃣ **Cycles**: Break ${critical} CRITICAL cycles → ${cycles.score}→${Math.min(5, cycles.score + 2)}`);
    } else {
      actions.push(`4️⃣ **Cycles**: Resolve ${cycles.cycleCount} circular dependencies → ${cycles.score}→${Math.min(5, cycles.score + 1)}`);
    }
  }
  
  if (actions.length === 0) {
    return `✅ **No Critical Issues!** Architecture is in excellent shape.\n\n`;
  }
  
  return actions.join('\n') + '\n\n';
}

/**
 * COMPACT: Kurze Roadmap
 */
function formatCompactRoadmap(currentScore) {
  let report = `## 🚀 Roadmap\n\n`;
  
  if (currentScore >= 4.0) {
    report += `**Status:** Excellent (${currentScore}/5)\n`;
    report += `**Focus:** Maintain quality, prevent regressions\n\n`;
  } else if (currentScore >= 3.0) {
    report += `**This Sprint:** Address priority items → ${Math.min(5, currentScore + 0.8).toFixed(1)}/5\n`;
    report += `**This Quarter:** Complete all improvements → 4.5+/5\n\n`;
  } else {
    report += `**This Week:** Fix critical violations → ${Math.min(5, currentScore + 1.0).toFixed(1)}/5\n`;
    report += `**This Sprint:** Address all HIGH items → ${Math.min(5, currentScore + 1.5).toFixed(1)}/5\n`;
    report += `**This Quarter:** Systematic refactoring → 4.0+/5\n\n`;
  }
  
  return report;
}

/**
 * DETAILED: Ausführliche Dimension Info
 */
function formatDetailedDimensionInfo(layering, encapsulation, abstraction, cycles) {
  let report = `## 📈 Dimension Details\n\n`;
  
  report += `### 🏛️ Dimension 2: Layering\n`;
  report += `- **Violations:** ${layering.violationCount}\n`;
  report += `- **Files:** ${layering.totalFiles}\n`;
  report += `- **Status:** ${layering.violationCount === 0 ? '✅ Perfect' : `⚠️ ${layering.violationCount} violations found`}\n\n`;
  
  report += `### 🔒 Dimension 5: Encapsulation\n`;
  report += `- **Public Types:** ${encapsulation.publicTypes} (${encapsulation.publicPercentage}%)\n`;
  report += `- **Over-Exposed:** ${encapsulation.overExposedCount}\n`;
  report += `- **Status:** ${encapsulation.publicPercentage < 30 ? '✅ Good' : `⚠️ ${encapsulation.publicPercentage}% public (target: <30%)`}\n\n`;
  
  report += `### 🎯 Dimension 8: Abstraction Levels\n`;
  report += `- **Files with Issues:** ${abstraction.filesWithIssues}\n`;
  report += `- **Total Issues:** ${abstraction.issueCount}\n`;
  report += `- **Status:** ${abstraction.issueCount === 0 ? '✅ Clean separation' : `⚠️ ${abstraction.issueCount} mixing issues`}\n\n`;
  
  report += `### 🔄 Dimension 9: Circular Dependencies\n`;
  report += `- **Cycles Found:** ${cycles.cycleCount}\n`;
  report += `- **Files in Cycles:** ${cycles.filesInCyclesCount}\n`;
  report += `- **Status:** ${cycles.cycleCount === 0 ? '✅ Acyclic' : `⚠️ ${cycles.cycleCount} cycles detected`}\n\n`;
  
  report += `---\n\n`;
  
  return report;
}

/**
 * DETAILED: Ausführliche Roadmap
 */
function formatDetailedRoadmap(currentScore) {
  let report = `## 🚀 Improvement Roadmap\n\n`;
  
  if (currentScore >= 4.0) {
    report += `**Current State:** Excellent (${currentScore}/5)\n\n`;
    report += `Your architecture is strong. Focus on:\n`;
    report += `- Maintaining current quality standards\n`;
    report += `- Code reviews to prevent regressions\n`;
    report += `- Documenting architectural decisions\n\n`;
  } else if (currentScore >= 3.0) {
    report += `**This Sprint:**\n`;
    report += `- Address HIGH priority items above\n`;
    report += `- Expected improvement: ${currentScore} → ${Math.min(5, currentScore + 0.8).toFixed(1)}\n\n`;
    report += `**This Quarter:**\n`;
    report += `- Complete all dimension improvements\n`;
    report += `- Target score: 4.5+/5\n\n`;
  } else {
    report += `**Immediate (This Week):**\n`;
    report += `- Fix critical violations in highest-impact dimension\n`;
    report += `- Expected: ${currentScore} → ${Math.min(5, currentScore + 1.0).toFixed(1)}\n\n`;
    report += `**This Sprint:**\n`;
    report += `- Address all HIGH priority items\n`;
    report += `- Expected: ${Math.min(5, currentScore + 1.5).toFixed(1)}\n\n`;
    report += `**This Quarter:**\n`;
    report += `- Systematic refactoring of all dimensions\n`;
    report += `- Target: 4.0+/5\n\n`;
  }
  
  return report;
}

/**
 * Format monitoring status report
 */
export function formatMonitoringStatus(watchedProjects, monitoredProjects, historyStorage) {
  if (monitoredProjects.length === 0) {
    return `ℹ️ **No Monitored Projects**\n\nNo projects are currently being monitored.\n\nUse \`start_monitoring\` to begin tracking a project's architecture quality over time.`;
  }
  
  let report = `# 📊 MMI Monitoring Status\n\n`;
  
  if (watchedProjects.length > 0) {
    report += `## 🟢 Active Monitoring (${watchedProjects.length})\n\n`;
    
    for (const projectPath of watchedProjects) {
      const stats = historyStorage.getProjectStats(projectPath);
      const current = historyStorage.getCurrentScore(projectPath);
      const recent = historyStorage.getRecentMeasurements(projectPath, 5);
      
      report += `### ${path.basename(projectPath)}\n`;
      report += `**Path:** ${projectPath}\n`;
      report += `**Duration:** ${stats.duration}\n`;
      report += `**Measurements:** ${stats.measurementCount}\n`;
      report += `**Current Score:** ${current.overall.toFixed(1)}/5`;
      
      if (stats.improvement !== 0) {
        const icon = stats.improvement > 0 ? '📈' : '📉';
        const sign = stats.improvement > 0 ? '+' : '';
        report += ` (${icon} ${sign}${stats.improvement.toFixed(1)} since start)`;
      }
      
      report += `\n\n**Recent Trend:**\n`;
      report += '```\n';
      recent.forEach(m => {
        const time = new Date(m.timestamp).toLocaleString('de-DE', { 
          day: '2-digit', 
          month: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit' 
        }).replace(',', '');
        const bar = '█'.repeat(Math.round(m.overall)) + '░'.repeat(5 - Math.round(m.overall));
        report += `${time}  ${m.overall.toFixed(1)}  ${bar}\n`;
      });
      report += '```\n\n';
    }
  }
  
  const inactiveProjects = monitoredProjects.filter(p => !watchedProjects.includes(p));
  if (inactiveProjects.length > 0) {
    report += `## ⚪ Inactive (History Available)\n\n`;
    
    for (const projectPath of inactiveProjects) {
      const stats = historyStorage.getProjectStats(projectPath);
      report += `- **${path.basename(projectPath)}**: ${stats.measurementCount} measurements, last score ${stats.currentScore.toFixed(1)}/5\n`;
    }
    report += '\n';
  }
  
  report += `---\n\n`;
  report += `💡 **Tip:** Use \`start_monitoring\` to resume monitoring inactive projects.\n`;
  
  return report;
}

function getStatusIcon(score) {
  if (score >= 4) return '✅';
  if (score >= 3) return '🟡';
  if (score >= 2) return '🟠';
  return '🔴';
}

function getOverallLevel(score) {
  if (score >= 4.5) return 'Exzellent';
  if (score >= 3.5) return 'Gut';
  if (score >= 2.5) return 'Akzeptabel';
  if (score >= 1.5) return 'Verbesserungswürdig';
  if (score >= 0.5) return 'Schlecht';
  return 'Kritisch';
}