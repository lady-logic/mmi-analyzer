# MMI Architecture Analyzer

> Model Context Protocol (MCP) server for analyzing C# project architecture quality using the MMI (Modularity Maturity Index) framework by Carola Lilienthal.

## Overview

This MCP server provides automated analysis of .NET/C# projects to assess architecture quality across four critical dimensions from Carola Lilienthal's MMI framework:

- **Dimension 2: Layering** - Validates Clean Architecture layer dependencies
- **Dimension 5: Encapsulation** - Analyzes public vs internal type visibility  
- **Dimension 8: Abstraction Levels** - Detects mixing of business logic with technical details
- **Dimension 9: Circular Dependencies** - Identifies dependency cycles using Tarjan's algorithm

## Features

**Token-Optimized Reports**: Compact mode reduces token usage by 66%  
**Interactive Heatmap**: D3.js visualization with cycle detection  
**Incremental Analysis**: File-hash caching for 70% faster monitoring  
**Live Monitoring**: Real-time analysis with trend tracking  
**Cycle Detection**: Graph-based circular dependency analysis with visual highlighting

## Installation

### Prerequisites
- Node.js 18 or higher
- Cursor IDE

### Setup

1. Clone this repository:
```bash
git clone https://github.com/lady-logic/mmi-analyzer.git
cd mmi-analyzer
```

2. Install dependencies:
```bash
npm install
```

3. Configure in Cursor:

Add to your Cursor MCP settings (`~/.cursor/config.json` or via Settings → MCP):

```json
{
  "mcpServers": {
    "mmi-analyzer": {
      "command": "node",
      "args": ["C:/path/to/mmi-analyzer/src/server.js"]
    }
  }
}
```

**Note:** Use absolute paths. On Windows, use forward slashes.

4. Restart Cursor

## Usage

The MMI Analyzer provides seven tools accessible via Cursor's AI assistant:

### 1. Complete MMI Analysis
```
analyze_mmi(projectPath: "D:/Projects/MyApp")
analyze_mmi(projectPath: "D:/Projects/MyApp", mode: "detailed")  // Full report
```
Runs all four dimension analyses and provides an overall architecture quality score.

### 2. Interactive Architecture Heatmap
```
visualize_architecture(projectPath: "D:/Projects/MyApp")
```
Generates D3.js visualization showing:
- Files as nodes colored by quality score (green=excellent, red=critical)
- Dependencies as links (gray=normal, red=violations, pink=cycles)
- Animated pulsing for circular dependencies
- Interactive filtering by layer or cycles
- Click nodes to see detailed issues

### 3. Circular Dependency Analysis
```
analyze_cycles(projectPath: "D:/Projects/MyApp")
analyze_cycles(projectPath: "D:/Projects/MyApp", mode: "detailed")
```
Detects circular dependencies across the entire project:
- Uses graphlib's Tarjan algorithm for cycle detection
- Analyzes ALL C# dependencies (using statements)
- Severity classification:
  - 🔴 **CRITICAL**: Domain layer involved in cycle
  - 🟠 **HIGH**: 2-way circular dependency
  - 🟡 **MEDIUM**: 3-4 files in cycle
  - 🔵 **LOW**: 5+ files in cycle
- Shows complete cycle paths

### 4. Live Monitoring
```
start_monitoring(projectPath: "D:/Projects/MyApp")
get_monitoring_status()
stop_monitoring(projectPath: "D:/Projects/MyApp")
```
Watches `.cs` files and automatically analyzes changes with trend visualization.

### 5. Layering Analysis
```
analyze_layering(projectPath: "D:/Projects/MyApp")
```
Detects Clean Architecture violations (e.g., Domain depending on Infrastructure).

### 6. Encapsulation Analysis
```
analyze_encapsulation(projectPath: "D:/Projects/MyApp")
```
Identifies over-exposed types that should be internal.

### 7. Abstraction Level Analysis
```
analyze_abstraction(projectPath: "D:/Projects/MyApp")
```
Finds mixing of business logic with technical details (SQL, HTTP, File I/O).

## Report Modes

### Compact Mode (Default)
- Token-optimized output (~66% reduction)
- Grouped violations
- Concise recommendations
- Perfect for quick checks and monitoring

### Detailed Mode
- Full violation listings
- Code examples
- Comprehensive tables
- Ideal for documentation and deep analysis

## Example Output

