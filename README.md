# MMI Architecture Analyzer

> Model Context Protocol (MCP) server for analyzing C# project architecture quality using the MMI (Modularity Maturity Index) framework by Carola Lilienthal.

## Overview

This MCP server provides automated analysis of .NET/C# projects to assess architecture quality across three critical dimensions:

- **Dimension 2: Layering** - Validates Clean Architecture layer dependencies
- **Dimension 5: Encapsulation** - Analyzes public vs internal type visibility
- **Dimension 8: Abstraction Levels** - Detects mixing of business logic with technical details

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

The MMI Analyzer provides four tools accessible via Cursor's AI assistant:

### 1. Complete MMI Analysis
```
analyze_mmi(projectPath: "D:/Projects/MyApp")
```
Runs all three dimension analyses and provides an overall architecture quality score.

### 2. Layering Analysis
```
analyze_layering(projectPath: "D:/Projects/MyApp")
```
Detects Clean Architecture violations (e.g., Domain depending on Infrastructure).

### 3. Encapsulation Analysis
```
analyze_encapsulation(projectPath: "D:/Projects/MyApp")
```
Identifies over-exposed types that should be internal.

### 4. Abstraction Level Analysis
```
analyze_abstraction(projectPath: "D:/Projects/MyApp")
```
Finds mixing of business logic with technical details (SQL, HTTP, File I/O).

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
```

## Architecture

```
mmi-analyzer/
├── src/
│   ├── server.js              # MCP server implementation
│   └── analyzers/
│       ├── layering.js        # Dimension 2: Layer dependency analysis
│       ├── encapsulation.js   # Dimension 5: Visibility analysis
│       └── abstraction.js     # Dimension 8: Abstraction mixing detection
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

## Troubleshooting

### Server not connecting
1. Check absolute paths in Cursor config
2. Verify Node.js version: `node --version` (needs 18+)
3. Check logs: `mmi-analyzer.log` in server directory

### No analysis results
- Ensure the project path contains `.cs` files
- Verify project follows folder structure (`Domain/`, `Application/`, `Infrastructure/`)

## Contributing

Contributions welcome! This is an experimental tool for learning MCP server development.

## License

MIT

## References

- **MMI Framework**: [Carola Lilienthal - Sustainable Software Architecture](https://www.softwarearchitekt.de/)
- **MCP Protocol**: [Anthropic Model Context Protocol](https://modelcontextprotocol.io/)
- **Clean Architecture**: Robert C. Martin

---

**Status**: Experimental | **Version**: 0.1.0
