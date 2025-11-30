import fs from 'fs';
import path from 'path';

/**
 * Analyzes encapsulation quality (public vs internal visibility)
 * @param {string} projectPath - Path to the C# project
 * @returns {Object} Analysis results with visibility stats and score
 */
export function analyzeEncapsulation(projectPath) {
  const files = findCSharpFiles(projectPath);
  
  const stats = {
    publicClasses: 0,
    internalClasses: 0,
    publicInterfaces: 0,
    internalInterfaces: 0,
    publicRecords: 0,
    internalRecords: 0,
  };
  
  const overExposed = [];
  
  console.error(`[MMI] Analyzing encapsulation for ${files.length} files`);
  
  for (const file of files) {
    const relativePath = file.replace(projectPath, '');
    const content = fs.readFileSync(file, 'utf8');
    const fileName = path.basename(file);
    
    // Count visibility modifiers
    analyzeVisibility(content, stats);
    
    // Check for over-exposed types
    const exposed = checkOverExposure(content, fileName, relativePath);
    overExposed.push(...exposed);
  }
  
  // Calculate totals and percentages
  const totalTypes = stats.publicClasses + stats.internalClasses + 
                     stats.publicInterfaces + stats.internalInterfaces +
                     stats.publicRecords + stats.internalRecords;
  
  const publicTypes = stats.publicClasses + stats.publicInterfaces + stats.publicRecords;
  const publicPercentage = totalTypes > 0 ? ((publicTypes / totalTypes) * 100).toFixed(1) : 0;
  
  // Calculate score
  const score = calculateScore(parseFloat(publicPercentage));
  
  return {
    projectPath,
    totalFiles: files.length,
    totalTypes,
    stats,
    publicTypes,
    publicPercentage: parseFloat(publicPercentage),
    overExposed,
    overExposedCount: overExposed.length,
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
 * Analyze visibility modifiers in code
 */
function analyzeVisibility(content, stats) {
  // Match public/internal classes/interfaces/records
  const publicClassMatches = content.match(/public\s+(class|sealed\s+class)\s+\w+/g) || [];
  const internalClassMatches = content.match(/internal\s+(class|sealed\s+class)\s+\w+/g) || [];
  
  const publicInterfaceMatches = content.match(/public\s+interface\s+\w+/g) || [];
  const internalInterfaceMatches = content.match(/internal\s+interface\s+\w+/g) || [];
  
  const publicRecordMatches = content.match(/public\s+record\s+\w+/g) || [];
  const internalRecordMatches = content.match(/internal\s+record\s+\w+/g) || [];
  
  // Also count classes without explicit modifier (default is internal in C#)
  // But only if they're not nested
  const implicitInternalMatches = content.match(/^\s*(class|interface|record)\s+\w+/gm) || [];
  
  stats.publicClasses += publicClassMatches.length;
  stats.internalClasses += internalClassMatches.length + 
                          implicitInternalMatches.filter(m => m.includes('class')).length;
  
  stats.publicInterfaces += publicInterfaceMatches.length;
  stats.internalInterfaces += internalInterfaceMatches.length +
                             implicitInternalMatches.filter(m => m.includes('interface')).length;
  
  stats.publicRecords += publicRecordMatches.length;
  stats.internalRecords += internalRecordMatches.length +
                          implicitInternalMatches.filter(m => m.includes('record')).length;
}

/**
 * Check for over-exposed types (types that should be internal)
 */
function checkOverExposure(content, fileName, filePath) {
  const exposed = [];
  
  // Extract public types
  const publicTypeRegex = /public\s+(class|interface|record)\s+(\w+)/g;
  let match;
  
  while ((match = publicTypeRegex.exec(content)) !== null) {
    const typeKind = match[1];
    const typeName = match[2];
    
    // Skip if it's clearly meant to be public
    const shouldBePublic = 
      // API/Web/Presentation layer
      filePath.includes('/API/') || 
      filePath.includes('/Web/') || 
      filePath.includes('/Presentation/') ||
      // Controllers
      typeName.endsWith('Controller') ||
      // DTOs/Contracts
      typeName.endsWith('Dto') ||
      typeName.endsWith('Request') ||
      typeName.endsWith('Response') ||
      typeName.endsWith('Contract') ||
      filePath.includes('/Contracts/') ||
      filePath.includes('/DTOs/');
    
    if (!shouldBePublic) {
      // Likely over-exposed
      exposed.push({
        file: fileName,
        filePath: filePath,
        type: typeKind,
        name: typeName,
        suggestion: `Consider making '${typeName}' internal - it appears to be an implementation detail`
      });
    }
  }
  
  return exposed;
}

/**
 * Calculate MMI score based on public percentage
 */
function calculateScore(publicPercentage) {
  if (publicPercentage < 20) return 5; // Excellent
  if (publicPercentage < 30) return 4; // Good
  if (publicPercentage < 40) return 3; // Acceptable
  if (publicPercentage < 50) return 2; // Needs improvement
  if (publicPercentage < 60) return 1; // Poor
  return 0; // Critical
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