```markdown
# Complete MMI Analysis Report

Overall MMI Score: 4.2/5 (Gut)

## MMI Scorecard
| Dimension              | Score | Level      | Status |
|------------------------|-------|------------|--------|
| Layering               | 5/5   | Exzellent  | ✅     |
| Encapsulation          | 4/5   | Gut        | ✅     |
| Abstraction Levels     | 3/5   | Akzeptabel | 🟡     |
| Circular Dependencies  | 5/5   | Exzellent  | ✅     |

## 🎯 Priority Actions
1. **Fix abstraction mixing** - Remove SQL queries from Domain layer
```

## Heatmap Visualization

The interactive heatmap provides real-time visual feedback:

**Color Coding:**
- 🟢 Green: Excellent (4.5-5.0)
- 🔵 Blue: Good (3.5-4.5)
- 🟠 Orange: Acceptable (2.5-3.5)
- 🔴 Red: Critical (<2.5)
- 🟣 Pink: Circular dependency

**Interactive Features:**
- Drag nodes to rearrange
- Zoom and pan
- Filter by layer or cycles
- Click nodes for detailed issues
- Animated pink pulsing links show cycles

## Architecture

```
mmi-analyzer/
├── src/
│   ├── server.js              # MCP server implementation
│   ├── config/
│   │   └── report-config.js   # Report mode configuration
│   ├── analyzers/
│   │   ├── layering.js        # Dimension 2: Layer dependencies
│   │   ├── encapsulation.js   # Dimension 5: Type visibility
│   │   ├── abstraction.js     # Dimension 8: Abstraction mixing
│   │   └── cycle-analyzer.js  # Dimension 9: Circular dependencies
│   ├── formatters/            # Report formatters (compact/detailed)
│   │   ├── cycle-formatter.js # Cycle-specific formatting
│   │   └── combined-formatter.js # 4D MMI reports
│   ├── monitoring/            # File watching & history
│   ├── visualizations/        # Heatmap generator with cycle viz
│   └── utils/
│       └── file-cache.js      # Hash-based caching
├── package.json
└── README.md
```

## Scoring System

**MMI Scores (0-5):**
- **5 - Exzellent**: State-of-the-art architecture
- **4 - Gut**: Strong architecture, minor improvements needed
- **3 - Akzeptabel**: Solid foundation, some refactoring recommended
- **2 - Verbesserungswürdig**: Significant technical debt
- **1 - Schlecht**: Major refactoring required
- **0 - Kritisch**: Architecture fundamentally broken

**Cycle Scoring:**
- 0 cycles = 5 points
- <1% files in cycles = 4 points
- <3% files in cycles = 3 points
- <5% files in cycles = 2 points
- <10% files in cycles = 1 point
- ≥10% files in cycles = 0 points

## Performance

- **Compact reports**: ~2,400 tokens (vs. 7,000 detailed)
- **Monitoring**: Only analyzes changed files (70% reduction)
- **Caching**: MD5 hash-based file tracking
- **Cycle detection**: O(V + E) using Tarjan's SCC algorithm
- **First analysis**: Full scan, subsequent: incremental

## Breaking Cycles

When circular dependencies are detected, the tool suggests resolution strategies:

1. **Dependency Inversion** - Introduce interfaces
2. **Event-Driven Architecture** - Use message bus (e.g., MassTransit)
3. **Extract Common Dependencies** - Create shared module
4. **Merge Components** - Combine artificially separated code
5. **Anti-Corruption Layer** - Add translation layer

## Troubleshooting

### Server not connecting
1. Check absolute paths in Cursor config
2. Verify Node.js version: `node --version` (needs 18+)
3. Check logs: `mmi-analyzer.log` in server directory

### No analysis results
- Ensure the project path contains `.cs` files
- Verify project follows folder structure (`Domain/`, `Application/`, `Infrastructure/`)

### Cache issues
- Delete `.mmi-cache.json` in project root to force full re-analysis

### Cycles not detected
- Ensure files have proper `namespace` declarations
- Check that `using` statements reference project namespaces
- Multiple files can share the same namespace (supported)

## Contributing

Contributions welcome! This is an experimental tool for learning MCP server development.

## License

MIT

## References

- **MMI Framework**: [Carola Lilienthal - Langlebige Softwarearchitekturen](https://www.dpunkt.de/buecher/13125/9783864906091-langlebige-software-architekturen.html)
- **MCP Protocol**: [Anthropic Model Context Protocol](https://modelcontextprotocol.io/)
- **Clean Architecture**: Robert C. Martin
- **Cycle Detection**: Tarjan's Strongly Connected Components algorithm

---

**Status**: Experimental | **Version**: 0.4.0 