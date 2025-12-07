import { getReportConfig, groupBy } from '../config/report-config.js';

/**
 * Format layering analysis results as readable report
 * @param {Object} result - Analysis result
 * @param {string} mode - 'compact' or 'detailed'
 */
export function formatLayeringReport(result, mode = 'compact') {
  const config = getReportConfig(mode);
  const { projectPath, totalFiles, violations, violationCount, score, level } = result;
  
  // COMPACT: Kurzer Header (1 Zeile statt 10)
  let report = `# 📊 Layering Analysis\n\n`;
  report += `**Score:** ${score}/5 (${level}) | **Files:** ${totalFiles} | **Violations:** ${violationCount}\n\n`;
  
  if (violationCount === 0) {
    report += `✅ Perfect! No violations found.\n`;
    return report;
  }
  
  // Je nach Modus: Gruppiert oder detailliert
  if (config.groupSimilar) {
    report += formatGroupedViolations(violations, config);
  } else {
    report += formatDetailedViolations(violations, config);
  }
  
  // COMPACT: Kurze Empfehlung (2 Zeilen statt 20)
  report += `\n## 💡 Action\n`;
  report += getCompactRecommendation(score, violationCount);
  
  return report;
}

/**
 * Gruppierte Darstellung (SPART ~70% TOKENS!)
 */
function formatGroupedViolations(violations, config) {
  let report = `## ⚠️ Issues by Type\n\n`;
  
  // Gruppiere nach Severity
  const bySeverity = {
    CRITICAL: violations.filter(v => v.severity === 'CRITICAL'),
    HIGH: violations.filter(v => v.severity === 'HIGH'),
    MEDIUM: violations.filter(v => v.severity === 'MEDIUM'),
    LOW: violations.filter(v => v.severity === 'LOW')
  };
  
  // Zeige nur nicht-leere Gruppen
  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;
    
    const icon = severity === 'CRITICAL' ? '🔴' : severity === 'HIGH' ? '🟠' : '🟡';
    report += `${icon} **${severity}** (${items.length})\n`;
    
    // Gruppiere nach Ziel-Layer (z.B. alle die "Infrastructure" verwenden)
    const byTarget = groupBy(items, 'dependsOn');
    
    for (const [target, targetItems] of Object.entries(byTarget)) {
      report += `- ${target}: ${targetItems.length} files\n`;
      
      // Zeige nur erste N Dateien (spart Tokens!)
      const showCount = Math.min(targetItems.length, config.maxViolationsShown);
      if (showCount > 0) {
        const fileList = targetItems.slice(0, showCount).map(v => v.file).join(', ');
        report += `  → ${fileList}\n`;
        
        if (targetItems.length > showCount) {
          report += `  _...and ${targetItems.length - showCount} more_\n`;
        }
      }
    }
    report += '\n';
  }
  
  return report;
}

/**
 * ALTE FUNKTION: Detaillierte Darstellung (für detailed mode)
 */
function formatDetailedViolations(violations, config) {
  let report = `## ⚠️ Violations by Severity\n\n`;
  
  const critical = violations.filter(v => v.severity === 'CRITICAL');
  const high = violations.filter(v => v.severity === 'HIGH');
  const medium = violations.filter(v => v.severity === 'MEDIUM');
  const low = violations.filter(v => v.severity === 'LOW');
  
  if (critical.length > 0) {
    report += `### 🔴 CRITICAL (${critical.length})\n`;
    report += `Domain layer depends on Infrastructure - breaks Clean Architecture!\n\n`;
    critical.forEach(v => {
      report += `- **${v.file}**: Uses \`${v.using}\`\n`;
    });
    report += '\n';
  }
  
  if (high.length > 0) {
    report += `### 🟠 HIGH (${high.length})\n`;
    report += `Domain layer depends on Application - domain should be independent!\n\n`;
    high.forEach(v => {
      report += `- **${v.file}**: Uses \`${v.using}\`\n`;
    });
    report += '\n';
  }
  
  if (medium.length > 0) {
    report += `### 🟡 MEDIUM (${medium.length})\n`;
    report += `Application layer depends on Infrastructure - use dependency injection!\n\n`;
    medium.forEach(v => {
      report += `- **${v.file}**: Uses \`${v.using}\`\n`;
    });
    report += '\n';
  }
  
  if (low.length > 0) {
    report += `### 🔵 LOW (${low.length})\n\n`;
    low.forEach(v => {
      report += `- **${v.file}** (${v.layer}): Uses \`${v.using}\` from ${v.dependsOn}\n`;
    });
    report += '\n';
  }
  
  report += `---\n\n## 💡 Recommendations\n\n`;
  
  if (critical.length > 0 || high.length > 0) {
    report += `**Priority 1 (Immediate):**\n`;
    report += `- Move domain logic out of infrastructure dependencies\n`;
    report += `- Use interfaces in Domain, implementations in Infrastructure\n`;
    report += `- Apply Dependency Inversion Principle\n\n`;
  }
  
  if (medium.length > 0) {
    report += `**Priority 2 (This Sprint):**\n`;
    report += `- Introduce interfaces in Application layer\n`;
    report += `- Register implementations in Infrastructure via DI\n`;
    report += `- Remove direct Infrastructure references from Application\n\n`;
  }
  
  report += `**Expected Impact:**\n`;
  report += `- Refactoring these violations could improve MMI score to: ${Math.min(5, score + 2)}/5\n`;
  
  return report;
}

/**
 * Kurze, actionable Empfehlung
 */
function getCompactRecommendation(score, count) {
  if (score >= 4) return `Keep it up! Minor fixes needed.\n`;
  if (score >= 3) return `Fix ${count} violations this sprint → Score ${score} → ${Math.min(5, score + 1)}\n`;
  if (score >= 2) return `⚠️ Refactoring needed! Focus on CRITICAL first.\n`;
  return `🚨 URGENT: Architecture broken. Stop features, fix layers.\n`;
}

function getRecommendation(score) {
  if (score >= 4) return "Great architecture! Keep maintaining it.";
  if (score === 3) return "Good foundation, address the violations this sprint.";
  if (score === 2) return "Plan a refactoring sprint to fix violations.";
  if (score === 1) return "Urgent: Architecture needs immediate attention.";
  return "Critical: Stop feature development, fix architecture first.";
}