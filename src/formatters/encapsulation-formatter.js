import { getReportConfig } from '../config/report-config.js';

/**
 * Format encapsulation analysis results as readable report
 * @param {Object} result - Analysis result
 * @param {string} mode - 'compact' or 'detailed'
 */
export function formatEncapsulationReport(result, mode = 'compact') {
  const config = getReportConfig(mode);
  const { 
    projectPath, 
    totalFiles, 
    totalTypes,
    stats,
    publicTypes,
    publicPercentage, 
    overExposed,
    overExposedCount,
    score, 
    level 
  } = result;
  
  // COMPACT: Eine Zeile Header
  let report = `# 🔒 Encapsulation Analysis\n\n`;
  report += `**Score:** ${score}/5 (${level}) | **Public:** ${publicPercentage}% (${publicTypes}/${totalTypes}) | **Over-Exposed:** ${overExposedCount}\n\n`;
  
  // Nur bei detailed mode: Ausführliche Tabelle
  if (config.showDetailedStats) {
    report += `## 📊 Visibility Breakdown\n\n`;
    report += `| Type | Public | Internal | Total |\n`;
    report += `|------|--------|----------|-------|\n`;
    report += `| Classes | ${stats.publicClasses} | ${stats.internalClasses} | ${stats.publicClasses + stats.internalClasses} |\n`;
    report += `| Interfaces | ${stats.publicInterfaces} | ${stats.internalInterfaces} | ${stats.publicInterfaces + stats.internalInterfaces} |\n`;
    report += `| Records | ${stats.publicRecords} | ${stats.internalRecords} | ${stats.publicRecords + stats.internalRecords} |\n`;
    report += `| **Total** | **${publicTypes}** | **${totalTypes - publicTypes}** | **${totalTypes}** |\n\n`;
  }
  
  // Assessment
  if (score >= 4) {
    report += `## ✅ Excellent Encapsulation!\n\n`;
    report += `API surface well-controlled at ${publicPercentage}%. Good information hiding.\n\n`;
  } else {
    report += `## ⚠️ Encapsulation Issues\n\n`;
    report += `**${publicPercentage}%** public (target: <30%)\n\n`;
  }
  
  // Over-exposed types
  if (overExposedCount > 0) {
    if (config.groupSimilar) {
      report += formatCompactOverExposed(overExposed, config);
    } else {
      report += formatDetailedOverExposed(overExposed, config);
    }
  } else {
    report += `### ✅ No Over-Exposed Types\n\n`;
    report += `All public types appear intentional (Controllers, DTOs, Contracts).\n\n`;
  }
  
  // Recommendations
  report += `---\n\n## 💡 Action\n\n`;
  report += getCompactEncapsulationRecommendation(score, publicPercentage, overExposedCount);
  
  return report;
}

/**
 * COMPACT: Gruppierte Darstellung von over-exposed types
 */
function formatCompactOverExposed(overExposed, config) {
  let report = `### 🔓 Over-Exposed Types (${overExposed.length})\n\n`;
  
  // Gruppiere nach Type (class, interface, record)
  const byType = {};
  overExposed.forEach(item => {
    if (!byType[item.type]) byType[item.type] = [];
    byType[item.type].push(item);
  });
  
  for (const [type, items] of Object.entries(byType)) {
    report += `**${type}** (${items.length}): `;
    
    const showCount = Math.min(items.length, config.maxFilesListed);
    const names = items.slice(0, showCount).map(i => i.name).join(', ');
    report += names;
    
    if (items.length > showCount) {
      report += `, ...+${items.length - showCount} more`;
    }
    report += `\n`;
  }
  
  report += `\n💡 Consider making these \`internal\` unless they're part of public API.\n\n`;
  
  return report;
}

/**
 * DETAILED: Einzelne Auflistung
 */
function formatDetailedOverExposed(overExposed, config) {
  let report = `### 🔓 Potentially Over-Exposed Types (${overExposed.length})\n\n`;
  report += `These types are public but might be implementation details:\n\n`;
  
  const byFile = {};
  overExposed.forEach(item => {
    if (!byFile[item.file]) byFile[item.file] = [];
    byFile[item.file].push(item);
  });
  
  const files = Object.keys(byFile).slice(0, config.maxFilesListed);
  files.forEach(file => {
    report += `**${file}:**\n`;
    byFile[file].forEach(item => {
      report += `- \`${item.type} ${item.name}\` → Consider making internal\n`;
    });
    report += '\n';
  });
  
  if (overExposed.length > config.maxFilesListed) {
    report += `_... and ${overExposed.length - config.maxFilesListed} more types_\n\n`;
  }
  
  return report;
}

/**
 * Kurze Empfehlung
 */
function getCompactEncapsulationRecommendation(score, publicPercentage, overExposedCount) {
  if (publicPercentage > 40) {
    return `⚠️ HIGH: Reduce from ${publicPercentage}% → <30% (change ${overExposedCount} types to internal)\n` +
           `Expected: Score ${score} → ${Math.min(5, score + 2)}\n`;
  } else if (publicPercentage > 30) {
    return `🟡 MEDIUM: Review ${overExposedCount} over-exposed types\n` +
           `Expected: Score ${score} → ${Math.min(5, score + 1)}\n`;
  } else {
    return `✅ Excellent! Keep defaulting to \`internal\` for new types.\n`;
  }
}