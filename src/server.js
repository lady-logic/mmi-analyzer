#!/usr/bin/env node

import * as fileWatcher from './monitoring/file-watcher.js';
import * as historyStorage from './monitoring/history-storage.js';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { analyzeLayering } from "./analyzers/layering.js";
import { analyzeEncapsulation } from "./analyzers/encapsulation.js";
import { analyzeAbstraction } from "./analyzers/abstraction.js";
import fs from 'fs';
import path from 'path';

// Create MCP Server
const server = new Server(
  {
    name: "mmi-analyzer",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "analyze_layering",
        description: "Analyzes Clean Architecture layering violations in a C# project. Checks if Domain/Application/Infrastructure layers follow dependency rules.",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the C# project directory (e.g., D:\\Projects\\MyApp)",
            },
          },
          required: ["projectPath"],
        },
      },
      {
        name: "analyze_encapsulation",
        description: "Analyzes encapsulation quality by checking public vs internal visibility of classes, interfaces, and records. Identifies over-exposed types that should be internal.",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the C# project directory",
            },
          },
          required: ["projectPath"],
        },
      },
      {
        name: "analyze_abstraction",
        description: "Analyzes separation of abstraction levels. Detects mixing of business logic (Domain/Application) with technical details (SQL, HTTP, File I/O). Identifies violations of clean separation.",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the C# project directory",
            },
          },
          required: ["projectPath"],
        },
      },
      {
        name: "analyze_mmi",
        description: "Complete MMI (Modularity Maturity Index) analysis. Runs all three dimensions: Layering (Dimension 2), Encapsulation (Dimension 5), and Abstraction Levels (Dimension 8). Provides overall architecture quality score.",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the C# project directory",
            },
          },
          required: ["projectPath"],
        },
      },
      {
        name: "start_monitoring",
        description: "Starts continuous MMI monitoring for a C# project. Watches .cs files and automatically analyzes on changes. Stores score history over time.",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the C# project directory",
            },
          },
          required: ["projectPath"],
        },
      },
      {
        name: "stop_monitoring",
        description: "Stops MMI monitoring for a project. Preserves history.",
        inputSchema: {
          type: "object",
          properties: {
            projectPath: {
              type: "string",
              description: "Path to the C# project directory",
            },
          },
          required: ["projectPath"],
        },
      },
      {
        name: "get_monitoring_status",
        description: "Shows status of all monitored projects with current scores and trends.",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_layering") {
    const projectPath = args.projectPath;
    
    // Log to file for debugging
    const logPath = path.join(process.cwd(), 'mmi-analyzer.log');
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Analyzing: ${projectPath}\n`);
    
    try {
      // Check if path exists
      if (!fs.existsSync(projectPath)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Path not found: ${projectPath}`,
                suggestion: "Please check if the path is correct and accessible."
              }, null, 2),
            },
          ],
        };
      }
      
      // Run the analysis
      const result = analyzeLayering(projectPath);
      
      // Format the result for Claude
      const report = formatReport(result);
      
      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
      
    } catch (error) {
      fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error.message,
              stack: error.stack
            }, null, 2),
          },
        ],
      };
    }
  }
  if (name === "analyze_encapsulation") {
    const projectPath = args.projectPath;
    
    // Log to file
    const logPath = path.join(process.cwd(), 'mmi-analyzer.log');
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Analyzing encapsulation: ${projectPath}\n`);
    
    try {
      // Check if path exists
      if (!fs.existsSync(projectPath)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Path not found: ${projectPath}`,
                suggestion: "Please check if the path is correct and accessible."
              }, null, 2),
            },
          ],
        };
      }
      
      // Run the analysis
      const result = analyzeEncapsulation(projectPath);
      
      // Format the result
      const report = formatEncapsulationReport(result);
      
      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
      
    } catch (error) {
      fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error.message,
              stack: error.stack
            }, null, 2),
          },
        ],
      };
    }
  }
  if (name === "analyze_abstraction") {
    const projectPath = args.projectPath;
    
    const logPath = path.join(process.cwd(), 'mmi-analyzer.log');
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Analyzing abstraction: ${projectPath}\n`);
    
    try {
      if (!fs.existsSync(projectPath)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Path not found: ${projectPath}`,
                suggestion: "Please check if the path is correct and accessible."
              }, null, 2),
            },
          ],
        };
      }
      
      const result = analyzeAbstraction(projectPath);
      const report = formatAbstractionReport(result);
      
      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
      
    } catch (error) {
      fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error.message,
              stack: error.stack
            }, null, 2),
          },
        ],
      };
    }
  }
  if (name === "analyze_mmi") {
    const projectPath = args.projectPath;
    
    const logPath = path.join(process.cwd(), 'mmi-analyzer.log');
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Full MMI Analysis: ${projectPath}\n`);
    
    try {
      if (!fs.existsSync(projectPath)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: `Path not found: ${projectPath}`,
                suggestion: "Please check if the path is correct and accessible."
              }, null, 2),
            },
          ],
        };
      }
      
      // Run all three analyses
      console.error('[MMI] Running complete MMI analysis...');
      const layering = analyzeLayering(projectPath);
      const encapsulation = analyzeEncapsulation(projectPath);
      const abstraction = analyzeAbstraction(projectPath);
      
      // Combine results
      const report = formatCombinedReport(layering, encapsulation, abstraction);
      
      return {
        content: [
          {
            type: "text",
            text: report,
          },
        ],
      };
      
    } catch (error) {
      fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: error.message,
              stack: error.stack
            }, null, 2),
          },
        ],
      };
    }
  }
  if (name === "start_monitoring") {
    const projectPath = args.projectPath;
    
    const logPath = path.join(process.cwd(), 'mmi-analyzer.log');
    fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Starting monitoring: ${projectPath}\n`);
    
    try {
      // Check if path exists
      if (!fs.existsSync(projectPath)) {
        return {
          content: [{
            type: "text",
            text: `❌ Path not found: ${projectPath}\n\nPlease check if the path is correct.`,
          }],
        };
      }
      
      // Check if already watching
      if (fileWatcher.isWatching(projectPath)) {
        const current = historyStorage.getCurrentScore(projectPath);
        return {
          content: [{
            type: "text",
            text: `⚠️ Already monitoring: ${projectPath}\n\nCurrent score: ${current?.overall.toFixed(1) || 'N/A'}/5\n\nUse \`stop_monitoring\` first if you want to restart.`,
          }],
        };
      }
      
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
        
        // Run full analysis (could optimize to only analyze changed files)
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
      
      if (started) {
        return {
          content: [{
            type: "text",
            text: `✅ **Monitoring Started**
  
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
  
  I'll automatically analyze your code whenever you save .cs files and track the trend!`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `❌ Failed to start monitoring for: ${projectPath}`,
          }],
        };
      }
      
    } catch (error) {
      fs.appendFileSync(logPath, `ERROR: ${error.message}\n${error.stack}\n`);
      
      return {
        content: [{
          type: "text",
          text: `❌ Error starting monitoring:\n\n${error.message}`,
        }],
      };
    }
  }
  
  if (name === "stop_monitoring") {
    const projectPath = args.projectPath;
    
    try {
      const stopped = await fileWatcher.stopWatching(projectPath);
      
      if (stopped) {
        const stats = historyStorage.getProjectStats(projectPath);
        
        return {
          content: [{
            type: "text",
            text: `✅ **Monitoring Stopped**
  
  **Project:** ${path.basename(projectPath)}
  **Duration:** ${stats?.duration || 'N/A'}
  **Measurements:** ${stats?.measurementCount || 0}
  **Final Score:** ${stats?.currentScore.toFixed(1) || 'N/A'}/5
  
  History has been preserved. Use \`get_monitoring_status\` to see trends.`,
          }],
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `⚠️ Project not being monitored: ${projectPath}`,
          }],
        };
      }
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error stopping monitoring:\n\n${error.message}`,
        }],
      };
    }
  }
  
  if (name === "get_monitoring_status") {
    try {
      const watchedProjects = fileWatcher.getWatchedProjects();
      const monitoredProjects = historyStorage.getMonitoredProjects();
      
      if (monitoredProjects.length === 0) {
        return {
          content: [{
            type: "text",
            text: `ℹ️ **No Monitored Projects**
  
  No projects are currently being monitored.
  
  Use \`start_monitoring\` to begin tracking a project's architecture quality over time.`,
          }],
        };
      }
      
      // Build status report
      let report = `# 📊 MMI Monitoring Status\n\n`;
      
      // Active monitoring
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
      
      // Inactive (history only)
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
      
      return {
        content: [{
          type: "text",
          text: report,
        }],
      };
      
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error getting status:\n\n${error.message}`,
        }],
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

/**
 * Format analysis result as readable report
 */
function formatReport(result) {
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

/**
 * Format encapsulation analysis result
 */
function formatEncapsulationReport(result) {
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

  // Score interpretation
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

  // Over-exposed types
  if (overExposedCount > 0) {
    report += `### 🔓 Potentially Over-Exposed Types (${overExposedCount})

