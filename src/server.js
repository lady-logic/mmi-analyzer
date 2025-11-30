#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

// Tools
import { 
  handleLayeringAnalysis,
  handleEncapsulationAnalysis,
  handleAbstractionAnalysis,
  handleMMIAnalysis
} from './tools/analysis-tools.js';

import {
  handleStartMonitoring,
  handleStopMonitoring,
  handleMonitoringStatus
} from './tools/monitoring-tools.js';

// Utils
import { logStartup } from './utils/logging.js';
import * as fileWatcher from './monitoring/file-watcher.js';

// Create MCP Server
const server = new Server(
  {
    name: "mmi-analyzer",
    version: "0.2.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions
const TOOLS = [
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
];

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Route tool calls to handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "analyze_layering":
      return handleLayeringAnalysis(args);
      
    case "analyze_encapsulation":
      return handleEncapsulationAnalysis(args);
      
    case "analyze_abstraction":
      return handleAbstractionAnalysis(args);
      
    case "analyze_mmi":
      return handleMMIAnalysis(args);
      
    case "start_monitoring":
      return handleStartMonitoring(args);
      
    case "stop_monitoring":
      return await handleStopMonitoring(args);
      
    case "get_monitoring_status":
      return handleMonitoringStatus();
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logStartup();
}

// Cleanup on shutdown
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

// Run
main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});