import graphlib from 'graphlib';
import fs from 'fs';
import path from 'path';
import { cleanCode } from '../utils/code-cleaner.js';

/**
 * Analyzes circular dependencies (cycles) in the project
 * @param {string} projectPath - Path to the C# project
 * @param {boolean} useCache - Use file cache (default: false)
 */
export function analyzeCycles(projectPath, useCache = false) {
  console.error(`[MMI] Analyzing cycles in ${projectPath}`);
  
  // Build graph from ALL dependencies
  const files = findCSharpFiles(projectPath);
  const graph = buildCompleteGraph(files, projectPath);
  
  // Find cycles using graphlib
  const cycles = graphlib.alg.findCycles(graph);
  
  console.error(`[MMI] Found ${cycles.length} cycles`);
  if (cycles.length > 0) {
    cycles.forEach((cycle, i) => {
      console.error(`[MMI]   Cycle ${i + 1}: ${cycle.join(' → ')} → ${cycle[0]}`);
    });
  }
  
  // Analyze cycles with layer info
  const cycleDetails = analyzeCycleDetails(cycles, files, projectPath);
  
  // Calculate score
  const score = calculateScore(cycles.length, files.length);
  
  return {
    projectPath,
    totalFiles: files.length,
    cycles: cycleDetails,
    cycleCount: cycles.length,
    filesInCycles: getUniqueFilesInCycles(cycles),
    filesInCyclesCount: getUniqueFilesInCycles(cycles).length,
    score,
    level: getLevel(score)
  };
}

/**
 * Build complete dependency graph from ALL using statements
 */
function buildCompleteGraph(files, projectPath) {
  const graph = new graphlib.Graph({ directed: true });
  
  // Map: namespace → Set<fileName>  
  const namespaceMap = new Map();
  
  console.error(`[MMI] Building namespace map from ${files.length} files...`);
  
  // First pass: Build namespace map (1:many!)
  for (const file of files) {
    const fileName = path.basename(file);
    const content = fs.readFileSync(file, 'utf8');
    const namespace = extractNamespace(content);
    
    if (namespace) {
      // Add to set (support multiple files per namespace)
      if (!namespaceMap.has(namespace)) {
        namespaceMap.set(namespace, new Set());
      }
      namespaceMap.get(namespace).add(fileName);
      
      graph.setNode(fileName); // Add all files as nodes
    }
  }
  
  console.error(`[MMI] Namespace map built: ${namespaceMap.size} namespaces`);
  for (const [ns, files] of namespaceMap.entries()) {
    console.error(`[MMI]   ${ns} → [${Array.from(files).join(', ')}]`);
  }
  
  // Second pass: Build edges from using statements
  for (const file of files) {
    const fileName = path.basename(file);
    const content = fs.readFileSync(file, 'utf8');
    const cleanedContent = cleanCode(content);
    
    // Get own namespace (to avoid self-dependencies)
    const ownNamespace = extractNamespace(content);
    
    // Extract ALL using statements
    const usings = extractUsings(cleanedContent);
    
    for (const usingNamespace of usings) {
      // Skip own namespace (files in same namespace don't create cycles via using)
      if (usingNamespace === ownNamespace) {
        continue;
      }
      
      // Check if this namespace belongs to files in our project
      if (namespaceMap.has(usingNamespace)) {
        const targetFileNames = namespaceMap.get(usingNamespace);
        
        // Add edges to ALL files in that namespace
        for (const targetFileName of targetFileNames) {
          // Avoid self-loops
          if (fileName !== targetFileName) {
            graph.setEdge(fileName, targetFileName);
            console.error(`[MMI]   ${fileName} → ${targetFileName} (${usingNamespace})`);
          }
        }
      }
    }
  }
  
  console.error(`[MMI] Graph built: ${graph.nodeCount()} nodes, ${graph.edgeCount()} edges`);
  return graph;
}

/**
 * Extract using statements from code
 */
function extractUsings(content) {
  const usings = [];
  const regex = /using\s+([\w\.]+);/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const namespace = match[1];
    // Skip System/Microsoft namespaces
    if (!namespace.startsWith('System') && 
        !namespace.startsWith('Microsoft')) {
      usings.push(namespace);
    }
  }
  
  return usings;
}

