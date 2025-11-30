/**
 * Format encapsulation analysis results as readable report
 */
export function formatEncapsulationReport(result) {
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
    
    let report = `# 🔒 MMI Encapsulation Analysis Report
  
  **Project:** ${projectPath}
  **Files Analyzed:** ${totalFiles}
  **Total Types:** ${totalTypes}
  **Public Types:** ${publicTypes} (${publicPercentage}%)
  **MMI Score:** ${score}/5 (${level})
  
  ---
  
  ## 📊 Visibility Breakdown
  
  | Type | Public | Internal | Total |
  |------|--------|----------|-------|
  | Classes | ${stats.publicClasses} | ${stats.internalClasses} | ${stats.publicClasses + stats.internalClasses} |
  | Interfaces | ${stats.publicInterfaces} | ${stats.internalInterfaces} | ${stats.publicInterfaces + stats.internalInterfaces} |
  | Records | ${stats.publicRecords} | ${stats.internalRecords} | ${stats.publicRecords + stats.internalRecords} |
  | **Total** | **${publicTypes}** | **${totalTypes - publicTypes}** | **${totalTypes}** |
  
  **Public Percentage:** ${publicPercentage}%
  
  ---
  
  `;
  
    if (score >= 4) {
      report += `## ✅ Excellent Encapsulation!
  
  Your API surface is well-controlled with ${publicPercentage}% public types.
  This indicates good information hiding and implementation details properly encapsulated.
  
  `;
    } else {
      report += `## ⚠️ Encapsulation Issues Detected
  
  **${publicPercentage}%** of your types are public. Target: **< 30%**
  
  `;
    }
  
    if (overExposedCount > 0) {
      report += `### 🔓 Potentially Over-Exposed Types (${overExposedCount})
  
  These types are public but might be implementation details:
  
  `;
      
      const byFile = {};
      overExposed.forEach(item => {
        if (!byFile[item.file]) byFile[item.file] = [];
        byFile[item.file].push(item);
      });
      
      const files = Object.keys(byFile).slice(0, 20);
      files.forEach(file => {
        report += `**${file}:**\n`;
        byFile[file].forEach(item => {
          report += `- \`${item.type} ${item.name}\` → Consider making internal\n`;
        });
        report += '\n';
      });
      
      if (overExposedCount > 20) {
        report += `_... and ${overExposedCount - 20} more types_\n\n`;
      }
    } else {
      report += `### ✅ No Over-Exposed Types Detected
  
  All public types appear to be intentionally exposed (Controllers, DTOs, Contracts).
  
  `;
    }
  
    report += `---
  
  ## 💡 Recommendations
  
  `;
  
    if (publicPercentage > 40) {
      report += `**Priority: HIGH** 🔴
  
  Your API surface is too large (${publicPercentage}%). This makes:
  - Code harder to maintain (more surface area to support)
  - Breaking changes more likely
  - Implementation details exposed
  
  **Action Items:**
  1. Review all public classes outside API/Web layers
  2. Change implementation details to \`internal\`
  3. Use \`internal\` as default, \`public\` only when needed
  4. Extract public interfaces to separate Contracts folder
  
  **Expected Impact:** Could improve score to ${Math.min(5, score + 2)}/5
  
  `;
    } else if (publicPercentage > 30) {
      report += `**Priority: MEDIUM** 🟡
  
  Your encapsulation is acceptable but could be improved.
  
  **Action Items:**
  1. Review the ${overExposedCount} potentially over-exposed types
  2. Make implementation details \`internal\`
  3. Document why remaining public types need to be public
  
  **Expected Impact:** Could improve score to ${Math.min(5, score + 1)}/5
  
  `;
    } else {
      report += `**Keep up the good work!** ✅
  
  Your encapsulation is excellent. Continue to:
  - Default to \`internal\` for new types
  - Only make types \`public\` when they're part of the API contract
  - Regularly review public surface area
  
  `;
    }
  
    report += `---
  
  ## 📋 MMI Assessment
  
  **Current Level:** ${score}/5 (${level})
  
  | Public % | Score | Assessment |
  |----------|-------|------------|
  | < 20% | 5 | Excellent - Minimal API surface |
  | 20-30% | 4 | Good - Well-controlled |
  | 30-40% | 3 | Acceptable - Some over-exposure |
  | 40-50% | 2 | Poor - Too much exposed |
  | 50-60% | 1 | Bad - Needs refactoring |
  | > 60% | 0 | Critical - Everything is public |
  
  **Industry Best Practice:** Keep < 30% of types public
  
  `;
  
    return report;
  }