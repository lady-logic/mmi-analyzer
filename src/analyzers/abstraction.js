import fs from 'fs';
import path from 'path';
import { hasFileChanged } from '../utils/file-cache.js';
import { cleanCode } from '../utils/code-cleaner.js';

/**
 * Analyzes separation of abstraction levels
 * @param {string} projectPath - Path to the C# project
 * @param {boolean} useCache - Use file cache (default: true)
 */
export function analyzeAbstraction(projectPath, useCache = false) {
  const files = findCSharpFiles(projectPath);
  const mixedAbstractions = [];
  const codeExamples = [];
  
  console.error(`[MMI] Analyzing abstraction levels for ${files.length} files`);
  
  for (const file of files) {
    // Skip unchanged
    if (useCache && !hasFileChanged(file)) {
      continue;
    }
    
    const relativePath = file.replace(projectPath, '');
    const rawContent = fs.readFileSync(file, 'utf8');
    const content = cleanCode(rawContent);
    const fileName = path.basename(file);
    
    const issues = detectMixedAbstractions(content, fileName, relativePath);
    
    if (issues.length > 0) {
      mixedAbstractions.push(...issues);
      
      if (codeExamples.length < 5) {
        codeExamples.push({
          file: fileName,
          path: relativePath,
          issues: issues,
          snippet: extractRelevantSnippet(content, issues)
        });
      }
    }
  }
  
  const score = calculateScore(mixedAbstractions.length, files.length);
  
  return {
    projectPath,
    totalFiles: files.length,
    filesWithIssues: new Set(mixedAbstractions.map(m => m.file)).size,
    mixedAbstractions,
    issueCount: mixedAbstractions.length,
    codeExamples,
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
 * Detect mixed abstraction levels in code
 */
function detectMixedAbstractions(content, fileName, filePath) {
  const issues = [];
  
  // Detect layer
  const layer = detectLayer(filePath);
  
  // Check for business logic indicators
  const hasBusinessLogic = 
    /\b(Order|Product|Customer|Invoice|Payment|Account|User)\b/i.test(content) ||
    /\b(Calculate|Process|Validate|Create|Update|Delete)\b/i.test(content);
  
  if (!hasBusinessLogic) {
    return issues; // No business logic, skip
  }
  
  // Check for low-level technical details
  
  // SQL Details in business code
  if (/\b(SqlConnection|SqlCommand|SqlDataReader|ExecuteReader|ExecuteNonQuery|ExecuteScalar)\b/.test(content)) {
    issues.push({
      file: fileName,
      layer: layer,
      issue: 'SQL_MIXING',
      severity: layer === 'Domain' || layer === 'Application' ? 'CRITICAL' : 'MEDIUM',
      description: 'Business logic mixed with SQL implementation details',
      pattern: 'SqlConnection, SqlCommand, etc.'
    });
  }
  
  // Entity Framework details in Domain
  if (layer === 'Domain' && /\b(DbContext|DbSet|Include|ThenInclude|AsNoTracking)\b/.test(content)) {
    issues.push({
      file: fileName,
      layer: layer,
      issue: 'EF_IN_DOMAIN',
      severity: 'CRITICAL',
      description: 'Domain layer contains Entity Framework details',
      pattern: 'DbContext, DbSet, Include, etc.'
    });
  }
  
  // HTTP/REST details in business code
  if (/\b(HttpClient|HttpRequest|HttpResponse|RestClient|WebClient)\b/.test(content)) {
    issues.push({
      file: fileName,
      layer: layer,
      issue: 'HTTP_MIXING',
      severity: layer === 'Domain' || layer === 'Application' ? 'CRITICAL' : 'LOW',
      description: 'Business logic mixed with HTTP communication details',
      pattern: 'HttpClient, HttpRequest, etc.'
    });
  }
  
  // File I/O in business code
  if (/\b(File\.Read|File\.Write|StreamReader|StreamWriter|FileStream)\b/.test(content)) {
    issues.push({
      file: fileName,
      layer: layer,
      issue: 'FILE_IO_MIXING',
      severity: layer === 'Domain' ? 'HIGH' : 'MEDIUM',
      description: 'Business logic mixed with file I/O operations',
      pattern: 'File.Read, StreamReader, etc.'
    });
  }
  
  // Serialization in Domain
  if (layer === 'Domain' && /\b(JsonSerializer|XmlSerializer|JsonConvert)\b/.test(content)) {
    issues.push({
      file: fileName,
      layer: layer,
      issue: 'SERIALIZATION_IN_DOMAIN',
      severity: 'HIGH',
      description: 'Domain contains serialization logic',
      pattern: 'JsonSerializer, XmlSerializer, etc.'
    });
  }
  
  // Logging mixed with business logic (acceptable in some cases, but flag it)
  const logMatches = content.match(/\b(ILogger|_logger\.Log|Console\.WriteLine)\b/g);
  if (logMatches && logMatches.length > 5 && layer === 'Domain') {
    issues.push({
      file: fileName,
      layer: layer,
      issue: 'EXCESSIVE_LOGGING',
      severity: 'LOW',
      description: 'Excessive logging in domain logic',
      pattern: 'ILogger, Console.WriteLine (>5 occurrences)'
    });
  }
  
  return issues;
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
  
  return 'Unknown';
}

/**
 * Extract relevant code snippet showing the issue
 */
function extractRelevantSnippet(content, issues) {
  if (issues.length === 0) return '';
  
  const lines = content.split('\n');
  const snippetLines = Math.min(30, lines.length);
  
  return lines.slice(0, snippetLines).join('\n');
}

/**
 * Calculate MMI score
 */
function calculateScore(issueCount, totalFiles) {
  if (totalFiles === 0) return 5;
  
  const issueRate = issueCount / totalFiles;
  
  if (issueCount === 0) return 5; // Perfect
  if (issueRate < 0.05) return 4;  // < 5% files with issues
  if (issueRate < 0.10) return 3;  // < 10% files with issues
  if (issueRate < 0.20) return 2;  // < 20% files with issues
  if (issueRate < 0.30) return 1;  // < 30% files with issues
  return 0; // >= 30% files with issues
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