/**
 * Extract namespace from file
 */
function extractNamespace(content) {
  const match = content.match(/namespace\s+([\w\.]+)/);
  return match ? match[1] : null;
}

/**
 * Find all C# files recursively
 */
function findCSharpFiles(dir) {
  let results = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (item === 'bin' || item === 'obj' || item === 'node_modules') {
        continue;
      }
      
      if (stat.isDirectory()) {
        results = results.concat(findCSharpFiles(fullPath));
      } else if (item.endsWith('.cs')) {
        results.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`[MMI] Error reading directory ${dir}:`, err.message);
  }
  
  return results;
}

/**
 * Analyze cycle details
 */
function analyzeCycleDetails(cycles, files, projectPath) {
  return cycles.map((cycle, index) => {
    const severity = getCycleSeverity(cycle, files, projectPath);
    const layers = getLayersInCycle(cycle, files, projectPath);
    
    return {
      id: index + 1,
      path: cycle,
      length: cycle.length,
      severity,
      layers,
      description: describeCycle(cycle, layers, severity)
    };
  });
}

/**
 * Get severity of a cycle
 */
function getCycleSeverity(cycle, files, projectPath) {
  // Check if Domain is involved
  const hasDomain = cycle.some(fileName => {
    const file = files.find(f => path.basename(f) === fileName);
    if (!file) return false;
    
    const normalized = file.replace(/\\/g, '/');
    return normalized.includes('/Domain/');
  });
  
  if (hasDomain) return 'CRITICAL';
  
  // Check cycle length
  if (cycle.length <= 2) return 'HIGH';
  if (cycle.length <= 4) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get unique layers involved in a cycle
 */
function getLayersInCycle(cycle, files, projectPath) {
  const layers = new Set();
  
  cycle.forEach(fileName => {
    const file = files.find(f => path.basename(f) === fileName);
    if (!file) return;
    
    const normalized = file.replace(/\\/g, '/');
    
    if (normalized.includes('/Domain/')) layers.add('Domain');
    else if (normalized.includes('/Application/')) layers.add('Application');
    else if (normalized.includes('/Infrastructure/')) layers.add('Infrastructure');
    else if (normalized.includes('/Presentation/')) layers.add('Presentation');
    else if (normalized.includes('/API/')) layers.add('API');
    else if (normalized.includes('/Web/')) layers.add('Web');
  });
  
  return Array.from(layers);
}

/**
 * Describe a cycle in human-readable form
 */
function describeCycle(cycle, layers, severity) {
  if (layers.includes('Domain')) {
    return `Domain layer involved in circular dependency`;
  }
  
  if (cycle.length === 2) {
    return `Direct circular dependency between two files`;
  }
  
  return `${cycle.length}-way circular dependency across ${layers.join(', ')}`;
}

/**
 * Get unique files that are part of any cycle
 */
function getUniqueFilesInCycles(cycles) {
  const files = new Set();
  cycles.forEach(cycle => {
    cycle.forEach(file => files.add(file));
  });
  return Array.from(files);
}

/**
 * Calculate MMI score for cycles
 */
function calculateScore(cycleCount, totalFiles) {
  if (totalFiles === 0) return 5;
  
  const cycleRate = cycleCount / totalFiles;
  
  if (cycleCount === 0) return 5; // Perfect - no cycles
  if (cycleRate < 0.01) return 4;  // < 1% files in cycles
  if (cycleRate < 0.03) return 3;  // < 3% files in cycles
  if (cycleRate < 0.05) return 2;  // < 5% files in cycles
  if (cycleRate < 0.10) return 1;  // < 10% files in cycles
  return 0; // >= 10% files in cycles - critical
}

/**
 * Get MMI level description
 */
function getLevel(score) {
  const levels = {
    5: 'Exzellent',
    4: 'Gut',
    3: 'Akzeptabel',
    2: 'Verbesserungswürdig',
    1: 'Schlecht',
    0: 'Kritisch'
  };
  return levels[score] || 'Unbekannt';
}