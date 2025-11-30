/**
 * Format layering analysis results as readable report
 */
export function formatLayeringReport(result) {
    const { projectPath, totalFiles, violations, violationCount, score, level } = result;
    
    let report = `# 📊 MMI Layering Analysis Report
  
  **Project:** ${projectPath}
  **Files Analyzed:** ${totalFiles}
  **Violations Found:** ${violationCount}
  **MMI Score:** ${score}/5 (${level})
  
  ---
  
  `;
  
    if (violationCount === 0) {
      report += `## ✅ Excellent! No layering violations found.
  
  Your architecture follows Clean Architecture principles perfectly!
  - Domain layer has no dependencies
  - Application layer only depends on Domain
  - Infrastructure is properly isolated
  
  **Keep up the good work!** 🎉
  `;
    } else {
      // Group violations by severity
      const critical = violations.filter(v => v.severity === 'CRITICAL');
      const high = violations.filter(v => v.severity === 'HIGH');
      const medium = violations.filter(v => v.severity === 'MEDIUM');
      const low = violations.filter(v => v.severity === 'LOW');
      
      report += `## ⚠️ Violations by Severity
  
  `;
  
      if (critical.length > 0) {
        report += `### 🔴 CRITICAL (${critical.length})
  Domain layer depends on Infrastructure - this breaks Clean Architecture fundamentals!
  
  `;
        critical.forEach(v => {
          report += `- **${v.file}**: Uses \`${v.using}\`\n`;
        });
        report += '\n';
      }
      
      if (high.length > 0) {
        report += `### 🟠 HIGH (${high.length})
  Domain layer depends on Application - domain should be independent!
  
  `;
        high.forEach(v => {
          report += `- **${v.file}**: Uses \`${v.using}\`\n`;
        });
        report += '\n';
      }
      
      if (medium.length > 0) {
        report += `### 🟡 MEDIUM (${medium.length})
  Application layer depends on Infrastructure - use dependency injection instead!
  
  `;
        medium.forEach(v => {
          report += `- **${v.file}**: Uses \`${v.using}\`\n`;
        });
        report += '\n';
      }
      
      if (low.length > 0) {
        report += `### 🔵 LOW (${low.length})
  
  `;
        low.forEach(v => {
          report += `- **${v.file}** (${v.layer}): Uses \`${v.using}\` from ${v.dependsOn}\n`;
        });
        report += '\n';
      }
      
      report += `---
  
  ## 💡 Recommendations
  
  `;
  
      if (critical.length > 0 || high.length > 0) {
        report += `**Priority 1 (Immediate):**
  - Move domain logic out of infrastructure dependencies
  - Use interfaces in Domain, implementations in Infrastructure
  - Apply Dependency Inversion Principle
  
  `;
      }
      
      if (medium.length > 0) {
        report += `**Priority 2 (This Sprint):**
  - Introduce interfaces in Application layer
  - Register implementations in Infrastructure via DI
  - Remove direct Infrastructure references from Application
  
  `;
      }
      
      report += `**Expected Impact:**
  - Refactoring these violations could improve MMI score to: ${Math.min(5, score + 2)}/5
  `;
    }
    
    report += `
  
  ---
  
  ## 📋 MMI Assessment
  
  **Current Level:** ${score}/5 (${level})
  
  | Score | Level | Meaning |
  |-------|-------|---------|
  | 5 | Exzellent | Perfect architecture |
  | 4 | Gut | Minor issues |
  | 3 | Akzeptabel | Some refactoring needed |
  | 2 | Verbesserungswürdig | Significant issues |
  | 1 | Schlecht | Major refactoring required |
  | 0 | Kritisch | Architecture broken |
  
  **Your project:** ${level} - ${getRecommendation(score)}
  `;
  
    return report;
  }
  
  function getRecommendation(score) {
    if (score >= 4) return "Great architecture! Keep maintaining it.";
    if (score === 3) return "Good foundation, address the violations this sprint.";
    if (score === 2) return "Plan a refactoring sprint to fix violations.";
    if (score === 1) return "Urgent: Architecture needs immediate attention.";
    return "Critical: Stop feature development, fix architecture first.";
  }