These types are public but might be implementation details:

`;
    
    // Group by file
    const byFile = {};
    overExposed.forEach(item => {
      if (!byFile[item.file]) byFile[item.file] = [];
      byFile[item.file].push(item);
    });
    
    // Show first 20
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

/**
 * Format abstraction analysis result
 */
function formatAbstractionReport(result) {
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
    // Group by severity
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
    
    // Code examples
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

/**
 * Format combined MMI report (all 3 dimensions)
 */
function formatCombinedReport(layering, encapsulation, abstraction) {
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
**Tool:** MMI Analyzer v0.1.0 (Carola Lilienthal Framework)

`;

  return report;
}

// Helper functions
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

/**
 * Get recommendation based on score
 */
function getRecommendation(score) {
  if (score >= 4) return "Great architecture! Keep maintaining it.";
  if (score === 3) return "Good foundation, address the violations this sprint.";
  if (score === 2) return "Plan a refactoring sprint to fix violations.";
  if (score === 1) return "Urgent: Architecture needs immediate attention.";
  return "Critical: Stop feature development, fix architecture first.";
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log startup to file
  const logPath = path.join(process.cwd(), 'mmi-analyzer.log');
  fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] MMI Analyzer started\n`);
}

main().catch((error) => {
  process.on('SIGINT', async () => {
    console.error('\n[MMI] Shutting down...');
    await fileWatcher.stopAll();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.error('\n[MMI] Shutting down...');
    await fileWatcher.stopAll();
    process.exit(0);
  });

  console.error("Server error:", error);
  process.exit(1);
});
