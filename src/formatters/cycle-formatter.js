import { getReportConfig, groupBy } from '../config/report-config.js';

/**
 * Format cycle analysis results as readable report
 * @param {Object} result - Analysis result
 * @param {string} mode - 'compact' or 'detailed'
 */
export function formatCycleReport(result, mode = 'compact') {
  const config = getReportConfig(mode);
  const {
    projectPath,
    totalFiles,
    cycles,
    cycleCount,
    filesInCycles,
    filesInCyclesCount,
    score,
    level
  } = result;
  
  // Header
  let report = `# 🔄 Circular Dependency Analysis\n\n`;
  report += `**Score:** ${score}/5 (${level}) | **Files:** ${totalFiles} | **Cycles:** ${cycleCount} | **Files in Cycles:** ${filesInCyclesCount}\n\n`;
  
  if (cycleCount === 0) {
    report += `## ✅ Excellent! No Cycles Detected\n\n`;
    report += `Your architecture is acyclic - dependencies flow in one direction only.\n\n`;
    return report;
  }
  
  // Cycles by severity
  const critical = cycles.filter(c => c.severity === 'CRITICAL');
  const high = cycles.filter(c => c.severity === 'HIGH');
  const medium = cycles.filter(c => c.severity === 'MEDIUM');
  const low = cycles.filter(c => c.severity === 'LOW');
  
  report += `## ⚠️ Circular Dependencies Found\n\n`;
  
  if (config.groupSimilar) {
    report += formatCompactCycles(critical, high, medium, low, config);
  } else {
    report += formatDetailedCycles(critical, high, medium, low, config);
  }
  
  // Recommendations
  report += `---\n\n## 💡 Breaking the Cycles\n\n`;
  report += getRecommendations(score, cycleCount, critical.length);
  
  return report;
}

/**
 * COMPACT: Grouped cycles
 */
function formatCompactCycles(critical, high, medium, low, config) {
  let report = '';
  
  if (critical.length > 0) {
    report += `🔴 **CRITICAL** (${critical.length}) - Domain layer involved!\n\n`;
    critical.slice(0, config.maxViolationsShown).forEach(cycle => {
      report += `- Cycle #${cycle.id}: ${cycle.path.join(' → ')} → ${cycle.path[0]}\n`;
    });
    if (critical.length > config.maxViolationsShown) {
      report += `  _...and ${critical.length - config.maxViolationsShown} more_\n`;
    }
    report += '\n';
  }
  
  if (high.length > 0) {
    report += `🟠 **HIGH** (${high.length}) - Direct 2-way cycles\n\n`;
    high.slice(0, 3).forEach(cycle => {
      report += `- ${cycle.path[0]} ↔ ${cycle.path[1]}\n`;
    });
    if (high.length > 3) {
      report += `  _...and ${high.length - 3} more_\n`;
    }
    report += '\n';
  }
  
  if (medium.length > 0) {
    report += `🟡 **MEDIUM** (${medium.length}) - Multi-way cycles\n\n`;
  }
  
  if (low.length > 0) {
    report += `🔵 **LOW** (${low.length}) - Long cycles\n\n`;
  }
  
  return report;
}

/**
 * DETAILED: Full cycle listing
 */
function formatDetailedCycles(critical, high, medium, low, config) {
  let report = '';
  
  if (critical.length > 0) {
    report += `### 🔴 CRITICAL Cycles (${critical.length})\n\n`;
    report += `Domain layer should never have circular dependencies!\n\n`;
    
    critical.forEach(cycle => {
      report += `**Cycle #${cycle.id}** (${cycle.length} files)\n`;
      report += `- Path: ${cycle.path.join(' → ')} → ${cycle.path[0]}\n`;
      report += `- Layers: ${cycle.layers.join(', ')}\n`;
      report += `- ${cycle.description}\n\n`;
    });
  }
  
  if (high.length > 0) {
    report += `### 🟠 HIGH Priority (${high.length})\n\n`;
    
    high.forEach(cycle => {
      report += `**Cycle #${cycle.id}**: ${cycle.path.join(' ↔ ')}\n`;
    });
    report += '\n';
  }
  
  if (medium.length > 0) {
    report += `### 🟡 MEDIUM Priority (${medium.length})\n\n`;
    report += `Multi-way cycles across layers.\n\n`;
  }
  
  if (low.length > 0) {
    report += `### 🔵 LOW Priority (${low.length})\n\n`;
    report += `Long dependency chains - consider refactoring for clarity.\n\n`;
  }
  
  return report;
}

/**
 * Get recommendations
 */
function getRecommendations(score, cycleCount, criticalCount) {
  if (criticalCount > 0) {
    return `🔴 **URGENT:** Break ${criticalCount} Domain cycles immediately!\n\n` +
           `**Strategy:**\n` +
           `1. Extract interfaces from Domain entities\n` +
           `2. Move concrete implementations to Infrastructure\n` +
           `3. Use Dependency Injection\n\n` +
           `Expected: Score ${score} → ${Math.min(5, score + 2)}\n`;
  }
  
  if (cycleCount > 0) {
    return `🟡 **Recommended:** Break ${cycleCount} cycles\n\n` +
           `**Common Solutions:**\n` +
           `- Dependency Inversion Principle (interfaces)\n` +
           `- Event-driven communication (decouple)\n` +
           `- Extract common dependencies to lower layer\n` +
           `- Merge tightly coupled components\n\n` +
           `Expected: Score ${score} → ${Math.min(5, score + 1)}\n`;
  }
  
  return `✅ Excellent! Keep your architecture acyclic.\n`;
}