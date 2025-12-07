import { getReportConfig, groupBy } from '../config/report-config.js';

/**
 * Format abstraction analysis results as readable report
 * @param {Object} result - Analysis result
 * @param {string} mode - 'compact' or 'detailed'
 */
export function formatAbstractionReport(result, mode = 'compact') {
  const config = getReportConfig(mode);
  const {
    projectPath,
    totalFiles,
    filesWithIssues,
    mixedAbstractions,
    issueCount,
    codeExamples,
    score,
    level
  } = result;
  
  // COMPACT: Eine Zeile Header
  let report = `# 🎯 Abstraction Levels Analysis\n\n`;
  report += `**Score:** ${score}/5 (${level}) | **Files:** ${totalFiles} | **Issues:** ${issueCount} in ${filesWithIssues} files\n\n`;
  
  if (issueCount === 0) {
    report += `## ✅ Excellent Separation!\n\n`;
    report += `No mixing of abstraction levels detected. Clean separation between layers.\n\n`;
    return report;
  }
  
  // Issues nach Modus
  const critical = mixedAbstractions.filter(m => m.severity === 'CRITICAL');
  const high = mixedAbstractions.filter(m => m.severity === 'HIGH');
  const medium = mixedAbstractions.filter(m => m.severity === 'MEDIUM');
  const low = mixedAbstractions.filter(m => m.severity === 'LOW');
  
  report += `## ⚠️ Mixed Abstraction Levels\n\n`;
  
  if (config.groupSimilar) {
    report += formatCompactAbstractionIssues(critical, high, medium, low, config);
  } else {
    report += formatDetailedAbstractionIssues(critical, high, medium, low, config, codeExamples);
  }
  
  // Recommendations
  report += `---\n\n## 💡 Action\n\n`;
  report += getCompactAbstractionRecommendation(score, issueCount, critical.length);
  
  return report;
}

/**
 * COMPACT: Gruppierte Issues (spart ~70% Tokens!)
 */
function formatCompactAbstractionIssues(critical, high, medium, low, config) {
  let report = '';
  
  if (critical.length > 0) {
    report += `🔴 **CRITICAL** (${critical.length}) - Business logic mixed with infrastructure\n`;
    const byType = groupBy(critical, 'issue');
    
    for (const [type, items] of Object.entries(byType)) {
      const displayName = formatIssueType(type);
      report += `- ${displayName}: ${items.length} files (${items.slice(0, 3).map(i => i.file).join(', ')}`;
      if (items.length > 3) report += `, +${items.length - 3} more`;
      report += `)\n`;
    }
    report += '\n';
  }
  
  if (high.length > 0) {
    report += `🟠 **HIGH** (${high.length})\n`;
    const byType = groupBy(high, 'issue');
    for (const [type, items] of Object.entries(byType)) {
      report += `- ${formatIssueType(type)}: ${items.length} files\n`;
    }
    report += '\n';
  }
  
  if (medium.length > 0) {
    report += `🟡 **MEDIUM** (${medium.length}) - Some technical details in business code\n\n`;
  }
  
  if (low.length > 0) {
    report += `🔵 **LOW** (${low.length}) - Minor issues\n\n`;
  }
  
  return report;
}

/**
 * DETAILED: Ausführliche Darstellung mit Beispielen
 */
function formatDetailedAbstractionIssues(critical, high, medium, low, config, codeExamples) {
  let report = '';
  
  if (critical.length > 0) {
    report += `### 🔴 CRITICAL Issues (${critical.length})\n\n`;
    report += `Business logic mixed with infrastructure details - violates Clean Architecture!\n\n`;
    
    const criticalByType = groupBy(critical, 'issue');
    Object.entries(criticalByType).forEach(([type, items]) => {
      report += `**${formatIssueType(type)}** (${items.length} occurrences)\n`;
      items.slice(0, 5).forEach(item => {
        report += `- \`${item.file}\` (${item.layer}): ${item.pattern}\n`;
      });
      if (items.length > 5) {
        report += `  _... and ${items.length - 5} more files_\n`;
      }
      report += '\n';
    });
  }
  
  if (high.length > 0) {
    report += `### 🟠 HIGH Priority (${high.length})\n\n`;
    const highByType = groupBy(high, 'issue');
    Object.entries(highByType).forEach(([type, items]) => {
      report += `**${formatIssueType(type)}** (${items.length})\n`;
      items.slice(0, 3).forEach(item => {
        report += `- \`${item.file}\`: ${item.description}\n`;
      });
      report += '\n';
    });
  }
  
  if (medium.length > 0) {
    report += `### 🟡 MEDIUM Priority (${medium.length})\n\n`;
    const mediumByType = groupBy(medium, 'issue');
    Object.entries(mediumByType).forEach(([type, items]) => {
      report += `**${formatIssueType(type)}**: ${items.length} files\n`;
    });
    report += '\n';
  }
  
  if (low.length > 0) {
    report += `### 🔵 LOW Priority (${low.length})\n\n`;
    report += `Minor issues that could be improved but aren't critical.\n\n`;
  }
  
  // Code examples nur im detailed mode
  if (config.includeCodeExamples && codeExamples && codeExamples.length > 0) {
    report += `---\n\n## 📝 Code Examples\n\n`;
    codeExamples.slice(0, 2).forEach(example => {
      report += `### ${example.file}\n\n`;
      report += `**Issues:** ${example.issues.map(i => formatIssueType(i.issue)).join(', ')}\n\n`;
      report += `\`\`\`csharp\n${example.snippet}\n... (truncated)\n\`\`\`\n\n`;
    });
  }
  
  return report;
}

/**
 * COMPACT: Kurze Empfehlung
 */
function getCompactAbstractionRecommendation(score, issueCount, criticalCount) {
  if (criticalCount > 0) {
    return `🔴 HIGH: Extract infrastructure logic from ${criticalCount} files → separate layers\n` +
           `Expected: Score ${score} → ${Math.min(5, score + 2)}\n`;
  } else if (issueCount > 0) {
    return `🟡 MEDIUM: Reduce coupling to technical details in ${issueCount} issues\n` +
           `Expected: Score ${score} → ${Math.min(5, score + 1)}\n`;
  } else {
    return `✅ Excellent! Keep business logic pure and use abstractions.\n`;
  }
}

/**
 * Helper: Format issue type names
 */
function formatIssueType(type) {
  const names = {
    'SQL_MIXING': 'SQL in Business Logic',
    'EF_IN_DOMAIN': 'Entity Framework in Domain',
    'HTTP_MIXING': 'HTTP in Business Logic',
    'FILE_IO_MIXING': 'File I/O in Business Logic',
    'SERIALIZATION_IN_DOMAIN': 'Serialization in Domain',
    'EXCESSIVE_LOGGING': 'Excessive Logging'
  };
  return names[type] || type;
}