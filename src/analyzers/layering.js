import fs from 'fs';
import path from 'path';

/**
 * Analyzes Clean Architecture layering violations
 * @param {string} projectPath - Path to the C# project
 * @returns {Object} Analysis results with violations and score
 */
export function analyzeLayering(projectPath) {
  const violations = [];
  const files = findCSharpFiles(projectPath);
  
  console.error(`[MMI] Analyzing ${files.length} files in ${projectPath}`);
  
  for (const file of files) {
    const relativePath = file.replace(projectPath, '');
    const content = fs.readFileSync(file, 'utf8');
    
    // Detect which layer this file belongs to
    const layer = detectLayer(relativePath);
    if (!layer) continue; // Skip files not in known layers
    
    // Extract using statements
    const usings = extractUsings(content);
    
    // Check for violations
    const fileViolations = checkViolations(layer, usings, relativePath);
    violations.push(...fileViolations);
  }
  
  // Calculate score (0-5)
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
      
      // Skip bin, obj, node_modules
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
 * Detect which layer a file belongs to
 */
function detectLayer(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  
  if (normalized.includes('/Domain/')) return 'Domain';
  if (normalized.includes('/Application/')) return 'Application';
  if (normalized.includes('/Infrastructure/')) return 'Infrastructure';
  if (normalized.includes('/Presentation/')) return 'Presentation';
  if (normalized.includes('/API/')) return 'API';
  if (normalized.includes('/Web/')) return 'Web';
  
  return null; // Not in a known layer
}

/**
 * Extract using statements from C# code
 */
function extractUsings(content) {
  const usings = [];
  const regex = /using\s+([\w\.]+);/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    const namespace = match[1];
    // Skip System namespaces
    if (!namespace.startsWith('System')) {
      usings.push(namespace);
    }
  }
  
  return usings;
}

/**
 * Check for layering violations
 */
function checkViolations(layer, usings, filePath) {
  const violations = [];
  const fileName = path.basename(filePath);
  
  // Define forbidden dependencies per layer
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

/**
 * Get severity of violation
 */
function getSeverity(fromLayer, toLayer) {
  // Domain → Infrastructure is CRITICAL
  if (fromLayer === 'Domain' && toLayer === 'Infrastructure') {
    return 'CRITICAL';
  }
  // Domain → Application is HIGH
  if (fromLayer === 'Domain' && toLayer === 'Application') {
    return 'HIGH';
  }
  // Application → Infrastructure is MEDIUM
  if (fromLayer === 'Application' && toLayer === 'Infrastructure') {
    return 'MEDIUM';
  }
  return 'LOW';
}

/**
 * Calculate MMI score (0-5)
 */
function calculateScore(violationCount, totalFiles) {
  if (totalFiles === 0) return 5;
  
  const violationRate = violationCount / totalFiles;
  
  if (violationCount === 0) return 5;
  if (violationRate < 0.02) return 4; // < 2% violations
  if (violationRate < 0.05) return 3; // < 5% violations
  if (violationRate < 0.10) return 2; // < 10% violations
  if (violationRate < 0.20) return 1; // < 20% violations
  return 0; // >= 20% violations
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