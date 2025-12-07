import fs from 'fs';
import path from 'path';
import { hasFileChanged } from '../utils/file-cache.js';

/**
 * Analyzes Clean Architecture layering violations
 * @param {string} projectPath - Path to the C# project
 * @param {boolean} useCache - Use file cache (default: true)
 */
export function analyzeLayering(projectPath, useCache = true) {
  const violations = [];
  const files = findCSharpFiles(projectPath);
  
  console.error(`[MMI] Analyzing ${files.length} files in ${projectPath}`);
  
  for (const file of files) {
    // Skip unchanged files
    if (useCache && !hasFileChanged(file)) {
      continue;
    }
    
    const relativePath = file.replace(projectPath, '');
    const content = fs.readFileSync(file, 'utf8');
    
    const layer = detectLayer(relativePath);
    if (!layer) continue;
    
    const usings = extractUsings(content);
    const fileViolations = checkViolations(layer, usings, relativePath);
    violations.push(...fileViolations);
  }
  
  const score = calculateScore(violations.length, files.length);
  
  return {
    projectPath,
    totalFiles: files.length,
    violations,
    violationCount: violations.length,
    score,
    level: getLevel(score)
  };
}

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

function detectLayer(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  
  if (normalized.includes('/Domain/')) return 'Domain';
  if (normalized.includes('/Application/')) return 'Application';
  if (normalized.includes('/Infrastructure/')) return 'Infrastructure';
  if (normalized.includes('/Presentation/')) return 'Presentation';
  if (normalized.includes('/API/')) return 'API';
  if (normalized.includes('/Web/')) return 'Web';
  
  return null;
}

function extractUsings(content) {
  const usings = [];
  const regex = /using\s+([\w\.]+);/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const namespace = match[1];
    if (!namespace.startsWith('System')) {
      usings.push(namespace);
    }
  }
  
  return usings;
}

function checkViolations(layer, usings, filePath) {
  const violations = [];
  const fileName = path.basename(filePath);
  
  const rules = {
    'Domain': ['Application', 'Infrastructure', 'Presentation', 'API', 'Web'],
    'Application': ['Infrastructure', 'Presentation', 'API', 'Web'],
    'Infrastructure': ['Presentation', 'API', 'Web']
  };
  
  const forbidden = rules[layer] || [];
  
  for (const using of usings) {
    for (const forbiddenLayer of forbidden) {
      if (using.includes(forbiddenLayer)) {
        violations.push({
          file: fileName,
          filePath: filePath,
          layer: layer,
          dependsOn: forbiddenLayer,
          using: using,
          severity: getSeverity(layer, forbiddenLayer)
        });
      }
    }
  }
  
  return violations;
}

function getSeverity(fromLayer, toLayer) {
  if (fromLayer === 'Domain' && toLayer === 'Infrastructure') {
    return 'CRITICAL';
  }
  if (fromLayer === 'Domain' && toLayer === 'Application') {
    return 'HIGH';
  }
  if (fromLayer === 'Application' && toLayer === 'Infrastructure') {
    return 'MEDIUM';
  }
  return 'LOW';
}

function calculateScore(violationCount, totalFiles) {
  if (totalFiles === 0) return 5;
  
  const violationRate = violationCount / totalFiles;
  
  if (violationCount === 0) return 5;
  if (violationRate < 0.02) return 4;
  if (violationRate < 0.05) return 3;
  if (violationRate < 0.10) return 2;
  if (violationRate < 0.20) return 1;
  return 0;
}

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