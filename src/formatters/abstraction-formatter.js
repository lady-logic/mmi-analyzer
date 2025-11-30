/**
 * Format abstraction analysis results as readable report
 */
export function formatAbstractionReport(result) {
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
    
    let report = `# 🎯 MMI Abstraction Levels Analysis Report
  
  **Project:** ${projectPath}
  **Files Analyzed:** ${totalFiles}
  **Files with Issues:** ${filesWithIssues}
  **Total Issues:** ${issueCount}
  **MMI Score:** ${score}/5 (${level})
  
  ---
  
  `;
  
    if (issueCount === 0) {
      report += `## ✅ Excellent Separation of Concerns!
  
  No mixing of abstraction levels detected.
  - Business logic is pure and focused
  - Technical details are properly isolated
  - Clean separation between layers
  
  **Keep up the excellent architecture!** 🎉
  
  `;
    } else {
      const critical = mixedAbstractions.filter(m => m.severity === 'CRITICAL');
      const high = mixedAbstractions.filter(m => m.severity === 'HIGH');
      const medium = mixedAbstractions.filter(m => m.severity === 'MEDIUM');
      const low = mixedAbstractions.filter(m => m.severity === 'LOW');
      
      report += `## ⚠️ Mixed Abstraction Levels Detected
  
  `;
  
      if (critical.length > 0) {
        report += `### 🔴 CRITICAL Issues (${critical.length})
  
  Business logic mixed with infrastructure details - violates Clean Architecture!
  
  `;
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
        report += `### 🟠 HIGH Priority (${high.length})
  
  `;
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
        report += `### 🟡 MEDIUM Priority (${medium.length})
  
  `;
        const mediumByType = groupBy(medium, 'issue');
        Object.entries(mediumByType).forEach(([type, items]) => {
          report += `**${formatIssueType(type)}**: ${items.length} files\n`;
        });
        report += '\n';
      }
      
      if (low.length > 0) {
        report += `### 🔵 LOW Priority (${low.length})
  
  Minor issues that could be improved but aren't critical.
  
  `;
      }
      
      if (codeExamples.length > 0) {
        report += `---
  
  ## 📝 Code Examples
  
  `;
        codeExamples.slice(0, 2).forEach(example => {
          report += `### ${example.file}
  
  **Issues:** ${example.issues.map(i => formatIssueType(i.issue)).join(', ')}
  
  \`\`\`csharp
  ${example.snippet}
  ... (truncated)
  \`\`\`
  
  `;
        });
      }
    }
    
    report += `---
  
  ## 💡 Recommendations
  
  `;
  
    if (critical.length > 0) {
      report += `**Priority 1: CRITICAL** 🔴
  
  1. **Extract Infrastructure Logic**
     - Move SQL/EF details to Infrastructure layer
     - Create repository interfaces in Domain
     - Implement repositories in Infrastructure
  
  2. **Apply Dependency Inversion**
     - Domain/Application should depend on abstractions only
     - Infrastructure implements those abstractions
  
  3. **Refactor Examples:**
     \`\`\`csharp
     // ❌ BEFORE (Domain with SQL)
     public class OrderService {
         public void PlaceOrder() {
             var conn = new SqlConnection("...");
             // SQL logic
         }
     }
     
     // ✅ AFTER (Clean separation)
     public class OrderService {
         private readonly IOrderRepository _repo;
         public void PlaceOrder(Order order) {
             _repo.Save(order); // Pure business logic
         }
     }
     \`\`\`
  
  **Expected Impact:** Score ${score} → ${Math.min(5, score + 2)}
  
  `;
    } else if (high.length > 0 || medium.length > 0) {
      report += `**Priority 2: Improvement Opportunities** 🟡
  
  1. Reduce coupling to technical details
  2. Use abstractions (interfaces) for external dependencies
  3. Keep business logic pure and testable
  
  **Expected Impact:** Score ${score} → ${Math.min(5, score + 1)}
  
  `;
    } else {
      report += `**Excellent!** Your abstraction levels are well-separated. ✅
  
  Continue to:
  - Keep business logic pure
  - Use dependency injection for technical concerns
  - Maintain clear layer boundaries
  
  `;
    }
    
    report += `---
  
  ## 📋 MMI Assessment
  
  **Current Level:** ${score}/5 (${level})
  
  | Score | Level | Description |
  |-------|-------|-------------|
  | 5 | Exzellent | Perfect separation |
  | 4 | Gut | Minor mixing |
  | 3 | Akzeptabel | Some refactoring needed |
  | 2 | Verbesserungswürdig | Significant mixing |
  | 1 | Schlecht | Major issues |
  | 0 | Kritisch | No separation |
  
  `;
  
    return report;
  }
  
  function groupBy(array, key) {
    return array.reduce((result, item) => {
      (result[item[key]] = result[item[key]] || []).push(item);
      return result;
    }, {});
  }
  
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