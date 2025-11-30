import path from 'path';

/**
 * Format combined MMI report (all 3 dimensions)
 */
export function formatCombinedReport(layering, encapsulation, abstraction) {
  const overallScore = ((layering.score + encapsulation.score + abstraction.score) / 3).toFixed(1);
  const overallLevel = getOverallLevel(parseFloat(overallScore));
  
  let report = `# 🌳 Complete MMI Analysis Report

**Project:** ${layering.projectPath}
**Overall MMI Score:** ${overallScore}/5 (${overallLevel})

---

## 📊 MMI Scorecard

| Dimension | Score | Level | Status |
|-----------|-------|-------|--------|
| **2. Layering** (Schichtung) | ${layering.score}/5 | ${layering.level} | ${getStatusIcon(layering.score)} |
| **5. Encapsulation** (Kapselung) | ${encapsulation.score}/5 | ${encapsulation.level} | ${getStatusIcon(encapsulation.score)} |
| **8. Abstraction Levels** | ${abstraction.score}/5 | ${abstraction.level} | ${getStatusIcon(abstraction.score)} |
| **Overall MMI** | **${overallScore}/5** | **${overallLevel}** | ${getStatusIcon(parseFloat(overallScore))} |

---

## 📈 Dimension Details

### 🏛️ Dimension 2: Layering
- **Violations:** ${layering.violationCount}
- **Files:** ${layering.totalFiles}
- **Status:** ${layering.violationCount === 0 ? '✅ Perfect' : `⚠️ ${layering.violationCount} violations found`}

### 🔒 Dimension 5: Encapsulation
- **Public Types:** ${encapsulation.publicTypes} (${encapsulation.publicPercentage}%)
- **Over-Exposed:** ${encapsulation.overExposedCount}
- **Status:** ${encapsulation.publicPercentage < 30 ? '✅ Good' : `⚠️ ${encapsulation.publicPercentage}% public (target: <30%)`}

### 🎯 Dimension 8: Abstraction Levels
- **Files with Issues:** ${abstraction.filesWithIssues}
- **Total Issues:** ${abstraction.issueCount}
- **Status:** ${abstraction.issueCount === 0 ? '✅ Clean separation' : `⚠️ ${abstraction.issueCount} mixing issues`}

---

## 🎯 Top Priority Actions

`;

  const actions = [];
  
  if (layering.score < 4) {
    actions.push({
      priority: 'HIGH',
      dimension: 'Layering',
      action: `Fix ${layering.violationCount} layer violations`,
      impact: `Score ${layering.score} → ${Math.min(5, layering.score + 2)}`
    });
  }
  
  if (encapsulation.score < 3) {
    actions.push({
      priority: 'HIGH',
      dimension: 'Encapsulation',
      action: `Reduce public types from ${encapsulation.publicPercentage}% to <30%`,
      impact: `Score ${encapsulation.score} → ${Math.min(5, encapsulation.score + 2)}`
    });
  }
  
  if (abstraction.score < 4) {
    actions.push({
      priority: 'HIGH',
      dimension: 'Abstraction',
      action: `Separate business logic from ${abstraction.issueCount} technical details`,
      impact: `Score ${abstraction.score} → ${Math.min(5, abstraction.score + 2)}`
    });
  }
  
  if (actions.length === 0) {
    report += `### ✅ No Critical Issues!

Your architecture is in excellent shape. Keep maintaining these standards!

`;
  } else {
    actions.forEach((action, idx) => {
      report += `### ${idx + 1}. [${action.priority}] ${action.dimension}

**Action:** ${action.action}  
**Expected Impact:** ${action.impact}

`;
    });
  }
  
  report += `---

## 🚀 Improvement Roadmap

`;

  const currentScore = parseFloat(overallScore);
  
  if (currentScore >= 4.0) {
    report += `**Current State:** Excellent (${overallScore}/5)

Your architecture is strong. Focus on:
- Maintaining current quality standards
- Code reviews to prevent regressions
- Documenting architectural decisions

`;
  } else if (currentScore >= 3.0) {
    report += `**This Sprint:**
- Address HIGH priority items above
- Expected improvement: ${overallScore} → ${Math.min(5, currentScore + 0.8).toFixed(1)}

**This Quarter:**
- Complete all dimension improvements
- Target score: 4.5+/5

`;
  } else {
    report += `**Immediate (This Week):**
- Fix critical violations in highest-impact dimension
- Expected: ${overallScore} → ${Math.min(5, currentScore + 1.0).toFixed(1)}

**This Sprint:**
- Address all HIGH priority items
- Expected: ${Math.min(5, currentScore + 1.5).toFixed(1)}

**This Quarter:**
- Systematic refactoring of all dimensions
- Target: 4.0+/5

`;
  }
  
  report += `---

## 📋 MMI Reference

**Scoring Scale:**
- **5 - Exzellent:** State-of-the-art architecture
- **4 - Gut:** Strong architecture, minor improvements
- **3 - Akzeptabel:** Solid foundation, some refactoring needed
- **2 - Verbesserungswürdig:** Significant technical debt
- **1 - Schlecht:** Major refactoring required
- **0 - Kritisch:** Architecture fundamentally broken

**Your Score: ${overallScore}/5** - ${getScoreDescription(currentScore)}

---

**Analysis completed at:** ${new Date().toISOString()}  
**Tool:** MMI Analyzer v0.2.0 (Carola Lilienthal Framework)

`;

  return report;
}

/**
 * Format monitoring status report
 */
export function formatMonitoringStatus(watchedProjects, monitoredProjects, historyStorage) {
  if (monitoredProjects.length === 0) {
    return `ℹ️ **No Monitored Projects**

No projects are currently being monitored.

Use \`start_monitoring\` to begin tracking a project's architecture quality over time.`;
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
        const time = new Date(m.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
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

function getScoreDescription(score) {
  if (score >= 4.5) return 'Outstanding architecture quality';
  if (score >= 3.5) return 'Good architecture with room for improvement';
  if (score >= 2.5) return 'Acceptable but needs attention';
  if (score >= 1.5) return 'Significant refactoring recommended';
  return 'Critical issues require immediate action';
}